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


# Roman numeral conversion for part matching (I=1 through X=10, plus common combinations)
_ROMAN_VALS = (
    ("ix", 9), ("iv", 4), ("vi", 6), ("vii", 7), ("viii", 8),
    ("iii", 3), ("ii", 2), ("i", 1), ("x", 10), ("v", 5),
)


def _roman_to_int(roman_str):
    """Convert a Roman numeral string to int (e.g. 'IV' -> 4, 'V' -> 5). Returns None if invalid."""
    if not roman_str:
        return None
    s = roman_str.strip().lower()
    if not s:
        return None
    n = 0
    i = 0
    while i < len(s):
        found = False
        for r, v in _ROMAN_VALS:
            if s[i:i + len(r)] == r:
                n += v
                i += len(r)
                found = True
                break
        if not found:
            return None
    return n if n > 0 else None


def _normalize_roman_range(text):
    """Replace Roman numeral range (e.g. 'I-V', 'Parts I-V') with digit range '1-5' for comparison."""
    if not text:
        return text
    # Match "I-V" or "Parts I-V" style range (Roman-Roman)
    def repl(m):
        a, b = _roman_to_int(m.group(1)), _roman_to_int(m.group(2))
        if a is not None and b is not None:
            return f"{a}-{b}"
        return m.group(0)
    text = re.sub(
        r"\b(?:parts?\s+)?([ivx]+)\s*[-–]\s*([ivx]+)\b",
        repl,
        text,
        flags=re.IGNORECASE,
    )
    # Standalone "Part I" / "Part IV" etc.
    def repl_one(m):
        a = _roman_to_int(m.group(1))
        return str(a) if a is not None else m.group(0)
    text = re.sub(r"\bparts?\s+([ivx]+)\b", repl_one, text, flags=re.IGNORECASE)
    return text


def _normalize_title_for_match(title):
    """Canonicalize title variations: 'Part 1'/'Pt. 1'/'#1'/'Parts I-V'/'Pts. 1-5' for comparison."""
    if not title:
        return ""
    s = (title or "").lower().strip()
    # Normalize dash variants so "-", "–", "—" behave the same
    s = s.replace("–", "-").replace("—", "-")
    s = _normalize_roman_range(s)
    s = re.sub(r"\bpart\s+(\d+)\b", r"\1", s, flags=re.IGNORECASE)
    s = re.sub(r"\bpt\.?\s*(\d+)\b", r"\1", s, flags=re.IGNORECASE)
    s = re.sub(r"\bpts\.?\s*(\d+)\s*[-–]\s*(\d+)\b", r"\1-\2", s, flags=re.IGNORECASE)
    s = re.sub(r"#(\d+)\b", r"\1", s)
    s = re.sub(r"\(\s*(\d+)\s*\)", r"\1", s)
    # Normalize parenthetical part designations only: "(Pts. 1-5)" -> "1-5", "(Parts I-V)" -> "1-5"
    def _norm_paren(m):
        inner = m.group(1)
        if re.search(r"pt\.?s?|parts?|\d+\s*[-–]\s*\d+|[ivx]+\s*[-–]\s*[ivx]+", inner, re.IGNORECASE):
            return _normalize_title_for_match(inner)
        return m.group(0)
    s = re.sub(r"\(\s*([^)]+)\s*\)", _norm_paren, s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _trailing_part_designation(title):
    """Extract trailing part designation (e.g. 'Pts. 1-5', 'Parts I-V', 'Pt. 1', '(1)'). Return normalized form or None."""
    if not title:
        return None
    t = (title or "").strip()
    # Parenthetical at end: "(Pts. 1-5)", "(Part 2)", "(1)", "(2)"
    match = re.search(r"\s*\(([^)]+)\)\s*$", t)
    if match:
        content = match.group(1).strip()
        if re.search(r"\b(?:pt\.?s?|part)s?\s*\d", content, re.IGNORECASE) or re.search(r"\d+\s*[-–]\s*\d+", content):
            return _normalize_title_for_match(content) or content.lower()
        if re.search(r"\b(?:parts?\s+)?[ivx]+\s*[-–]\s*[ivx]+\b", content, re.IGNORECASE):
            return _normalize_title_for_match(content)
        # Bare "(1)" or "(2)" or "(1-5)"
        m = re.match(r"^(\d+)\s*$", content)
        if m:
            return m.group(1)
        m = re.match(r"^(\d+)\s*[-–]\s*(\d+)\s*$", content)
        if m:
            return f"{m.group(1)}-{m.group(2)}"
    # Trailing ", Parts I-V" or ", Part IV" (no parens)
    match = re.search(r",?\s+parts?\s+([ivx]+)\s*[-–]\s*([ivx]+)\s*$", t, re.IGNORECASE)
    if match:
        a, b = _roman_to_int(match.group(1)), _roman_to_int(match.group(2))
        if a is not None and b is not None:
            return f"{a}-{b}"
    match = re.search(r",?\s+part\s+([ivx]+)\s*$", t, re.IGNORECASE)
    if match:
        a = _roman_to_int(match.group(1))
        return str(a) if a is not None else None
    # Trailing " Pt. 1", " #1", " Part 1", " Pts. 1-5" (no parens) — so Pt. 1 vs Pt. 2 can be rejected
    match = re.search(r"\s+pts\.?\s*(\d+)\s*[-–]\s*(\d+)\s*$", t, re.IGNORECASE)
    if match:
        return f"{match.group(1)}-{match.group(2)}"
    match = re.search(r"\s+pt\.?\s*(\d+)\s*$", t, re.IGNORECASE)
    if match:
        return match.group(1)
    match = re.search(r"\s+#(\d+)\s*$", t)
    if match:
        return match.group(1)
    match = re.search(r"\s+part\s+(\d+)\s*$", t, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def _title_base_for_search(title):
    """Strip trailing part designation (Pt. 1, #1, Part 1, Parts I-V, etc.) so search returns all part variants."""
    if not title:
        return (title or "").strip()
    s = (title or "").strip()
    # Trailing non-parenthetical: " Pt. 1", " #1", " Part 1"
    s = re.sub(r"\s+pt\.?\s*\d+\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+#\d+\s*$", "", s)
    s = re.sub(r"\s+part\s+\d+\s*$", "", s, flags=re.IGNORECASE)
    # Trailing ", Parts I-V" or ", Part IV" (Roman) so e.g. "Shine On..., Parts I-V" → "Shine On..." for search
    s = re.sub(r",?\s+parts?\s+[ivx]+\s*[-–]\s*[ivx]+\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r",?\s+part\s+[ivx]+\s*$", "", s, flags=re.IGNORECASE)
    # Trailing parenthetical like " (Part 1)" or " (Pt. 1)" or " (Pts. 1-5)"
    s = re.sub(r"\s*\(\s*(?:pt\.?s?|part)s?\s*\d(?:\s*[-–]\s*\d)?\s*\)\s*$", "", s, flags=re.IGNORECASE)
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
    if best_score < 30:
        return None
    # When numbers are involved, part designations must match (e.g. Pt. 1 must not match Pt. 2)
    if best_match:
        discogs_part = _trailing_part_designation(discogs_title)
        spotify_part = _trailing_part_designation(best_match.get("name", ""))
        if discogs_part is not None and spotify_part is not None and discogs_part != spotify_part:
            return None
    return best_match
