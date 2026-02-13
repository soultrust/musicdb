"""
Search and detail API views that return a Discogs-compatible JSON shape
so the frontend can keep using the same endpoints and response structure.
"""
import time
import requests
from django.http import JsonResponse
from django.views import View

from .client import (
    search_release_groups,
    search_recordings,
    browse_releases_by_recording,
    get_release_group,
    get_release,
    browse_releases_by_release_group,
    get_cover_art_url,
)


def _artist_credit_names(artist_credit):
    """Extract list of artist names from MusicBrainz artist-credit."""
    if not artist_credit:
        return []
    names = []
    for item in artist_credit:
        if isinstance(item, dict):
            names.append(item.get("artist", {}).get("name", ""))
        elif isinstance(item, str):
            names.append(item)
    return names


def _build_tracklist(release):
    """Build Discogs-style tracklist from MusicBrainz release (media -> tracks -> recording)."""
    tracks = []
    for medium in release.get("media", []):
        for track in medium.get("tracks", []):
            rec = track.get("recording") or {}
            length = rec.get("length")
            duration = f"{length // 60000}:{(length % 60000) // 1000:02d}" if length else ""
            tracks.append({
                "position": track.get("position") or str(len(tracks) + 1),
                "title": rec.get("title", ""),
                "duration": duration,
            })
    return tracks


def _detail_from_release(release, release_group_id=None):
    """Build Discogs-compatible detail dict from a MusicBrainz release and optional cover."""
    artist_credit = release.get("artist-credit") or []
    artists = [{"name": a.get("artist", {}).get("name", "")} for a in artist_credit if isinstance(a, dict)]
    date = release.get("date", "")
    year = date[:4] if date else None
    tracklist = _build_tracklist(release)

    # Label info
    label_infos = release.get("label-info") or []
    labels = [{"name": li.get("label", {}).get("name", ""), "catno": li.get("catalog-number") or ""} for li in label_infos]

    # Cover: try release first, then release-group
    thumb = get_cover_art_url(release["id"], "release")
    if not thumb and release_group_id:
        thumb = get_cover_art_url(release_group_id, "release-group")

    return {
        "title": release.get("title", ""),
        "artists": artists,
        "year": year,
        "country": release.get("country", ""),
        "tracklist": tracklist,
        "thumb": thumb,
        "uri": f"https://musicbrainz.org/release/{release['id']}",
        "labels": labels,
        "formats": [],  # MusicBrainz release has format in release-group; optional to add
        "genres": [],
        "styles": [],
    }


def _run_search(q, page, limit, offset):
    """Run MusicBrainz release-group search (albums only); returns (results_list, None) or (None, JsonResponse)."""
    groups, status = search_release_groups(q, limit=limit, offset=offset)
    if status != 200 or groups is None:
        return None, JsonResponse({"error": f"MusicBrainz API returned {status}"}, status=502)

    # Sort by relevance score (highest first), then by title match so "Seven" is on top for "emily king seven"
    q_lower = q.lower()
    q_words = set(q_lower.split())

    def _sort_key(rg):
        s = rg.get("score")
        try:
            score = int(s) if isinstance(s, str) else (s if isinstance(s, (int, float)) else 0)
        except (ValueError, TypeError):
            score = 0
        title = (rg.get("title") or "").lower()
        # Tiebreaker: prefer release group whose title contains more of the query words
        title_match = sum(1 for w in q_words if len(w) > 1 and w in title)
        return (score, title_match)

    groups = sorted(groups, key=_sort_key, reverse=True)

    # Build results (id = release-group MBID, type = "release", title)
    results = []
    for rg in groups:
        artist_names = _artist_credit_names(rg.get("artist-credit"))
        title = rg.get("title", "")
        if artist_names:
            title = " – ".join(artist_names) + " – " + title
        elif not title:
            title = "Unknown"
        primary = (rg.get("primary-type") or "").lower()
        if primary:
            title = f"{title} ({primary})"
        results.append({
            "id": rg.get("id"),
            "type": "release",
            "title": title,
        })

    # Best-effort: find the album that contains the song (e.g. "Down" for "emily king down") and put it at top
    try:
        recordings, rec_status = search_recordings(q, limit=3)
        if rec_status == 200 and recordings:
            rec = recordings[0]
            releases, rel_status = browse_releases_by_recording(rec.get("id"), limit=1)
            if rel_status == 200 and releases:
                release = releases[0]
                rg = release.get("release-group")
                if rg and rg.get("id"):
                    rg_id = rg["id"]
                    rec_title = rec.get("title", "")
                    artist_names = _artist_credit_names(rec.get("artist-credit"))
                    song_display = f"{rec_title} – {', '.join(artist_names)}" if artist_names else (rec_title or "Unknown")
                    # Move existing result with this rg to top, or add new at top
                    existing = next((r for r in results if r["id"] == rg_id), None)
                    if existing:
                        results.remove(existing)
                        results.insert(0, existing)
                    else:
                        results.insert(0, {"id": rg_id, "type": "release", "title": song_display})
    except (ConnectionResetError, OSError, requests.exceptions.ConnectionError, Exception):
        pass

    return (results, None)


class SearchAPIView(View):
    """GET /api/search/?q=...&page=1 — MusicBrainz release-group search (albums, EPs, singles)."""

    def get(self, request):
        try:
            q = request.GET.get("q", "").strip()
            if not q:
                return JsonResponse({"error": "Missing query parameter: q"}, status=400)
            page = max(1, int(request.GET.get("page", 1)))
            limit = 20
            offset = (page - 1) * limit

            results, err = _run_search(q, page, limit, offset)
            if err is not None:
                return err
            return JsonResponse({"results": results})
        except (ConnectionResetError, OSError, requests.exceptions.ConnectionError):
            time.sleep(3)  # back off before one retry
            try:
                results, err = _run_search(q, page, limit, offset)
                if err is not None:
                    return err
                return JsonResponse({"results": results})
            except (ConnectionResetError, OSError, requests.exceptions.ConnectionError):
                return JsonResponse(
                    {"error": "MusicBrainz connection was reset. Please try again in a moment."},
                    status=502,
                )
        except Exception as e:
            return JsonResponse(
                {"error": f"Search failed: {str(e)}"},
                status=500,
            )


class DetailAPIView(View):
    """GET /api/search/detail/?type=release&id=<mbid> — release or release-group by MBID, Discogs-like detail."""

    def get(self, request):
        try:
            resource_type = request.GET.get("type", "").strip().lower()
            resource_id = request.GET.get("id", "").strip()
            if not resource_type or not resource_id:
                return JsonResponse({"error": "Missing required parameters: type and id"}, status=400)
            if resource_type != "release":
                return JsonResponse({"error": "Only type=release is supported (MusicBrainz release or release-group MBID)."}, status=400)

            # MBID can be a release or a release-group. Try release first (full tracklist), then release-group.
            release_data, status = get_release(resource_id)
            if status == 200 and release_data:
                detail = _detail_from_release(release_data, release_group_id=None)
                return JsonResponse(detail)

            # Treat as release-group: get one release in the group
            rg_data, rg_status = get_release_group(resource_id)
            if rg_status != 200 or not rg_data:
                releases, br_status = browse_releases_by_release_group(resource_id, limit=1)
                if br_status != 200 or not releases:
                    return JsonResponse({"error": "Release or release-group not found."}, status=404)
                first_release_id = releases[0].get("id")
            else:
                releases = rg_data.get("releases") or []
                if not releases:
                    return JsonResponse({"error": "Release-group has no releases."}, status=404)
                first_release_id = releases[0].get("id")

            release_data, status = get_release(first_release_id)
            if status != 200 or not release_data:
                return JsonResponse({"error": f"MusicBrainz API returned {status}"}, status=502)
            detail = _detail_from_release(release_data, release_group_id=resource_id)
            return JsonResponse(detail)
        except Exception as e:
            return JsonResponse(
                {"error": f"Detail failed: {str(e)}"},
                status=500,
            )
