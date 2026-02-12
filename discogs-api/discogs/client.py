"""
Discogs API client. Start with get_api_root() to verify credentials.
"""
import requests

from django.conf import settings


def _headers():
    """Build request headers for Discogs API (User-Agent required, token optional)."""
    headers = {"User-Agent": settings.DISCOGS_USER_AGENT}
    if getattr(settings, "DISCOGS_TOKEN", None):
        headers["Authorization"] = f"Discogs token={settings.DISCOGS_TOKEN}"
    return headers


def get_api_root():
    """GET api.discogs.com/ — use to verify client and credentials work."""
    url = f"{settings.DISCOGS_API_BASE_URL.rstrip('/')}/"
    return requests.get(url, headers=_headers())


def search(q, per_page=20, page=1, resource_type=None):
    """GET /database/search — search releases, artists, labels. q is required."""
    url = f"{settings.DISCOGS_API_BASE_URL.rstrip('/')}/database/search"
    params = {"q": q, "per_page": per_page, "page": page}
    if resource_type is not None:
        params["type"] = resource_type
    return requests.get(url, headers=_headers(), params=params)
