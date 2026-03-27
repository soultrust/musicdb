"""Fetch album overview text from Gemini and/or Wikipedia (shared logic for AlbumOverviewView)."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_AVAILABLE = True


@dataclass
class AlbumOverviewFetchOutcome:
    """Result of trying external overview sources before caching."""

    overview_text: str | None
    source: str | None
    gemini_error: str | None
    wikipedia_error: str | None


def fetch_album_overview_outcome(
    artist: str, album: str, *, use_gemini: bool = False
) -> AlbumOverviewFetchOutcome:
    """
    Try Gemini (optional) then Wikipedia. Returns text + source on success,
    or None values with per-source error strings for diagnostics.
    """
    overview_text = None
    source = None
    gemini_error = None
    wikipedia_error = None

    if use_gemini and GEMINI_AVAILABLE and getattr(settings, "GEMINI_API_KEY", None):
        try:
            overview_text = _fetch_from_gemini(artist, album)
            source = "gemini"
            logger.info("Successfully fetched overview from Gemini for '%s' by %s", album, artist)
        except Exception as e:
            gemini_error = f"{type(e).__name__}: {str(e)}"
            logger.warning("Gemini failed for '%s' by %s: %s", album, artist, gemini_error)

    if not overview_text:
        try:
            overview_text = _fetch_from_wikipedia(artist, album)
            source = "wikipedia"
            logger.info("Successfully fetched overview from Wikipedia for '%s' by %s", album, artist)
        except Exception as e:
            wikipedia_error = f"{type(e).__name__}: {str(e)}"
            logger.warning("Wikipedia failed for '%s' by %s: %s", album, artist, wikipedia_error)

    return AlbumOverviewFetchOutcome(
        overview_text=overview_text,
        source=source,
        gemini_error=gemini_error,
        wikipedia_error=wikipedia_error,
    )


def _fetch_from_gemini(artist: str, album: str) -> str:
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not configured")
    model_name = "gemini-2.0-flash"
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    prompt = f"""Write a critical overview of the album "{album}" by {artist}.

Include:
- A brief description of the album's style, genre, and key characteristics
- Notable tracks or highlights
- Critical reception and reviews
- Historical context and significance
- Any awards, chart performance, or cultural impact

Keep it informative, well-structured, and around 300-500 words. Write in a professional, critical music journalism style."""
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    response = requests.post(
        api_url, headers={"Content-Type": "application/json"}, json=payload, timeout=30
    )
    response.raise_for_status()
    data = response.json()
    if "candidates" in data and data["candidates"]:
        candidate = data["candidates"][0]
        parts = candidate.get("content", {}).get("parts") or []
        if parts and "text" in parts[0]:
            overview_text = parts[0]["text"].strip()
            if len(overview_text) < 50:
                raise RuntimeError("Gemini returned empty or too short response")
            return overview_text
    raise RuntimeError(f"Unexpected response format from Gemini API: {data}")


def _fetch_from_wikipedia(artist: str, album: str) -> str:
    base_url = "https://en.wikipedia.org/w/api.php"
    search_queries = [f"{album} ({artist} album)", f"{album} (album)", f"{album} {artist}", album]
    page_content = None
    last_error = None
    for query in search_queries:
        try:
            page_content = _search_wikipedia(base_url, query)
            if page_content:
                break
        except Exception as e:
            last_error = str(e)
            continue
    if not page_content:
        error_msg = f"No Wikipedia article found for '{album}' by {artist}"
        if last_error:
            error_msg += f" (last error: {last_error})"
        raise RuntimeError(error_msg)
    overview = _extract_album_overview(page_content)
    if not overview:
        raise RuntimeError("Wikipedia article found but no useful overview content extracted.")
    return overview


def _search_wikipedia(base_url: str, query: str) -> str | None:
    search_params = {"action": "query", "list": "search", "srsearch": query, "srlimit": 3, "format": "json"}
    search_response = requests.get(base_url, params=search_params, timeout=10)
    search_response.raise_for_status()
    search_results = search_response.json().get("query", {}).get("search", [])
    if not search_results:
        return None
    page_title = search_results[0]["title"]
    content_params = {
        "action": "query",
        "titles": page_title,
        "prop": "extracts",
        "exintro": False,
        "explaintext": True,
        "format": "json",
    }
    content_response = requests.get(base_url, params=content_params, timeout=10)
    content_response.raise_for_status()
    pages = content_response.json().get("query", {}).get("pages", {})
    for page_id, page_info in pages.items():
        if page_id == "-1":
            return None
        return page_info.get("extract", "")
    return None


def _extract_album_overview(content: str) -> str | None:
    if not content:
        return None
    sections_to_extract: list[str] = []
    intro_match = re.match(r"^(.*?)(?=\n==\s)", content, re.DOTALL)
    if intro_match:
        intro = intro_match.group(1).strip()
        if len(intro) > 50:
            sections_to_extract.append(f"Overview:\n{intro}")
    target_sections = [
        r"critical\s*reception",
        r"reception",
        r"legacy",
        r"influence",
        r"review",
        r"critical\s*response",
        r"acclaim",
    ]
    for section_pattern in target_sections:
        pattern = rf"==\s*({section_pattern})\s*==\s*\n(.*?)(?=\n==\s|\Z)"
        matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
        for header, body in matches:
            body = body.strip()
            if len(body) > 50:
                sections_to_extract.append(f"{header.strip().title()}:\n{body}")
    if not sections_to_extract:
        truncated = content[:1000].strip()
        if len(truncated) > 50:
            sections_to_extract.append(f"Overview:\n{truncated}...")
    if sections_to_extract:
        return "\n\n".join(sections_to_extract)
    return None
