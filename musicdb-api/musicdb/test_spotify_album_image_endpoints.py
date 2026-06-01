"""Tests for Spotify album search, images list, and manual album cover override."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ReleaseGroupImageLink


class SpotifyAlbumImageEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="albumimguser",
            email="albumimg@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    @patch("musicdb.views.spotify_views.search_albums")
    def test_spotify_album_search_returns_albums(self, mock_search):
        mock_search.return_value = [
            {"id": "a1", "name": "Album", "images": [{"url": "https://i.scdn.co/x", "width": 300}]},
        ]
        res = self.client.get("/api/search/spotify-album-search/", {"q": "Album"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        albums = res.json().get("albums", [])
        self.assertEqual(len(albums), 1)
        self.assertEqual(albums[0]["id"], "a1")

    @patch("musicdb.views.spotify_views.get_spotify_album")
    def test_spotify_album_images_returns_images(self, mock_get):
        mock_get.return_value = {
            "id": "abc",
            "name": "Album",
            "images": [{"url": "https://i.scdn.co/large", "width": 640, "height": 640}],
        }
        res = self.client.get(
            "/api/search/spotify-album-images/",
            {"spotify_album_id": "abc"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.json().get("images", [])), 1)

    def test_manual_album_image_crud(self):
        rgid = "22222222-2222-2222-2222-222222222222"
        res = self.client.get(
            "/api/search/manual-album-image/",
            {"musicbrainz_release_group_id": rgid},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.json().get("manual_match"))

        res = self.client.post(
            "/api/search/manual-album-image/",
            data={
                "musicbrainz_release_group_id": rgid,
                "image_url": "https://i.scdn.co/image/album",
                "spotify_album_id": "spotify-album-1",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json().get("manual_match"))
        self.assertEqual(ReleaseGroupImageLink.objects.count(), 1)

        res = self.client.delete(
            f"/api/search/manual-album-image/?musicbrainz_release_group_id={rgid}"
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    @patch("musicdb.views.discogs_release_views.search")
    def test_discogs_release_search_returns_releases(self, mock_search):
        mock_search.return_value = Mock(
            status_code=200,
            json=lambda: {
                "results": [
                    {"type": "release", "id": 42, "title": "Some Album", "thumb": "https://img.discogs.com/r.jpg"},
                ]
            },
        )
        res = self.client.get("/api/search/discogs-release-search/", {"q": "Some"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        releases = res.json().get("releases", [])
        self.assertEqual(len(releases), 1)
        self.assertEqual(releases[0]["id"], 42)
