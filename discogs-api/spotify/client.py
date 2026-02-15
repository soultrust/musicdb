"""
Spotify API client. Uses Client Credentials flow for search (no user login needed).
"""
import base64
import requests
from django.conf import settings
from django.core.cache import cache
import re


def _normalize_artist(name):
    """Strip Discogs disambiguation suffix like ' (2)' or ' (3)' from artist name."""
    if not name:
        return ""
    return re.sub(r"\s*\(\d+\)\s*$", "", (name or "").strip())


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
    
    # Clean up track title - remove common suffixes that might not be in Spotify
    clean_query = re.sub(r'\s*\([^)]*\)\s*$', '', query).strip()
    
    # Build search query: "track:name artist:artist" or just "track:name"
    search_query = f'track:"{clean_query}"'
    if artist:
        clean_artist = _normalize_artist(artist)
        if clean_artist:
            search_query += f' artist:"{clean_artist}"'
    
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


def find_best_match(discogs_title, discogs_artists, spotify_results):
    """
    Find the best matching Spotify track from results.
    
    Args:
        discogs_title: Track title from Discogs
        discogs_artists: List of artist names from Discogs
        spotify_results: List of Spotify track objects
    
    Returns:
        Best matching Spotify track or None
    """
    if not spotify_results:
        return None
    
    # Normalize for comparison (strip Discogs disambiguation suffixes like " (2)")
    discogs_title_lower = discogs_title.lower().strip()
    discogs_artists_lower = [_normalize_artist(a).lower() for a in discogs_artists]
    
    # Score each result
    best_match = None
    best_score = 0
    
    for track in spotify_results:
        score = 0
        spotify_title = track.get("name", "").lower().strip()
        spotify_artists = [a.get("name", "").lower().strip() for a in track.get("artists", [])]
        
        # Exact title match gets high score
        if discogs_title_lower == spotify_title:
            score += 100
        # Title contains or is contained (partial match)
        elif discogs_title_lower in spotify_title or spotify_title in discogs_title_lower:
            score += 50
        
        # Artist matching - check if any Discogs artist matches any Spotify artist
        artist_matches = sum(1 for da in discogs_artists_lower for sa in spotify_artists if da == sa)
        if artist_matches > 0:
            score += 30 * artist_matches
        
        # Bonus if all artists match
        if set(discogs_artists_lower) == set(spotify_artists):
            score += 20
        
        if score > best_score:
            best_score = score
            best_match = track
    
    # Only return if score is above threshold (at least some match)
    if best_score >= 30:
        return best_match
    
    return None
