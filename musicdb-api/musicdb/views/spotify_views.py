from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import TrackSpotifyLink
from .common import _bad_request, _validate_required


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
        release_id = (request.data.get("release_id") or "").strip()
        track_title = (request.data.get("track_title") or "").strip()
        spotify_track = request.data.get("spotify_track")
        required_error = _validate_required({"release_id": release_id, "track_title": track_title})
        if required_error:
            return required_error
        if not spotify_track or not spotify_track.get("id"):
            return _bad_request("Missing or invalid spotify_track (must have id)")
        track_id = str(spotify_track.get("id", "")).strip()
        uri = str(spotify_track.get("uri") or "").strip()
        name = str(spotify_track.get("name") or "").strip()
        artists = spotify_track.get("artists")
        if not isinstance(artists, list):
            artists = []
        artists = [{"name": str(a.get("name", "")).strip()} for a in artists]

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
