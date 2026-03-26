import re

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AlbumOverview
from ..serializers import AlbumOverviewSerializer
from .common import logger

GEMINI_AVAILABLE = True


class AlbumOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        album = request.query_params.get("album", "").strip()
        artist = request.query_params.get("artist", "").strip()
        if not album or not artist:
            return Response(
                {"error": "Both 'album' and 'artist' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cached_overview = AlbumOverview.objects.filter(artist__iexact=artist, album__iexact=album).first()
        if cached_overview:
            serializer = AlbumOverviewSerializer(cached_overview)
            return Response({"source": "cache", "data": serializer.data})

        overview_text = None
        source = None
        gemini_error = None
        wikipedia_error = None
        USE_GEMINI = False

        if USE_GEMINI and GEMINI_AVAILABLE and getattr(settings, "GEMINI_API_KEY", None):
            try:
                overview_text = self._fetch_from_gemini(artist, album)
                source = "gemini"
                logger.info("Successfully fetched overview from Gemini for '%s' by %s", album, artist)
            except Exception as e:
                gemini_error = f"{type(e).__name__}: {str(e)}"
                logger.warning("Gemini failed for '%s' by %s: %s", album, artist, gemini_error)

        if not overview_text:
            try:
                overview_text = self._fetch_from_wikipedia(artist, album)
                source = "wikipedia"
                logger.info("Successfully fetched overview from Wikipedia for '%s' by %s", album, artist)
            except Exception as e:
                wikipedia_error = f"{type(e).__name__}: {str(e)}"
                logger.warning("Wikipedia failed for '%s' by %s: %s", album, artist, wikipedia_error)

        if not overview_text:
            err_detail = "Unable to fetch album overview."
            if gemini_error:
                err_detail += f" Gemini: {gemini_error[:200]}."
            if wikipedia_error:
                err_detail += f" Wikipedia: {wikipedia_error[:200]}."
            return Response({"error": err_detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        new_overview = AlbumOverview.objects.create(
            artist=artist, album=album, overview=overview_text, source=source
        )
        serializer = AlbumOverviewSerializer(new_overview)
        return Response({"source": source, "data": serializer.data})

    def _fetch_from_gemini(self, artist, album):
        api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not api_key:
            raise Exception("GEMINI_API_KEY not configured")
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
                    raise Exception("Gemini returned empty or too short response")
                return overview_text
        raise Exception(f"Unexpected response format from Gemini API: {data}")

    def _fetch_from_wikipedia(self, artist, album):
        base_url = "https://en.wikipedia.org/w/api.php"
        search_queries = [f"{album} ({artist} album)", f"{album} (album)", f"{album} {artist}", album]
        page_content = None
        last_error = None
        for query in search_queries:
            try:
                page_content = self._search_wikipedia(base_url, query)
                if page_content:
                    break
            except Exception as e:
                last_error = str(e)
                continue
        if not page_content:
            error_msg = f"No Wikipedia article found for '{album}' by {artist}"
            if last_error:
                error_msg += f" (last error: {last_error})"
            raise Exception(error_msg)
        overview = self._extract_album_overview(page_content, artist, album)
        if not overview:
            raise Exception("Wikipedia article found but no useful overview content extracted.")
        return overview

    def _search_wikipedia(self, base_url, query):
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

    def _extract_album_overview(self, content, artist, album):
        if not content:
            return None
        sections_to_extract = []
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
