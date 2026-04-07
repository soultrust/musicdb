"""Tests for Spotify OAuth callback token exchange."""

from unittest.mock import Mock, patch

from django.test import Client, TestCase, override_settings


class SpotifyCallbackAPITests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_missing_code_returns_400(self):
        res = self.client.get("/api/spotify/callback/")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"], "Missing authorization code")

    @override_settings(SPOTIFY_CLIENT_ID=None, SPOTIFY_CLIENT_SECRET=None)
    def test_missing_credentials_returns_503(self):
        res = self.client.get("/api/spotify/callback/", {"code": "abc"})
        self.assertEqual(res.status_code, 503)

    @override_settings(SPOTIFY_CLIENT_ID="cid", SPOTIFY_CLIENT_SECRET="secret")
    @patch("spotify.views.requests.post")
    def test_token_exchange_success(self, mock_post):
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: {"access_token": "test-access", "refresh_token": "test-refresh", "expires_in": 3600}
        mock_post.return_value = mock_resp

        res = self.client.get(
            "/api/spotify/callback/",
            {"code": "auth-code", "redirect_uri": "http://127.0.0.1:3000/cb"},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["access_token"], "test-access")
        self.assertEqual(body["refresh_token"], "test-refresh")
        self.assertEqual(body["expires_in"], 3600)
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["data"]["grant_type"], "authorization_code")

    @override_settings(SPOTIFY_CLIENT_ID="cid", SPOTIFY_CLIENT_SECRET="secret")
    @patch("spotify.views.requests.post")
    def test_token_exchange_non_200_returns_502(self, mock_post):
        mock_resp = Mock()
        mock_resp.status_code = 400
        mock_resp.text = "bad"
        mock_post.return_value = mock_resp

        res = self.client.get("/api/spotify/callback/", {"code": "x", "redirect_uri": "http://127.0.0.1:3000"})
        self.assertEqual(res.status_code, 502)

    @override_settings(SPOTIFY_CLIENT_ID="cid", SPOTIFY_CLIENT_SECRET="secret")
    @patch("spotify.views.requests.post")
    def test_token_exchange_json_without_access_token_returns_502(self, mock_post):
        mock_resp = Mock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: {"error": "invalid_grant"}
        mock_post.return_value = mock_resp

        res = self.client.get("/api/spotify/callback/", {"code": "x", "redirect_uri": "http://127.0.0.1:3000"})
        self.assertEqual(res.status_code, 502)
        self.assertIn("error", res.json())
