"""
MusicBrainz API client with rate limiting (1 request per second) and retries on connection errors.
No API key; User-Agent is required.
"""
import time
import requests
from django.conf import settings

MB_BASE = "https://musicbrainz.org/ws/2"
COVER_ART_BASE = "https://coverartarchive.org"
_MIN_INTERVAL = 1.2  # seconds between requests (slightly over 1 to avoid "connection reset by peer")
_LAST_REQUEST_TIME = [0.0]  # use list so we can mutate in closure

# Connection errors we retry (MusicBrainz sometimes resets under load)
_CONNECTION_ERRORS = (requests.exceptions.ConnectionError, ConnectionResetError, OSError)


def _headers():
    ua = getattr(settings, "MUSICBRAINZ_USER_AGENT", "") or "SoultrustMusicDB/1.0 (https://github.com/soultrust)"
    return {"User-Agent": ua, "Accept": "application/json"}


def _throttle():
    now = time.monotonic()
    elapsed = now - _LAST_REQUEST_TIME[0]
    if elapsed < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - elapsed)
    _LAST_REQUEST_TIME[0] = time.monotonic()


def _get(path, params=None, retries=2):
    """GET with throttle and retry on connection reset / connection error."""
    url = f"{MB_BASE.rstrip('/')}/{path.lstrip('/')}"
    last_error = None
    for attempt in range(retries + 1):
        _throttle()
        try:
            return requests.get(url, headers=_headers(), params=params or {}, timeout=20)
        except _CONNECTION_ERRORS as e:
            last_error = e
            if attempt < retries:
                time.sleep(2)  # backoff before retry
    if last_error is not None:
        raise last_error
    raise RuntimeError("Unexpected state in _get")


def search_release_groups(q, limit=20, offset=0):
    """Search release-groups (albums, EPs, etc.). Returns list of release-group dicts.
    By default MusicBrainz only searches the release-group title; we search both
    artist and title so e.g. 'emily king down' finds albums by Emily King (and title 'Down').
    """
    # Escape Lucene special chars in the user query so we don't break the query
    safe = _escape_lucene(q.strip())
    if not safe:
        return [], 200
    # Search both artist and release-group title so artist name matches (e.g. Emily King)
    query = f'artist:({safe}) OR releasegroup:({safe})'
    resp = _get("release-group", params={"query": query, "limit": limit, "offset": offset})
    if resp.status_code != 200:
        return None, resp.status_code
    data = resp.json()
    return data.get("release-groups", []), resp.status_code


def _escape_lucene(s):
    """Escape Lucene special characters so the query doesn't break (e.g. user types AC/DC)."""
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    for char in ("+", "-", "(", ")", "{", "}", "[", "]", "^", "~", "*", "?", ":", "/", "&", "|", "!"):
        s = s.replace(char, "\\" + char)
    return s


def search_recordings(q, limit=5):
    """Search recordings (songs/tracks). Returns list of recording dicts with id, title, artist-credit."""
    resp = _get("recording", params={"query": q, "limit": limit})
    if resp.status_code != 200:
        return None, resp.status_code
    data = resp.json()
    return data.get("recordings", []), resp.status_code


def browse_releases_by_recording(recording_mbid, limit=1):
    """Get releases that contain this recording. Returns list of release dicts (each has release-group)."""
    resp = _get("release", params={"recording": recording_mbid, "limit": limit})
    if resp.status_code != 200:
        return None, resp.status_code
    data = resp.json()
    return data.get("releases", []), resp.status_code


def get_release_group(rgid):
    """Get a release-group by MBID. Optional: include releases in response."""
    resp = _get(f"release-group/{rgid}", params={"inc": "releases"})
    if resp.status_code != 200:
        return None, resp.status_code
    return resp.json(), resp.status_code


def get_release(release_id, include_recordings=True):
    """Get a release by MBID with track list (mediums -> tracks -> recording titles)."""
    inc = "recordings+artist-credits" if include_recordings else "artist-credits"
    resp = _get(f"release/{release_id}", params={"inc": inc})
    if resp.status_code != 200:
        return None, resp.status_code
    return resp.json(), resp.status_code


def browse_releases_by_release_group(rgid, limit=1):
    """Get releases that belong to a release-group. Returns list of release dicts."""
    resp = _get("release", params={"release-group": rgid, "limit": limit})
    if resp.status_code != 200:
        return None, resp.status_code
    data = resp.json()
    return data.get("releases", []), resp.status_code


def get_cover_art_url(mbid, entity="release"):
    """
    Return front cover image URL for a release or release-group.
    entity: "release" or "release-group"
    Returns None if not available.
    """
    _throttle()
    url = f"{COVER_ART_BASE}/{entity}/{mbid}"
    try:
        r = requests.get(url, headers=_headers(), timeout=10)
        if r.status_code != 200:
            return None
        data = r.json()
        images = data.get("images", [])
        for img in images:
            if img.get("front"):
                return img.get("image")
        if images:
            return images[0].get("image")
    except Exception:
        pass
    return None
