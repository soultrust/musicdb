from django.conf import settings
from django.db import models


class SpotifyUserToken(models.Model):
    """Stores the Spotify OAuth refresh token per user for silent re-authentication."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spotify_token",
    )
    refresh_token = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"SpotifyToken({self.user_id})"
