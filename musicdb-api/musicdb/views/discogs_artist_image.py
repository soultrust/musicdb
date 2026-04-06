"""
Discogs fallback for artist detail images (after MusicBrainz + Spotify).
Uses existing musicdb.client search/get_artist and optional MusicBrainz Discogs URL relation.
"""
import logging
import re

from spotify.client import _normalize_artist_name_for_exact_match

from ..client import get_artist, search
from .common import _is_usable_artist_image_url

logger = logging.getLogger(__name__)

_DISCOGS_ARTIST_IN_URL = re.compile(r"discogs\.com/artist/(\d+)", re.IGNORECASE)


def _extract_discogs_artist_id_from_mb(artist_data):
    """Parse Discogs artist numeric id from MusicBrainz url-rels (resource URL)."""
    for rel in artist_data.get("relations") or []:
        url_obj = rel.get("url") or {}
        resource = (url_obj.get("resource") or "").strip()
        if not resource:
            continue
        m = _DISCOGS_ARTIST_IN_URL.search(resource)
        if m:
            return m.group(1)
    return None


def _pick_best_discogs_image(images):
    """Prefer primary image; fall back to first usable uri."""
    if not images:
        return None
    for img in images:
        if isinstance(img, dict) and (img.get("type") or "").lower() == "primary":
            uri = (img.get("uri") or "").strip()
            if uri and _is_usable_artist_image_url(uri):
                return uri
    for img in images:
        if not isinstance(img, dict):
            continue
        uri = (img.get("uri") or "").strip()
        if uri and _is_usable_artist_image_url(uri):
            return uri
    return None


def _image_url_from_discogs_artist_response(resp):
    if resp.status_code != 200:
        return None
    try:
        data = resp.json()
    except (TypeError, ValueError):
        return None
    return _pick_best_discogs_image(data.get("images") or [])


def discogs_artist_image_url(musicbrainz_name, artist_data):
    """
    Return a direct image URL from Discogs for this artist, or None.

    Order: MusicBrainz-linked Discogs artist id (if present), else database search
    with exact name match (same normalization as Spotify fallback).
    """
    name = (musicbrainz_name or "").strip()
    if not name:
        return None

    data = artist_data or {}
    discogs_id = _extract_discogs_artist_id_from_mb(data)
    if discogs_id:
        try:
            resp = get_artist(discogs_id)
            url = _image_url_from_discogs_artist_response(resp)
            if url:
                return url
        except Exception as e:
            logger.debug("Discogs get_artist by MB link failed: %s", e)

    try:
        resp = search(name, per_page=10, page=1, resource_type="artist")
    except Exception as e:
        logger.debug("Discogs search failed: %s", e)
        return None

    if resp.status_code != 200:
        return None

    try:
        payload = resp.json()
    except (TypeError, ValueError):
        return None

    target = _normalize_artist_name_for_exact_match(name)
    for r in payload.get("results") or []:
        if (r.get("type") or "").lower() != "artist":
            continue
        title = (r.get("title") or "").strip()
        if _normalize_artist_name_for_exact_match(title) != target:
            continue
        rid = r.get("id")
        if rid is None:
            continue
        try:
            aresp = get_artist(rid)
            url = _image_url_from_discogs_artist_response(aresp)
            if url:
                return url
        except Exception as e:
            logger.debug("Discogs get_artist after search failed: %s", e)
            continue
    return None
