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


def _normalize_title_for_match(title):
    """Canonicalize title variations: 'Part 1'/'Pt. 1'/'#1'/'Pt 1' all become '1' for comparison."""
    if not title:
        return ""
    s = (title or "").lower().strip()
    s = re.sub(r"\bpart\s+(\d+)\b", r"\1", s, flags=re.IGNORECASE)
    s = re.sub(r"\bpt\.?\s*(\d+)\b", r"\1", s, flags=re.IGNORECASE)
    s = re.sub(r"#(\d+)\b", r"\1", s)
    s = re.sub(r"\(\s*(\d+)\s*\)", r"\1", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _trailing_part_designation(title):
    """Extract trailing parenthetical that looks like a part (e.g. 'Pts. 1-5', 'Part 2'). Return None if none."""
    if not title:
        return None
    match = re.search(r"\s*\(([^)]+)\)\s*$", (title or "").strip())
    if not match:
        return None
    content = match.group(1).strip()
    if re.search(r"\b(?:pt\.?s?|part)\s*\d", content, re.IGNORECASE) or re.search(r"\d+\s*[-–]\s*\d+", content):
        return _normalize_title_for_match(content) or content.lower()
    return None


def _title_base_for_search(title):
    """Strip trailing part designation (Pt. 1, #1, Part 1, etc.) so search returns all part variants."""
    if not title:
        return (title or "").strip()
    s = (title or "").strip()
    # Trailing non-parenthetical: " Pt. 1", " #1", " Part 1"
    s = re.sub(r"\s+pt\.?\s*\d+\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+#\d+\s*$", "", s)
    s = re.sub(r"\s+part\s+\d+\s*$", "", s, flags=re.IGNORECASE)
    # Trailing parenthetical like " (Part 1)" or " (Pt. 1)"
    s = re.sub(r"\s*\(\s*(?:pt\.?s?|part)\s*\d+\s*\)\s*$", "", s, flags=re.IGNORECASE)
    return s.strip() or (title or "").strip()


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
    
    # Only strip Discogs disambiguation like " (2)" at the end, NOT part numbers like " (Pts. 1-5)"
    clean_query = re.sub(r"\s*\(\d+\)\s*$", "", query.strip()).strip()
    # Strip part designations (Pt. 1, #1, Part 1) so search returns all variants
    # e.g. "Secret Stair Pt. 1" → "Secret Stair" to find both "Pt. 1" and "#1" versions
    search_query_title = _title_base_for_search(clean_query)
    
    # Build search query: "track:name artist:artist" or just "track:name"
    search_query = f'track:"{search_query_title}"'
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
        
        discogs_title_norm = _normalize_title_for_match(discogs_title)
        spotify_title_norm = _normalize_title_for_match(track.get("name", ""))
        discogs_part = _trailing_part_designation(discogs_title)
        spotify_part = _trailing_part_designation(track.get("name", ""))
        # Exact title match gets high score
        if discogs_title_lower == spotify_title:
            score += 100
        # Normalized title match (e.g. "Part 1" vs "#1") - same song, different spelling
        elif discogs_title_norm and discogs_title_norm == spotify_title_norm:
            score += 95
        # Title contains or is contained (partial match) — but not when part designations differ (e.g. Pts. 1-5 vs Pts. 6-9)
        elif discogs_title_lower in spotify_title or spotify_title in discogs_title_lower:
            if discogs_part is not None and spotify_part is not None and discogs_part != spotify_part:
                pass
            else:
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
