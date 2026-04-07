import logging
from urllib.parse import urlparse

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response

from .. import musicbrainz_client as mb
from ..client import get_master, get_release

logger = logging.getLogger(__name__)


def _bad_request(message):
    return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)


def _validation_error_response(serializer):
    """DRF serializer errors for request bodies or query-style payloads."""
    return Response(
        {"error": "Invalid request", "errors": serializer.errors},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _upstream_error(service_name, status_code):
    return Response(
        {"error": f"{service_name} API returned {status_code}"},
        status=status.HTTP_502_BAD_GATEWAY,
    )


def _internal_error_response(message, exc):
    payload = {"error": f"{message}: {str(exc)}"}
    if settings.DEBUG:
        import traceback

        payload["traceback"] = traceback.format_exc()
    return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _format_duration_from_mb_length(length):
    """MusicBrainz JSON often exposes duration in milliseconds as int or string."""
    if length is None:
        return ""
    try:
        s = int(length) // 1000
    except (TypeError, ValueError):
        return ""
    return f"{s // 60}:{s % 60:02d}"


def _parse_optional_int(value):
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _validate_choice(value, allowed, field_name):
    if value in allowed:
        return None
    quoted = ", ".join(f"'{v}'" for v in allowed)
    return _bad_request(f"{field_name} must be {quoted}")


def _validate_required(value_map):
    missing = [name for name, value in value_map.items() if not value]
    if not missing:
        return None
    return _bad_request(f"Missing required: {', '.join(missing)}")


def _fetch_display_title_from_catalog(resource_type, resource_id):
    """Fetch 'Artist - Album' from configured catalog source for a release or master."""
    try:
        if resource_type == "release":
            resp = get_release(int(resource_id))
        elif resource_type == "master":
            resp = get_master(int(resource_id))
        else:
            return ""
        if resp.status_code != 200:
            return ""
        data = resp.json()
        artists = data.get("artists") or []
        album_title = (data.get("title") or "").strip()
        if artists and album_title:
            artist_str = ", ".join(a.get("name", "") for a in artists).strip()
            return f"{artist_str} - {album_title}"
        return album_title
    except Exception:
        return ""


def _fetch_display_title_from_discogs(resource_type, resource_id):
    """Backward-compatible alias; use _fetch_display_title_from_catalog going forward."""
    return _fetch_display_title_from_catalog(resource_type, resource_id)


def _normalize_mb_release(data):
    """Convert MusicBrainz release JSON to frontend-friendly shape (title, artists, year, tracklist, uri)."""
    title = (data.get("title") or "").strip()
    artist_credit = data.get("artist-credit") or []
    artists = []
    for a in artist_credit:
        artist_obj = a.get("artist") or {}
        name = (artist_obj.get("name") or a.get("name") or "").strip()
        aid = (artist_obj.get("id") or "").strip()
        entry = {"name": name}
        if aid:
            entry["id"] = aid
        artists.append(entry)
    date = (data.get("date") or "")[:4]
    mbid = data.get("id") or ""
    uri = f"https://musicbrainz.org/release/{mbid}" if mbid else ""
    tracklist = []
    for medium in data.get("media") or []:
        for track in medium.get("tracks") or []:
            rec = track.get("recording") or {}
            length = track.get("length") or rec.get("length")
            duration = _format_duration_from_mb_length(length)
            tracklist.append(
                {
                    "title": (rec.get("title") or track.get("title") or "").strip(),
                    "duration": duration,
                    "position": track.get("position") or str(len(tracklist) + 1),
                }
            )
    out = {
        "title": title,
        "artists": artists,
        "year": date,
        "tracklist": tracklist,
        "uri": uri,
        "country": (data.get("country") or "").strip() or None,
    }
    cover = mb.get_cover_art(mbid) if mbid else None
    if cover:
        out["thumb"] = cover.get("thumb")
        out["images"] = cover.get("images") or []
    return out


def _is_usable_artist_image_url(url):
    """
    True if the URL can be used as <img src>. MusicBrainz often links Wikimedia Commons
    *file description pages* (HTML), e.g. commons.wikimedia.org/wiki/File:....jpg — those
    are not direct image bytes. upload.wikimedia.org URLs are the real CDN files.
    """
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    if not url.lower().startswith(("http://", "https://")):
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    host = (parsed.netloc or "").lower()
    path = parsed.path or ""
    if host == "upload.wikimedia.org" or host.endswith(".upload.wikimedia.org"):
        return True
    # HTML wiki pages (not embeddable as image)
    if "/wiki/" in path and (
        host.endswith("commons.wikimedia.org")
        or host.endswith("wikipedia.org")
        or host.endswith("wikimedia.org")
        or host.endswith("wikidata.org")
    ):
        return False
    return True


def _extract_artist_image_url(data):
    for rel in data.get("relations") or []:
        if rel.get("type") == "image":
            resource = (rel.get("url") or {}).get("resource")
            if resource:
                raw = resource.strip()
                if raw and _is_usable_artist_image_url(raw):
                    return raw
    return ""


def _album_year_sort_key(row):
    y = row.get("year") or ""
    try:
        return int(y[:4])
    except (TypeError, ValueError):
        return -1


def _dedupe_releases_for_artist_albums(browse_data):
    """One entry per release group when present, else per release."""
    releases = browse_data.get("releases") or []
    by_key = {}
    order = []
    for rel in releases:
        rg = rel.get("release-group") or {}
        rg_id = rg.get("id")
        rel_id = rel.get("id")
        if not rel_id:
            continue
        key = rg_id or rel_id
        title = (rg.get("title") or rel.get("title") or "").strip() or rel_id
        date = (rel.get("date") or "")[:4]
        if key not in by_key:
            by_key[key] = {
                "id": rel_id,
                "title": title,
                "year": date if date else None,
            }
            order.append(key)
        else:
            cur = by_key[key]
            if date and (not cur["year"] or date < cur["year"]):
                cur["year"] = date
                cur["id"] = rel_id
    return [by_key[k] for k in order]


def build_artist_album_list_from_browse(browse_data):
    """
    Dedupe MB browse releases, sort by year (newest first).
    Metadata only — no Cover Art calls (keeps artist detail fast).
    """
    rows = _dedupe_releases_for_artist_albums(browse_data)
    rows.sort(key=_album_year_sort_key, reverse=True)
    max_albums = 100  # matches MusicBrainz browse limit per request
    out = []
    for row in rows[:max_albums]:
        out.append(
            {
                "id": row["id"],
                "title": row["title"],
                "year": row.get("year"),
            }
        )
    return out


def build_artist_album_list_from_release_groups(rg_data):
    """
    Build album list from MusicBrainz release-group browse (one entry per
    album concept).  Sorted newest-first.
    """
    rgs = rg_data.get("release-groups") or []
    rows = []
    for rg in rgs:
        rgid = rg.get("id")
        if not rgid:
            continue
        title = (rg.get("title") or "").strip() or rgid
        date = (rg.get("first-release-date") or "")[:4]
        rows.append({
            "id": rgid,
            "title": title,
            "year": date if date else None,
            "type": rg.get("primary-type") or None,
        })
    rows.sort(key=_album_year_sort_key, reverse=True)
    return rows


def _normalize_mb_artist(data, albums=None):
    """Artist detail: name, MusicBrainz link, optional image, optional album list."""
    name = (data.get("name") or "").strip()
    mbid = data.get("id") or ""
    uri = f"https://musicbrainz.org/artist/{mbid}" if mbid else ""
    image_url = _extract_artist_image_url(data)
    out = {
        "title": name,
        "artists": [],
        "uri": uri,
        "albums": albums or [],
    }
    if image_url:
        out["thumb"] = image_url
        out["images"] = [{"uri": image_url}]
    return out


def _normalize_mb_recording(data):
    """Convert MusicBrainz recording JSON to frontend-friendly shape."""
    title = (data.get("title") or "").strip()
    artist_credit = data.get("artist-credit") or []
    artists = [{"name": (a.get("artist", {}).get("name") or a.get("name") or "").strip()} for a in artist_credit]
    length = data.get("length")
    duration = _format_duration_from_mb_length(length)
    mbid = data.get("id") or ""
    uri = f"https://musicbrainz.org/recording/{mbid}" if mbid else ""
    return {"title": title, "artists": artists, "tracklist": [], "uri": uri, "duration": duration}
