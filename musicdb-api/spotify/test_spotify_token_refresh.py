"""Tests for Spotify refresh token store and refresh endpoints."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import SpotifyUserToken


class SpotifyStoreRefreshTokenTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="spuser", email="sp@example.com", password="pass123"
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_store_refresh_token(self):
        res = self.client.post(
            "/api/spotify/store-refresh-token/",
            {"refresh_token": "rt-abc-123"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json()["stored"])
        self.assertEqual(SpotifyUserToken.objects.get(user=self.user).refresh_token, "rt-abc-123")

    def test_store_overwrites_existing(self):
        SpotifyUserToken.objects.create(user=self.user, refresh_token="old")
        res = self.client.post(
            "/api/spotify/store-refresh-token/",
            {"refresh_token": "new"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(SpotifyUserToken.objects.get(user=self.user).refresh_token, "new")

    def test_missing_refresh_token_returns_400(self):
        res = self.client.post(
            "/api/spotify/store-refresh-token/", {}, format="json"
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_auth(self):
        client = APIClient()
        res = client.post(
            "/api/spotify/store-refresh-token/",
            {"refresh_token": "x"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class SpotifyRefreshAccessTokenTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="sprefresh", email="spr@example.com", password="pass123"
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_no_stored_token_returns_404(self):
        res = self.client.post("/api/spotify/refresh/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(SPOTIFY_CLIENT_ID="cid", SPOTIFY_CLIENT_SECRET="secret")
    @patch("spotify.views.requests.post")
    def test_successful_refresh(self, mock_post):
        SpotifyUserToken.objects.create(user=self.user, refresh_token="stored-rt")
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {"access_token": "fresh-at", "expires_in": 3600},
        )
        res = self.client.post("/api/spotify/refresh/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["access_token"], "fresh-at")
        self.assertEqual(body["expires_in"], 3600)
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["data"]["grant_type"], "refresh_token")
        self.assertEqual(kwargs["data"]["refresh_token"], "stored-rt")

    @override_settings(SPOTIFY_CLIENT_ID="cid", SPOTIFY_CLIENT_SECRET="secret")
    @patch("spotify.views.requests.post")
    def test_refresh_rotates_token(self, mock_post):
        SpotifyUserToken.objects.create(user=self.user, refresh_token="old-rt")
        mock_post.return_value = Mock(
            status_code=200,
            json=lambda: {
                "access_token": "fresh-at",
                "refresh_token": "rotated-rt",
                "expires_in": 3600,
            },
        )
        res = self.client.post("/api/spotify/refresh/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            SpotifyUserToken.objects.get(user=self.user).refresh_token, "rotated-rt"
        )

    @override_settings(SPOTIFY_CLIENT_ID="cid", SPOTIFY_CLIENT_SECRET="secret")
    @patch("spotify.views.requests.post")
    def test_revoked_token_deletes_stored_and_returns_502(self, mock_post):
        SpotifyUserToken.objects.create(user=self.user, refresh_token="revoked-rt")
        mock_post.return_value = Mock(status_code=400, text="invalid_grant")
        res = self.client.post("/api/spotify/refresh/")
        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertFalse(SpotifyUserToken.objects.filter(user=self.user).exists())

    @override_settings(SPOTIFY_CLIENT_ID=None, SPOTIFY_CLIENT_SECRET=None)
    def test_missing_credentials_returns_503(self):
        SpotifyUserToken.objects.create(user=self.user, refresh_token="rt")
        res = self.client.post("/api/spotify/refresh/")
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_requires_auth(self):
        client = APIClient()
        res = client.post("/api/spotify/refresh/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
