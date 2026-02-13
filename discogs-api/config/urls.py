from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/search/", include("musicbrainz.urls")),
    path("api/spotify/", include("spotify.urls")),
]
