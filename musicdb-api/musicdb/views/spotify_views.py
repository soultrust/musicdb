from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from spotify.client import get_spotify_artist, search_artists

from ..models import ArtistSpotifyImageLink, TrackSpotifyLink
from ..serializers import ManualSpotifyArtistImageSerializer, ManualSpotifyMatchSerializer
from .common import _bad_request, _validate_required, _validation_error_response


class ManualSpotifyMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        release_id = (request.GET.get("release_id") or "").strip()
        required_error = _validate_required({"release_id": release_id})
        if required_error:
            return required_error
        links = TrackSpotifyLink.objects.filter(user=request.user, release_id=release_id)
        matches = [
            {
                "track_title": link.track_title,
                "spotify_track": {
                    "id": link.spotify_track_id,
                    "uri": link.spotify_uri,
                    "name": link.spotify_name,
                    "artists": link.spotify_artists or [],
                },
            }
            for link in links
        ]
        return Response({"matches": matches})


class ManualSpotifyMatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = ManualSpotifyMatchSerializer(data=request.data)
        if not ser.is_valid():
            return _validation_error_response(ser)
        release_id = ser.validated_data["release_id"]
        track_title = ser.validated_data["track_title"]
        spotify_track = ser.validated_data["spotify_track"]
        track_id = str(spotify_track.get("id", "")).strip()
        uri = str(spotify_track.get("uri") or "").strip()
        name = str(spotify_track.get("name") or "").strip()
        artists_raw = spotify_track.get("artists") or []
        if not isinstance(artists_raw, list):
            artists_raw = []
        artists = [
            {"name": str(a.get("name", "")).strip()}
            for a in artists_raw
            if isinstance(a, dict)
        ]

        link, _ = TrackSpotifyLink.objects.update_or_create(
            user=request.user,
            release_id=release_id,
            track_title=track_title,
            defaults={
                "spotify_track_id": track_id,
                "spotify_uri": uri[:128] if uri else "",
                "spotify_name": name[:512] if name else "",
                "spotify_artists": artists,
            },
        )
        return Response(
            {
                "track_title": link.track_title,
                "spotify_track": {
                    "id": link.spotify_track_id,
                    "uri": link.spotify_uri,
                    "name": link.spotify_name,
                    "artists": link.spotify_artists,
                },
            }
        )

    def delete(self, request):
        """Remove a manual track→Spotify link for this release (query: release_id, track_title)."""
        release_id = (request.query_params.get("release_id") or "").strip()
        track_title = (request.query_params.get("track_title") or "").strip()
        if not release_id or not track_title:
            return Response(
                {"error": "Query parameters release_id and track_title are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        TrackSpotifyLink.objects.filter(
            user=request.user,
            release_id=release_id,
            track_title=track_title,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SpotifyArtistSearchView(APIView):
    """
    GET /api/search/spotify-artist-search/?q=... — search Spotify artists by name (manual image picker).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = (request.GET.get("q") or "").strip()
        if not q:
            return Response(
                {"error": "Missing query parameter: q"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = min(50, max(1, int(request.GET.get("limit", 50))))
        items = search_artists(q, limit=limit)
        artists = []
        for a in items:
            images = a.get("images") or []
            if not any(
                isinstance(img, dict) and (str(img.get("url") or "").strip())
                for img in images
            ):
                continue
            artists.append(
                {
                    "id": a.get("id"),
                    "name": a.get("name"),
                    "images": images,
                }
            )
        return Response({"artists": artists})


class SpotifyArtistImagesView(APIView):
    """
    GET /api/search/spotify-artist-images/?spotify_artist_id=...
    Returns all image sizes for that Spotify artist.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        spotify_artist_id = (request.GET.get("spotify_artist_id") or "").strip()
        if not spotify_artist_id:
            return Response(
                {"error": "Missing query parameter: spotify_artist_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = get_spotify_artist(spotify_artist_id)
        if not data:
            return Response(
                {"error": "Spotify artist not found or unavailable"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        images = data.get("images") or []
        out = []
        for img in images:
            if not isinstance(img, dict):
                continue
            url = (img.get("url") or "").strip()
            if url:
                out.append(
                    {
                        "url": url,
                        "width": img.get("width"),
                        "height": img.get("height"),
                    }
                )
        return Response(
            {
                "spotify_artist_id": data.get("id"),
                "name": data.get("name"),
                "images": out,
            }
        )


class ManualSpotifyArtistImageView(APIView):
    """
    GET — current user's manual image for a MusicBrainz artist (if any).
    POST — save manual image URL (+ optional spotify_artist_id).
    DELETE — remove manual override.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        mbid = (request.GET.get("musicbrainz_artist_id") or "").strip()
        required_error = _validate_required({"musicbrainz_artist_id": mbid})
        if required_error:
            return required_error
        link = ArtistSpotifyImageLink.objects.filter(
            user=request.user,
            musicbrainz_artist_id=mbid,
        ).first()
        if not link:
            return Response(
                {
                    "manual_match": False,
                    "image_url": None,
                    "spotify_artist_id": None,
                    "discogs_artist_id": None,
                }
            )
        return Response(
            {
                "manual_match": True,
                "image_url": link.image_url,
                "spotify_artist_id": link.spotify_artist_id or None,
                "discogs_artist_id": link.discogs_artist_id or None,
            }
        )

    def post(self, request):
        ser = ManualSpotifyArtistImageSerializer(data=request.data)
        if not ser.is_valid():
            return _validation_error_response(ser)
        mbid = ser.validated_data["musicbrainz_artist_id"]
        image_url = ser.validated_data["image_url"]
        sid = (ser.validated_data.get("spotify_artist_id") or "").strip()
        did = (ser.validated_data.get("discogs_artist_id") or "").strip()

        link, _ = ArtistSpotifyImageLink.objects.update_or_create(
            user=request.user,
            musicbrainz_artist_id=mbid,
            defaults={
                "image_url": image_url,
                "spotify_artist_id": sid[:64] if sid else "",
                "discogs_artist_id": did[:64] if did else "",
            },
        )
        return Response(
            {
                "manual_match": True,
                "image_url": link.image_url,
                "spotify_artist_id": link.spotify_artist_id or None,
                "discogs_artist_id": link.discogs_artist_id or None,
            }
        )

    def delete(self, request):
        mbid = (request.query_params.get("musicbrainz_artist_id") or "").strip()
        if not mbid:
            return _bad_request("Query parameter musicbrainz_artist_id is required")
        deleted, _ = ArtistSpotifyImageLink.objects.filter(
            user=request.user,
            musicbrainz_artist_id=mbid,
        ).delete()
        if deleted == 0:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
