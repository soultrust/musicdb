from django.db import models

class AlbumOverview(models.Model):
    """
    Caches AI-generated album overviews to minimize API calls.
    """
    artist = models.CharField(max_length=255)
    album = models.CharField(max_length=255)
    overview = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Ensure we don't have duplicate entries for the same album/artist
        unique_together = ('artist', 'album')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.artist} - {self.album}"