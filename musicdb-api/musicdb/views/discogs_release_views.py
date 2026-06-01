"""Discogs API endpoints for manual album cover picker (search + full images)."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..client import get_release, search
from .discogs_artist_views import _discogs_http_error_payload


class DiscogsReleaseSearchView(APIView):
    """
    GET /api/search/discogs-release-search/?q=...
    Returns release search hits (id, title, thumb).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        if not q:
            return Response(
                {"error": "Missing query parameter: q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = min(100, max(1, int(request.GET.get("limit", 100))))
        try:
            resp = search(q, per_page=limit, page=1, resource_type="release")
        except Exception:
            return Response(
                {"error": "Discogs search unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if resp.status_code != 200:
            detail = _discogs_http_error_payload(resp)
            body = {"error": "Discogs search failed"}
            if detail:
                body["detail"] = detail
            return Response(body, status=status.HTTP_502_BAD_GATEWAY)
        try:
            payload = resp.json()
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid Discogs response"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        releases = []
        for r in payload.get("results") or []:
            if (r.get("type") or "").lower() != "release":
                continue
            releases.append(
                {
                    "id": r.get("id"),
                    "title": (r.get("title") or "").strip(),
                    "thumb": (r.get("thumb") or "").strip(),
                }
            )
        return Response({"releases": releases})


class DiscogsReleaseImagesView(APIView):
    """
    GET /api/search/discogs-release-images/?discogs_release_id=...
    Returns image entries for that Discogs release.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rid = (request.GET.get("discogs_release_id") or "").strip()
        if not rid:
            return Response(
                {"error": "Missing query parameter: discogs_release_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            resp = get_release(rid)
        except Exception:
            return Response(
                {"error": "Discogs release unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if resp.status_code != 200:
            detail = _discogs_http_error_payload(resp)
            body = {"error": "Discogs release not found"}
            if detail:
                body["detail"] = detail
            return Response(body, status=status.HTTP_502_BAD_GATEWAY)
        try:
            data = resp.json()
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid Discogs response"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        out = []
        for img in data.get("images") or []:
            if not isinstance(img, dict):
                continue
            uri = (img.get("uri") or "").strip()
            if uri:
                out.append(
                    {
                        "url": uri,
                        "width": img.get("width"),
                        "height": img.get("height"),
                        "type": img.get("type"),
                    }
                )
        return Response(
            {
                "discogs_release_id": data.get("id"),
                "title": data.get("title"),
                "images": out,
            }
        )
