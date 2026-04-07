import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

LASTFM_API_BASE = "https://ws.audioscrobbler.com/2.0/"


def get_artist_top_albums(artist_name: str, limit: int = 50) -> list[dict] | None:
    """
    Fetch top albums for *artist_name* from Last.fm, ranked by listener play count.

    Returns a list of dicts with keys: name, playcount, mbid (may be empty),
    listeners, image_url.  Returns None on any failure so callers can fall back.
    """
    api_key = getattr(settings, "LASTFM_API_KEY", "") or ""
    if not api_key:
        return None

    try:
        resp = requests.get(
            LASTFM_API_BASE,
            params={
                "method": "artist.getTopAlbums",
                "artist": artist_name,
                "api_key": api_key,
                "format": "json",
                "limit": limit,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            logger.warning("Last.fm artist.getTopAlbums returned %s", resp.status_code)
            return None

        data = resp.json()
        albums_raw = (data.get("topalbums") or {}).get("album") or []
        if not isinstance(albums_raw, list):
            return None

        albums = []
        for a in albums_raw:
            name = (a.get("name") or "").strip()
            if not name or name.lower() == "(null)":
                continue
            mbid = (a.get("mbid") or "").strip()
            playcount = int(a.get("playcount") or 0)
            listeners = int(a.get("listeners") or 0)
            images = a.get("image") or []
            image_url = ""
            for img in reversed(images):
                url = (img.get("#text") or "").strip()
                if url:
                    image_url = url
                    break
            albums.append({
                "name": name,
                "playcount": playcount,
                "listeners": listeners,
                "mbid": mbid,
                "image_url": image_url,
            })
        return albums
    except Exception:
        logger.exception("Last.fm artist.getTopAlbums failed for %r", artist_name)
        return None
