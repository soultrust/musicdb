from django.conf import settings
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import AlbumOverview, ConsumedAlbum
from .serializers import AlbumOverviewSerializer
from .client import search, get_release, get_master, get_artist, get_label

class SearchAPIView(View):
    """GET /api/search/?q=...&page=1 — proxy to Discogs search, return JSON."""

    def get(self, request):
        q = request.GET.get("q", "").strip()
        if not q:
            return JsonResponse(
                {"error": "Missing query parameter: q"},
                status=400,
            )
        if not getattr(settings, "DISCOGS_USER_AGENT", None):
            return JsonResponse(
                {"error": "Discogs is not configured."},
                status=503,
            )
        page = max(1, int(request.GET.get("page", 1)))
        response = search(q=q, per_page=20, page=page)
        if response.status_code != 200:
            return JsonResponse(
                {"error": f"Discogs API returned {response.status_code}"},
                status=502,
            )
        return JsonResponse(response.json())


@method_decorator(csrf_exempt, name="dispatch")
class ConsumedAlbumView(APIView):
    """GET/PUT /api/search/consumed/?type=release&id=123 — get or set consumed status."""

    def get(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        if not resource_type or not resource_id:
            return Response(
                {"error": "Missing required parameters: type and id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if resource_type not in ("release", "master"):
            return Response(
                {"error": "type must be 'release' or 'master'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        record = ConsumedAlbum.objects.filter(type=resource_type, discogs_id=str(resource_id)).first()
        consumed = record.consumed if record else False
        return Response({"consumed": consumed})

    def _set_consumed(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        if not resource_type or not resource_id:
            return Response(
                {"error": "Missing required parameters: type and id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if resource_type not in ("release", "master"):
            return Response(
                {"error": "type must be 'release' or 'master'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            consumed = request.data.get("consumed", True)
            if not isinstance(consumed, bool):
                consumed = bool(consumed)
        except Exception:
            consumed = True
        record, _ = ConsumedAlbum.objects.update_or_create(
            type=resource_type,
            discogs_id=str(resource_id),
            defaults={"consumed": consumed},
        )
        return Response({"consumed": record.consumed})

    def put(self, request):
        return self._set_consumed(request)

    def post(self, request):
        return self._set_consumed(request)


class DetailAPIView(View):
    """GET /api/detail/?type=release&id=123 — get full details for a release/artist/label."""

    def get(self, request):
        resource_type = request.GET.get("type", "").strip().lower()
        resource_id = request.GET.get("id", "").strip()
        
        if not resource_type or not resource_id:
            return JsonResponse(
                {"error": "Missing required parameters: type and id"},
                status=400,
            )
        
        if not getattr(settings, "DISCOGS_USER_AGENT", None):
            return JsonResponse(
                {"error": "Discogs is not configured."},
                status=503,
            )
        
        try:
            resource_id = int(resource_id)
        except ValueError:
            return JsonResponse(
                {"error": "Invalid id parameter"},
                status=400,
            )
        
        if resource_type == "release":
            response = get_release(resource_id)
        elif resource_type == "master":
            response = get_master(resource_id)
        elif resource_type == "artist":
            response = get_artist(resource_id)
        elif resource_type == "label":
            response = get_label(resource_id)
        else:
            return JsonResponse(
                {"error": f"Invalid type: {resource_type}. Must be 'release', 'master', 'artist', or 'label'"},
                status=400,
            )
        
        if response.status_code != 200:
            return JsonResponse(
                {"error": f"Discogs API returned {response.status_code}"},
                status=502,
            )
        
        return JsonResponse(response.json())


import re
import logging
import requests
from django.conf import settings

# Configure logging
logger = logging.getLogger(__name__)


class AlbumOverviewView(APIView):
    """
    Fetches a critical overview of an album.

    Priority order:
    1. Check local PostgreSQL cache
    2. Try Google Gemini API
    3. Fall back to Wikipedia MediaWiki API
    4. Return a graceful error if all sources fail
    """

    def get(self, request):
        album = request.query_params.get('album', '').strip()
        artist = request.query_params.get('artist', '').strip()

        # Validate input
        if not album or not artist:
            return Response(
                {"error": "Both 'album' and 'artist' query parameters are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Step 1: Check the cache
        cached_overview = AlbumOverview.objects.filter(
            artist__iexact=artist,
            album__iexact=album
        ).first()

        if cached_overview:
            serializer = AlbumOverviewSerializer(cached_overview)
            return Response({
                "source": "cache",
                "data": serializer.data
            })

        # Step 2: Try Google Gemini API (only if key is configured)
        overview_text = None
        source = None
        gemini_error = None
        wikipedia_error = None

        gemini_key = getattr(settings, "GEMINI_API_KEY", None) or ""
        if gemini_key.strip():
            try:
                overview_text = self._fetch_from_gemini(artist, album)
                source = "gemini"
                logger.info(f"Successfully fetched overview from Gemini for '{album}' by {artist}")
            except Exception as e:
                gemini_error = str(e)
                logger.warning(f"Gemini failed for '{album}' by {artist}: {gemini_error}")

        # Step 3: Fall back to Wikipedia if Gemini failed
        if not overview_text:
            try:
                overview_text = self._fetch_from_wikipedia(artist, album)
                source = "wikipedia"
                logger.info(f"Successfully fetched overview from Wikipedia for '{album}' by {artist}")
            except Exception as e:
                wikipedia_error = str(e)
                logger.warning(f"Wikipedia failed for '{album}' by {artist}: {wikipedia_error}")

        # Step 4: Return error if all sources failed
        if not overview_text:
            err_detail = "Unable to fetch album overview."
            if gemini_error and wikipedia_error:
                err_detail += " Gemini and Wikipedia both failed."
            elif gemini_error:
                err_detail += f" Gemini: {gemini_error[:200]}."
            elif wikipedia_error:
                err_detail += f" Wikipedia: {wikipedia_error[:200]}."
            elif not gemini_key.strip():
                err_detail += " GEMINI_API_KEY not configured and Wikipedia had no results."
            return Response(
                {"error": err_detail},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Step 5: Cache the result in PostgreSQL
        new_overview = AlbumOverview.objects.create(
            artist=artist,
            album=album,
            overview=overview_text,
            source=source
        )

        serializer = AlbumOverviewSerializer(new_overview)
        return Response({
            "source": source,
            "data": serializer.data
        })

    def _fetch_from_gemini(self, artist, album):
        """
        Queries the Google Gemini API to generate a critical
        overview of the specified album.
        """
        import google.generativeai as genai

        api_key = getattr(settings, "GEMINI_API_KEY", None) or ""
        if not api_key.strip():
            raise Exception("GEMINI_API_KEY not configured")

        genai.configure(api_key=api_key.strip())

        # Try gemini-2.0-flash first, fall back to gemini-1.5-flash
        for model_name in ("gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"):
            try:
                model = genai.GenerativeModel(model_name)
                prompt = f"""You are an experienced music critic. Provide a concise but insightful critical overview of the album '{album}' by {artist}. Include: a brief summary of the album's themes and sound; critical reception and significance; notable tracks; its place in the artist's discography; and a rating out of 10. Keep the overview between 150-300 words."""

                response = model.generate_content(prompt)

                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"Gemini model {model_name} failed: {e}")
                continue

        raise Exception("All Gemini models failed")

    def _fetch_from_wikipedia(self, artist, album):
        """
        Queries the Wikipedia MediaWiki API to fetch an album's
        description and critical reception section.

        Wikipedia is completely free to use in both development
        and production with no API key required.
        """
        base_url = "https://en.wikipedia.org/w/api.php"

        # Strategy 1: Try searching for "{album} ({artist} album)"
        # This handles cases where multiple albums share the same name
        search_queries = [
            f"{album} ({artist} album)",
            f"{album} (album)",
            f"{album} {artist}",
            album
        ]

        page_content = None

        for query in search_queries:
            try:
                page_content = self._search_wikipedia(base_url, query)
                if page_content:
                    break
            except Exception:
                continue

        if not page_content:
            raise Exception(f"No Wikipedia article found for '{album}' by {artist}")

        # Extract relevant sections
        overview = self._extract_album_overview(page_content, artist, album)

        if not overview:
            raise Exception("Wikipedia article found but no useful overview content extracted.")

        return overview

    def _search_wikipedia(self, base_url, query):
        """
        Searches Wikipedia for a page matching the query and
        returns the page content if found.
        """
        # Step 1: Search for the page
        search_params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": 3,
            "format": "json",
        }

        search_response = requests.get(base_url, params=search_params)
        search_response.raise_for_status()
        search_data = search_response.json()

        search_results = search_data.get("query", {}).get("search", [])

        if not search_results:
            return None

        # Step 2: Get the full page content for the first result
        page_title = search_results[0]["title"]

        content_params = {
            "action": "query",
            "titles": page_title,
            "prop": "extracts",
            "exintro": False,  # Get full content, not just intro
            "explaintext": True,  # Plain text, no HTML
            "format": "json",
        }

        content_response = requests.get(base_url, params=content_params)
        content_response.raise_for_status()
        content_data = content_response.json()

        pages = content_data.get("query", {}).get("pages", {})

        for page_id, page_info in pages.items():
            if page_id == "-1":
                return None
            return page_info.get("extract", "")

        return None

    def _extract_album_overview(self, content, artist, album):
        """
        Extracts the most relevant sections from a Wikipedia
        article about an album, focusing on:
        - The introduction (general overview)
        - Critical reception
        - Legacy / influence
        """
        if not content:
            return None

        sections_to_extract = []

        # Extract the introduction (everything before the first section header)
        intro_match = re.match(r'^(.*?)(?=\n==\s)', content, re.DOTALL)
        if intro_match:
            intro = intro_match.group(1).strip()
            if len(intro) > 50:  # Only include if substantial
                sections_to_extract.append(f"Overview:\n{intro}")

        # Define section headers we're interested in
        target_sections = [
            r'critical\s*reception',
            r'reception',
            r'legacy',
            r'influence',
            r'review',
            r'critical\s*response',
            r'acclaim',
        ]

        # Extract matching sections
        for section_pattern in target_sections:
            pattern = rf'==\s*({section_pattern})\s*==\s*\n(.*?)(?=\n==\s|\Z)'
            matches = re.findall(pattern, content, re.IGNORECASE | re.DOTALL)
            for header, body in matches:
                body = body.strip()
                if len(body) > 50:  # Only include if substantial
                    sections_to_extract.append(f"{header.strip().title()}:\n{body}")

        if not sections_to_extract:
            # If no specific sections found, use the first 1000 characters
            truncated = content[:1000].strip()
            if len(truncated) > 50:
                sections_to_extract.append(f"Overview:\n{truncated}...")

        if sections_to_extract:
            return "\n\n".join(sections_to_extract)

        return None
