from django.conf import settings
from django.http import JsonResponse
from django.views import View

from .client import search, get_release, get_artist, get_label


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
        elif resource_type == "artist":
            response = get_artist(resource_id)
        elif resource_type == "label":
            response = get_label(resource_id)
        else:
            return JsonResponse(
                {"error": f"Invalid type: {resource_type}. Must be 'release', 'artist', or 'label'"},
                status=400,
            )
        
        if response.status_code != 200:
            return JsonResponse(
                {"error": f"Discogs API returned {response.status_code}"},
                status=502,
            )
        
        return JsonResponse(response.json())
