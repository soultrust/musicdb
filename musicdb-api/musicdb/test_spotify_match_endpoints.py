from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import TrackSpotifyLink


class ManualSpotifyMatchEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="spotifymatchuser",
            email="spotifymatchuser@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_validation_errors(self):
        res = self.client.post(
            "/api/search/manual-spotify-match/",
            data={"release_id": "", "track_title": "", "spotify_track": {}},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        res = self.client.get("/api/search/manual-spotify-matches/")
        self.assertEqual(res.status_code, 400)

    def test_create_update_and_list_matches(self):
        payload = {
            "release_id": "mb-release-1",
            "track_title": "Track One",
            "spotify_track": {
                "id": "spotify-track-1",
                "uri": "spotify:track:spotify-track-1",
                "name": "Track One (Spotify)",
                "artists": [{"name": "Artist One"}],
            },
        }
        res = self.client.post("/api/search/manual-spotify-match/", data=payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(TrackSpotifyLink.objects.count(), 1)

        payload["spotify_track"]["name"] = "Track One (Spotify Updated)"
        res = self.client.post("/api/search/manual-spotify-match/", data=payload, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(TrackSpotifyLink.objects.count(), 1)
        self.assertEqual(
            TrackSpotifyLink.objects.first().spotify_name,
            "Track One (Spotify Updated)",
        )

        res = self.client.get("/api/search/manual-spotify-matches/?release_id=mb-release-1")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body.get("matches", [])), 1)
        match = body["matches"][0]
        self.assertEqual(match["track_title"], "Track One")
        self.assertEqual(match["spotify_track"]["id"], "spotify-track-1")
