import logging

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
    artists = [{"name": (a.get("artist", {}).get("name") or a.get("name") or "").strip()} for a in artist_credit]
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


def _normalize_mb_artist(data):
    """Convert MusicBrainz artist JSON to frontend-friendly shape."""
    name = (data.get("name") or "").strip()
    mbid = data.get("id") or ""
    uri = f"https://musicbrainz.org/artist/{mbid}" if mbid else ""
    disambiguation = (data.get("disambiguation") or "").strip()
    profile = f"({disambiguation})" if disambiguation else ""
    return {"title": name, "artists": [], "profile": profile, "uri": uri}


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
