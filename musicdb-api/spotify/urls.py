from django.urls import path

from .views import (
    MatchTracksAPIView,
    SpotifyCallbackAPIView,
    SpotifyPlaylistsView,
    SpotifyPlaylistTracksView,
    SpotifySearchView,
)

urlpatterns = [
    path("match-tracks/", MatchTracksAPIView.as_view(), name="match_tracks"),
    path("search/", SpotifySearchView.as_view(), name="spotify_search"),
    path("callback/", SpotifyCallbackAPIView.as_view(), name="spotify_callback"),
    path("playlists/", SpotifyPlaylistsView.as_view(), name="spotify_playlists"),
    path("playlists/<str:playlist_id>/tracks/", SpotifyPlaylistTracksView.as_view(), name="spotify_playlist_tracks"),
]
