"""
MusicBrainz API client for search and lookup.
User-Agent is required: https://musicbrainz.org/doc/MusicBrainz_API#Authentication
"""
import requests
from django.conf import settings

MUSICBRAINZ_API_BASE = "https://musicbrainz.org/ws/2"

# Map frontend search types to MusicBrainz entity names
SEARCH_TYPE_TO_ENTITY = {
    "artist": "artist",
    "album": "release",
    "song": "recording",
}


def _headers():
    """MusicBrainz requires a descriptive User-Agent (no token)."""
    user_agent = getattr(
        settings, "MUSICBRAINZ_USER_AGENT", "SoulTrustMusicDB/1.0 (https://github.com/soultrust)"
    )
    return {"User-Agent": user_agent}


def _lucene_quote(s):
    """Escape and quote a string for Lucene (backslash and double-quote)."""
    if not s:
        return '""'
    escaped = (s.strip().replace("\\", "\\\\").replace('"', '\\"'))
    return f'"{escaped}"'


def search(query, search_type="album", limit=20, offset=0, year=None, year_from=None, year_to=None, artist=None):
    """
    Search MusicBrainz. search_type: 'artist' | 'album' | 'song'.
    For album (release) only: year (single) or year_from/year_to (range), and optional artist filter.
    Returns (response, normalized_results).
    """
    entity = SEARCH_TYPE_TO_ENTITY.get(search_type, "release")
    q = query.strip()
    if entity == "release":
        if artist:
            a = artist.strip()
            if a:
                q = f"({q}) AND artist:{_lucene_quote(a)}"
        if year is not None or (year_from is not None and year_to is not None):
            try:
                if year is not None:
                    y = str(int(year))[:4]
                    if len(y) == 4:
                        q = f"({q}) AND date:[{y} TO {y}]"
                elif year_from is not None and year_to is not None:
                    yf = str(int(year_from))[:4]
                    yt = str(int(year_to))[:4]
                    if len(yf) == 4 and len(yt) == 4:
                        q = f"({q}) AND date:[{yf} TO {yt}]"
            except (ValueError, TypeError):
                pass
    url = f"{MUSICBRAINZ_API_BASE}/{entity}"
    params = {"query": q, "fmt": "json", "limit": min(limit, 100), "offset": offset}
    resp = requests.get(url, headers=_headers(), params=params, timeout=15)
    if resp.status_code != 200:
        return resp, []

    data = resp.json()
    # Response key is entity name: "artists", "releases", "recordings"
    if entity == "artist":
        items = data.get("artists") or []
    elif entity == "release":
        items = data.get("releases") or []
    else:
        items = data.get("recordings") or []

    results = []
    for it in items:
        if entity == "artist":
            title = it.get("name") or ""
            mb_id = it.get("id") or ""
        elif entity == "release":
            title = it.get("title") or ""
            artist_credit = it.get("artist-credit") or []
            if artist_credit:
                names = [a.get("artist", {}).get("name", "") or a.get("name", "") for a in artist_credit]
                artist_str = " ".join(n for n in names if n)
                if artist_str:
                    title = f"{artist_str} - {title}"
            mb_id = it.get("id") or ""
        else:
            title = it.get("title") or ""
            artist_credit = it.get("artist-credit") or []
            if artist_credit:
                names = [a.get("artist", {}).get("name", "") or a.get("name", "") for a in artist_credit]
                artist_str = " ".join(n for n in names if n)
                if artist_str:
                    title = f"{artist_str} - {title}"
            mb_id = it.get("id") or ""

        if mb_id:
            # Frontend type: artist, album, song (we store MB entity as release/recording)
            if entity == "release":
                frontend_type = "album"
            elif entity == "recording":
                frontend_type = "song"
            else:
                frontend_type = "artist"
            results.append({"type": frontend_type, "id": mb_id, "title": title or mb_id})

    return resp, results


def get_artist(mbid):
    """GET artist/{mbid} with URL relations (e.g. image link)."""
    url = f"{MUSICBRAINZ_API_BASE}/artist/{mbid}"
    return requests.get(
        url,
        headers=_headers(),
        params={"fmt": "json", "inc": "url-rels"},
        timeout=15,
    )


def browse_releases_by_artist(artist_mbid, limit=100):
    """Browse releases for an artist; include release-groups for deduping albums."""
    url = f"{MUSICBRAINZ_API_BASE}/release"
    return requests.get(
        url,
        headers=_headers(),
        params={
            "artist": artist_mbid,
            "fmt": "json",
            "limit": min(int(limit), 100),
            "inc": "release-groups",
        },
        timeout=30,
    )


def browse_release_groups_by_artist(artist_mbid, limit=100):
    """Browse release groups (albums/singles/EPs) for an artist — one entry per album concept."""
    url = f"{MUSICBRAINZ_API_BASE}/release-group"
    return requests.get(
        url,
        headers=_headers(),
        params={
            "artist": artist_mbid,
            "fmt": "json",
            "limit": min(int(limit), 100),
        },
        timeout=30,
    )


def get_release(mbid):
    """GET release/{mbid} with recordings and artist-credits for tracklist."""
    url = f"{MUSICBRAINZ_API_BASE}/release/{mbid}"
    return requests.get(
        url,
        headers=_headers(),
        params={"fmt": "json", "inc": "recordings+artist-credits"},
        timeout=15,
    )


def browse_releases_by_release_group(rg_mbid, limit=1):
    """Find releases belonging to a release group (pick the first one for tracklist)."""
    url = f"{MUSICBRAINZ_API_BASE}/release"
    return requests.get(
        url,
        headers=_headers(),
        params={
            "release-group": rg_mbid,
            "fmt": "json",
            "limit": min(int(limit), 100),
            "inc": "recordings+artist-credits",
        },
        timeout=15,
    )


def get_recording(mbid):
    """GET recording/{mbid} with artists."""
    url = f"{MUSICBRAINZ_API_BASE}/recording/{mbid}"
    return requests.get(
        url,
        headers=_headers(),
        params={"fmt": "json", "inc": "artists"},
        timeout=15,
    )


COVER_ART_ARCHIVE_BASE = "https://coverartarchive.org"


def get_cover_art(release_mbid):
    """
    Fetch cover art for a release from Cover Art Archive.
    Returns dict with 'thumb' (URL) and 'images' ([{uri}]) for frontend, or None on failure/404.
    """
    if not release_mbid:
        return None
    url = f"{COVER_ART_ARCHIVE_BASE}/release/{release_mbid}"
    try:
        resp = requests.get(url, headers=_headers(), timeout=10)
        if resp.status_code != 200:
            return None
        data = resp.json()
        images = data.get("images") or []
        # Prefer front cover; use first image as fallback
        front = next((img for img in images if img.get("front") or "Front" in (img.get("types") or [])), images[0] if images else None)
        if not front:
            return None
        # thumb: use 500px thumbnail if available, else main image
        thumb_url = (front.get("thumbnails") or {}).get("500") or front.get("image")
        image_url = front.get("image") or thumb_url
        if not thumb_url and not image_url:
            return None
        return {
            "thumb": thumb_url or image_url,
            "images": [{"uri": image_url or thumb_url}],
        }
    except Exception:
        return None
