from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class AuthSmokeEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="authsmokeuser",
            email="authsmokeuser@example.com",
            password="password123",
        )

        refresh = RefreshToken.for_user(self.user)
        self.authed_client = APIClient()
        self.authed_client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        self.noauth_client = APIClient()

    def assertNoAuth(self, res):
        self.assertIn(res.status_code, (401, 403))

    def test_search_endpoints_require_auth(self):
        res = self.noauth_client.get("/api/search/")
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/detail/?type=artist&id=abc")
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/consumed-titles/")
        self.assertNoAuth(res)

    def test_list_endpoints_require_auth(self):
        res = self.noauth_client.get("/api/search/lists/")
        self.assertNoAuth(res)

        res = self.noauth_client.post("/api/search/lists/items/", data={"type": "release", "id": "1"}, format="json")
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/lists/items/check/?type=release&id=1")
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/lists/1/")
        self.assertNoAuth(res)

    def test_spotify_match_endpoints_require_auth(self):
        res = self.noauth_client.get("/api/search/manual-spotify-matches/?release_id=mb-release-1")
        self.assertNoAuth(res)

        res = self.noauth_client.post(
            "/api/search/manual-spotify-match/",
            data={
                "release_id": "mb-release-1",
                "track_title": "Track",
                "spotify_track": {"id": "spotify-track-1", "uri": "spotify:track:spotify-track-1"},
            },
            format="json",
        )
        self.assertNoAuth(res)

    def test_spotify_artist_image_endpoints_require_auth(self):
        res = self.noauth_client.get("/api/search/spotify-artist-search/?q=test")
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/spotify-artist-images/?spotify_artist_id=abc")
        self.assertNoAuth(res)

        res = self.noauth_client.get(
            "/api/search/manual-spotify-artist-image/?musicbrainz_artist_id=mbid"
        )
        self.assertNoAuth(res)

        res = self.noauth_client.post(
            "/api/search/manual-spotify-artist-image/",
            data={
                "musicbrainz_artist_id": "mbid",
                "image_url": "https://i.scdn.co/image/x",
            },
            format="json",
        )
        self.assertNoAuth(res)

        res = self.noauth_client.delete(
            "/api/search/manual-spotify-artist-image/?musicbrainz_artist_id=mbid"
        )
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/discogs-artist-search/?q=test")
        self.assertNoAuth(res)

        res = self.noauth_client.get("/api/search/discogs-artist-images/?discogs_artist_id=1")
        self.assertNoAuth(res)

    def test_especially_liked_endpoints_require_auth(self):
        res = self.noauth_client.get(
            "/api/search/especially-liked-tracks/?item_type=release&item_id=11111111-1111-1111-1111-111111111111"
        )
        self.assertNoAuth(res)

        res = self.noauth_client.post(
            "/api/search/especially-liked-track/",
            data={
                "item_type": "release",
                "item_id": "11111111-1111-1111-1111-111111111111",
                "track_title": "Test Track",
                "track_position": "1",
                "especially_liked": True,
            },
            format="json",
        )
        self.assertNoAuth(res)

