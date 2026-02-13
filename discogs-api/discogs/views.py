from django.conf import settings
from django.http import JsonResponse
from django.views import View

from .client import search


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
