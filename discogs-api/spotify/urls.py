from django.urls import path

from .views import MatchTracksAPIView, SpotifyCallbackAPIView

urlpatterns = [
    path("match-tracks/", MatchTracksAPIView.as_view(), name="match_tracks"),
    path("callback/", SpotifyCallbackAPIView.as_view(), name="spotify_callback"),
]
