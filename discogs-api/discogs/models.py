from django.conf import settings
from django.db import models


class ConsumedAlbum(models.Model):
    """
    Tracks whether an album (release or master) has been consumed/listened to.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="consumed_albums",
    )
    type = models.CharField(max_length=20)  # 'release' or 'master'
    discogs_id = models.CharField(max_length=32)
    title = models.CharField(max_length=512, blank=True)  # search result title for duplicate hiding
    consumed = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "type", "discogs_id")
        ordering = ["-id"]

    def __str__(self):
        return f"{self.type}-{self.discogs_id}: consumed={self.consumed}"


class AlbumOverview(models.Model):
    """
    Caches AI-generated album overviews to minimize API calls.
    """
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255)
    overview = models.TextField()
    source = models.CharField(max_length=50, default='unknown')  # 'gemini', 'wikipedia', 'cache', etc.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Ensure we don't have duplicate entries for the same album/artist
        unique_together = ('artist', 'album')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.artist} - {self.album} ({self.source})"