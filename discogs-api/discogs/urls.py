from django.urls import path
from .views import AlbumOverviewView

from .views import SearchAPIView, DetailAPIView

urlpatterns = [
    path("", SearchAPIView.as_view(), name="search"),
    path("detail/", DetailAPIView.as_view(), name="detail"),
    path('album-overview/', AlbumOverviewView.as_view(), name='album-overview'),
]
