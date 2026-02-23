from django.urls import path

from .views import (
    MatchTracksAPIView,
    SpotifyCallbackAPIView,
    SpotifyPlaylistsView,
    SpotifyPlaylistTracksView,
)

urlpatterns = [
    path("match-tracks/", MatchTracksAPIView.as_view(), name="match_tracks"),
    path("callback/", SpotifyCallbackAPIView.as_view(), name="spotify_callback"),
    path("playlists/", SpotifyPlaylistsView.as_view(), name="spotify_playlists"),
    path("playlists/<str:playlist_id>/tracks/", SpotifyPlaylistTracksView.as_view(), name="spotify_playlist_tracks"),
]
