from django.conf import settings
from django.http import JsonResponse
from django.views import View
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import AlbumOverview
from .serializers import AlbumOverviewSerializer
from .client import search, get_release, get_master, get_artist, get_label
import google.generativeai as genai

# This now reads from your .env file via settings.py
genai.configure(api_key=settings.GEMINI_API_KEY)

# Configure Gemini only when key is set (avoids startup error and FutureWarning when unused)
_genai = None
if getattr(settings, "GEMINI_API_KEY", None):
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _genai = genai
    except Exception:
        pass

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


class AlbumOverviewView(APIView):
    """
    Fetches a critical overview of an album.
    First checks the local DB cache, then queries
    Google Gemini API if no cached version exists.
    """

    def get(self, request):
        try:
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

            # Step 2: Query Google Gemini API
            try:
                overview_text = self._fetch_overview_from_gemini(artist, album)
            except Exception as e:
                err_msg = str(e)
                if "429" in err_msg or "quota" in err_msg.lower() or "exceeded" in err_msg.lower():
                    err_msg = "Gemini quota exceeded. Try again later or check your API plan and billing."
                else:
                    err_msg = f"Failed to fetch overview from Gemini: {err_msg}"
                return Response(
                    {"error": err_msg},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # Step 3: Cache the result
            new_overview = AlbumOverview.objects.create(
                artist=artist,
                album=album,
                overview=overview_text
            )

            serializer = AlbumOverviewSerializer(new_overview)
            return Response({
                "source": "gemini",
                "data": serializer.data
            })
        except Exception as e:
            return Response(
                {"error": f"Overview unavailable: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _fetch_overview_from_gemini(self, artist, album):
        """
        Queries the Google Gemini API to generate a critical
        overview of the specified album.
        """
        if _genai is None:
            raise ValueError("GEMINI_API_KEY is not configured. Set it in .env to use album overviews.")
        model = _genai.GenerativeModel('gemini-2.0-flash')

        prompt = f"""
        You are an experienced music critic. Provide a concise but insightful
        critical overview of the album '{album}' by {artist}.

        Include the following in your overview:
        - A brief summary of the album's themes and sound
        - Critical reception and significance
        - Notable tracks and highlights
        - Its place in the artist's discography
        - A rating out of 10

        Keep the overview between 150-300 words. Be informative yet engaging.
        """

        response = model.generate_content(prompt)
        return response.text
