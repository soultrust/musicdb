from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/search/", include("discogs.urls")),
    path("api/spotify/", include("spotify.urls")),
]
