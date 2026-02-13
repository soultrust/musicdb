from django.apps import AppConfig


class MusicbrainzConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "musicbrainz"
    verbose_name = "MusicBrainz API client"
