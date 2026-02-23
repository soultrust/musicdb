from django.apps import AppConfig


class SpotifyConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spotify"
    verbose_name = "Spotify API client"
