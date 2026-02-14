from django.urls import path
from .views import (
    AlbumOverviewView,
    ConsumedAlbumView,
    ConsumedBackfillView,
    ConsumedListView,
    ConsumedTitlesView,
    DetailAPIView,
    SearchAPIView,
)

urlpatterns = [
    path("", SearchAPIView.as_view(), name="search"),
    path("detail/", DetailAPIView.as_view(), name="detail"),
    path("album-overview/", AlbumOverviewView.as_view(), name="album-overview"),
    path("consumed/", ConsumedAlbumView.as_view(), name="consumed"),
    path("consumed-titles/", ConsumedTitlesView.as_view(), name="consumed-titles"),
    path("consumed-list/", ConsumedListView.as_view(), name="consumed-list"),
    path("consumed-backfill/", ConsumedBackfillView.as_view(), name="consumed-backfill"),
]
