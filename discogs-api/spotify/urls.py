from django.urls import path

from .views import MatchTracksAPIView

urlpatterns = [
    path("match-tracks/", MatchTracksAPIView.as_view(), name="match_tracks"),
]
