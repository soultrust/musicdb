"""
Spotify API client. Uses Client Credentials flow for search (no user login needed).
"""
import base64
import requests
from django.conf import settings
from django.core.cache import cache


def _get_access_token():
    """Get Spotify access token using Client Credentials flow (cached for 1 hour)."""
    cache_key = "spotify_access_token"
    token = cache.get(cache_key)
    if token:
        return token
    
    client_id = getattr(settings, "SPOTIFY_CLIENT_ID", None)
    client_secret = getattr(settings, "SPOTIFY_CLIENT_SECRET", None)
    
    if not client_id or not client_secret:
        raise ValueError("Spotify credentials not configured")
    
    # Base64 encode client_id:client_secret
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials"},
    )
    
    if response.status_code != 200:
        raise ValueError(f"Spotify token request failed: {response.status_code}")
    
    data = response.json()
    token = data["access_token"]
    expires_in = data.get("expires_in", 3600)
    
    # Cache token for slightly less than expires_in to be safe
    cache.set(cache_key, token, timeout=expires_in - 60)
    
    return token


def search_track(query, artist=None, limit=5):
    """
    Search Spotify for a track. Returns list of matching tracks.
    
    Args:
        query: Track name
        artist: Optional artist name to improve matching
        limit: Max results (default 5)
    
    Returns:
        List of track objects with: id, name, artists, uri, preview_url, etc.
    """
    access_token = _get_access_token()
    
    # Build search query: "track:name artist:artist" or just "track:name"
    search_query = f"track:{query}"
    if artist:
        search_query += f" artist:{artist}"
    
    response = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {access_token}"},
        params={
            "q": search_query,
            "type": "track",
            "limit": limit,
        },
    )
    
    if response.status_code != 200:
        raise ValueError(f"Spotify search failed: {response.status_code}")
    
    data = response.json()
    return data.get("tracks", {}).get("items", [])
