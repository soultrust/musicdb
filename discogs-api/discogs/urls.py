from django.urls import path
from .views import AlbumOverviewView, ConsumedAlbumView

from .views import SearchAPIView, DetailAPIView

urlpatterns = [
    path("", SearchAPIView.as_view(), name="search"),
    path("detail/", DetailAPIView.as_view(), name="detail"),
    path("album-overview/", AlbumOverviewView.as_view(), name="album-overview"),
    path("consumed/", ConsumedAlbumView.as_view(), name="consumed"),
]
