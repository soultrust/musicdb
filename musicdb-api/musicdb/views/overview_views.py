from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import AlbumOverview
from ..serializers import AlbumOverviewSerializer
from ..services.overview_service import fetch_album_overview_outcome


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

        outcome = fetch_album_overview_outcome(artist, album, use_gemini=False)
        if not outcome.overview_text:
            err_detail = "Unable to fetch album overview."
            if outcome.gemini_error:
                err_detail += f" Gemini: {outcome.gemini_error[:200]}."
            if outcome.wikipedia_error:
                err_detail += f" Wikipedia: {outcome.wikipedia_error[:200]}."
            return Response({"error": err_detail}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        new_overview = AlbumOverview.objects.create(
            artist=artist,
            album=album,
            overview=outcome.overview_text,
            source=outcome.source,
        )
        serializer = AlbumOverviewSerializer(new_overview)
        return Response({"source": outcome.source, "data": serializer.data})
