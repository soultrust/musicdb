"""Tests for Spotify match/search and playlists API views (HTTP mocked)."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class MatchTracksAPITests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            username="matchu", email="match@example.com", password="pw"
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(user).access_token)}")

    def test_missing_tracks_array_returns_400(self):
        res = self.client.post("/api/spotify/match-tracks/", {"tracks": []}, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empty_title_returns_null_spotify_track(self):
        res = self.client.post(
            "/api/spotify/match-tracks/",
            {"tracks": [{"title": "  ", "artists": ["A"]}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        matches = res.json().get("matches", [])
        self.assertEqual(len(matches), 1)
        self.assertIsNone(matches[0]["spotify_track"])

    @patch("spotify.views.search_track")
    @patch("spotify.views.find_best_match")
    def test_match_calls_spotify_and_returns_track(self, mock_find, mock_search):
        mock_search.return_value = [{"name": "Song", "artists": [{"name": "Band"}], "id": "t1"}]
        mock_find.return_value = {"name": "Song", "id": "t1", "uri": "spotify:track:t1"}

        res = self.client.post(
            "/api/spotify/match-tracks/",
            {"tracks": [{"title": "Song", "artists": ["Band"]}]},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        matches = res.json().get("matches", [])
        self.assertEqual(matches[0]["spotify_track"]["id"], "t1")
        mock_search.assert_called()


class SpotifySearchViewTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            username="searchu", email="search@example.com", password="pw"
        )
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(RefreshToken.for_user(user).access_token)}")

    def test_missing_q_returns_400(self):
        res = self.client.get("/api/spotify/search/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("spotify.views.search_track")
    def test_search_returns_tracks(self, mock_search):
        mock_search.return_value = [{"name": "Hit", "id":("1" * 22)}]
        res = self.client.get("/api/spotify/search/", {"q": "test query", "limit": "5"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json().get("tracks", [])), 1)
        mock_search.assert_called_once()
        _, kwargs = mock_search.call_args
        self.assertEqual(kwargs["limit"], 5)

    @patch("spotify.views.search_track")
    def test_limit_clamped_high(self, mock_search):
        mock_search.return_value = []
        self.client.get("/api/spotify/search/", {"q": "x", "limit": "99"})
        _, kwargs = mock_search.call_args
        self.assertEqual(kwargs["limit"], 20)

    @patch("spotify.views.search_track")
    def test_search_passes_album_to_spotify(self, mock_search):
        mock_search.return_value = []
        self.client.get(
            "/api/spotify/search/",
            {"q": "War Pigs", "artist": "Black Sabbath", "album": "Paranoid"},
        )
        mock_search.assert_called_once()
        _, kwargs = mock_search.call_args
        self.assertEqual(kwargs["query"], "War Pigs")
        self.assertEqual(kwargs["artist"], "Black Sabbath")
        self.assertEqual(kwargs["album"], "Paranoid")


class SpotifyPlaylistsViewTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="plu", email="pl@example.com", password="pw"
        )
        self.client = APIClient()

    def test_missing_token_returns_400_when_force_authenticated(self):
        """JWT is satisfied via force_authenticate; view still requires Bearer token string for Spotify."""
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/spotify/playlists/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Spotify", res.json().get("error", ""))

    @patch("spotify.views.requests.get")
    def test_playlists_success(self, mock_get):
        self.client.force_authenticate(user=self.user)
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "items": [
                    {
                        "id": "pl1",
                        "name": "My mix",
                        "owner": {"display_name": "Me"},
                        "collaborative": False,
                        "public": True,
                        "tracks": {"total": 10},
                        "images": [],
                    }
                ],
                "next": None,
            },
        )
        res = self.client.get("/api/spotify/playlists/", HTTP_AUTHORIZATION="Bearer spotify-fake-token")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        playlists = res.json().get("playlists", [])
        self.assertEqual(len(playlists), 1)
        self.assertEqual(playlists[0]["id"], "pl1")


class SpotifyPlaylistTracksViewTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="pltu", email="plt@example.com", password="pw"
        )
        self.client = APIClient()

    def test_missing_token_returns_400(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get("/api/spotify/playlists/abc123/tracks/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("spotify.views.requests.get")
    def test_returns_tracks_payload(self, mock_get):
        self.client.force_authenticate(user=self.user)
        playlist_meta = {
            "id": "abc",
            "name": "PL",
            "owner": {"display_name": "O"},
            "description": "",
            "images": [],
        }
        tracks_page = {
            "items": [
                {
                    "track": {
                        "id": "tr1",
                        "name": "Track 1",
                        "artists": [{"name": "Artist"}],
                        "album": {"name": "ALB"},
                        "uri": "spotify:track:tr1",
                        "duration_ms": 180000,
                        "preview_url": None,
                    }
                }
            ],
            "next": None,
        }

        def get_side_effect(url, **kwargs):
            return (
                Mock(status_code=200, json=lambda: tracks_page)
                if "/tracks" in str(url)
                else Mock(status_code=200, json=lambda: playlist_meta)
            )

        mock_get.side_effect = get_side_effect
        res = self.client.get(
            "/api/spotify/playlists/abc/tracks/",
            HTTP_AUTHORIZATION="Bearer spotify-fake-token",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["id"], "abc")
        self.assertEqual(len(body.get("tracks", [])), 1)
        self.assertEqual(body["tracks"][0]["name"], "Track 1")
