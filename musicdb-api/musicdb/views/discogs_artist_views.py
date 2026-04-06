"""Discogs API endpoints for manual artist image picker (search + full images)."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..client import get_artist, search


class DiscogsArtistSearchView(APIView):
    """
    GET /api/search/discogs-artist-search/?q=...
    Returns artist search hits (id, name, thumb).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        if not q:
            return Response(
                {"error": "Missing query parameter: q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = min(20, max(1, int(request.GET.get("limit", 10))))
        try:
            resp = search(q, per_page=limit, page=1, resource_type="artist")
        except Exception:
            return Response(
                {"error": "Discogs search unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if resp.status_code != 200:
            return Response(
                {"error": "Discogs search failed"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        try:
            payload = resp.json()
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid Discogs response"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        artists = []
        for r in payload.get("results") or []:
            if (r.get("type") or "").lower() != "artist":
                continue
            artists.append(
                {
                    "id": r.get("id"),
                    "name": (r.get("title") or "").strip(),
                    "thumb": (r.get("thumb") or "").strip(),
                }
            )
        return Response({"artists": artists})


class DiscogsArtistImagesView(APIView):
    """
    GET /api/search/discogs-artist-images/?discogs_artist_id=...
    Returns all image entries for that Discogs artist (url aligns with Spotify shape).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        did = (request.GET.get("discogs_artist_id") or "").strip()
        if not did:
            return Response(
                {"error": "Missing query parameter: discogs_artist_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            resp = get_artist(did)
        except Exception:
            return Response(
                {"error": "Discogs artist unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if resp.status_code != 200:
            return Response(
                {"error": "Discogs artist not found"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
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
                "discogs_artist_id": data.get("id"),
                "name": data.get("name"),
                "images": out,
            }
        )
