"""Tests for Spotify artist search, images list, and manual artist image override."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ArtistSpotifyImageLink


class SpotifyArtistImageEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="artistimguser",
            email="artistimg@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    @patch("musicdb.views.spotify_views.search_artists")
    def test_spotify_artist_search_returns_artists(self, mock_search):
        mock_search.return_value = [
            {"id": "s1", "name": "Band", "images": [{"url": "https://i.scdn.co/x", "width": 64}]},
        ]
        res = self.client.get("/api/search/spotify-artist-search/", {"q": "Band"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        artists = res.json().get("artists", [])
        self.assertEqual(len(artists), 1)
        self.assertEqual(artists[0]["id"], "s1")
        mock_search.assert_called_once_with("Band", limit=50)

    @patch("musicdb.views.spotify_views.search_artists")
    def test_spotify_artist_search_skips_artists_without_images(self, mock_search):
        mock_search.return_value = [
            {"id": "noimg", "name": "No Pic", "images": []},
            {"id": "s2", "name": "Has Pic", "images": [{"url": "https://i.scdn.co/y"}]},
        ]
        res = self.client.get("/api/search/spotify-artist-search/", {"q": "x"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        artists = res.json().get("artists", [])
        self.assertEqual(len(artists), 1)
        self.assertEqual(artists[0]["id"], "s2")

    def test_spotify_artist_search_requires_q(self):
        res = self.client.get("/api/search/spotify-artist-search/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("musicdb.views.spotify_views.get_spotify_artist")
    def test_spotify_artist_images_returns_images(self, mock_get):
        mock_get.return_value = {
            "id": "abc",
            "name": "Artist",
            "images": [
                {"url": "https://i.scdn.co/large", "width": 640, "height": 640},
                {"url": "https://i.scdn.co/small", "width": 64, "height": 64},
            ],
        }
        res = self.client.get(
            "/api/search/spotify-artist-images/",
            {"spotify_artist_id": "abc"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(len(body.get("images", [])), 2)
        self.assertEqual(body.get("name"), "Artist")

    def test_spotify_artist_images_requires_id(self):
        res = self.client.get("/api/search/spotify-artist-images/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_manual_artist_image_crud(self):
        mbid = "11111111-1111-1111-1111-111111111111"
        res = self.client.get(
            "/api/search/manual-spotify-artist-image/",
            {"musicbrainz_artist_id": mbid},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(res.json().get("manual_match"))

        res = self.client.post(
            "/api/search/manual-spotify-artist-image/",
            data={
                "musicbrainz_artist_id": mbid,
                "image_url": "https://i.scdn.co/image/abc",
                "spotify_artist_id": "spotify-artist-1",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.json().get("manual_match"))
        self.assertEqual(ArtistSpotifyImageLink.objects.count(), 1)

        res = self.client.delete(
            f"/api/search/manual-spotify-artist-image/?musicbrainz_artist_id={mbid}"
        )
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ArtistSpotifyImageLink.objects.count(), 0)

    def test_manual_artist_image_delete_404_when_missing(self):
        res = self.client.delete(
            "/api/search/manual-spotify-artist-image/?musicbrainz_artist_id=missing-mbid"
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    @patch("musicdb.views.discogs_artist_views.search")
    def test_discogs_artist_search_returns_artists(self, mock_search):
        mock_search.return_value = Mock(
            status_code=200,
            json=lambda: {
                "results": [
                    {"type": "artist", "id": 99, "title": "Band", "thumb": "https://img.discogs.com/t.jpg"},
                ]
            },
        )
        res = self.client.get("/api/search/discogs-artist-search/", {"q": "Band"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        artists = res.json().get("artists", [])
        self.assertEqual(len(artists), 1)
        self.assertEqual(artists[0]["id"], 99)
        self.assertEqual(artists[0]["name"], "Band")
        mock_search.assert_called_once()
        _, kwargs = mock_search.call_args
        self.assertEqual(kwargs.get("per_page"), 100)

    @patch("musicdb.views.discogs_artist_views.search")
    def test_discogs_artist_search_includes_artists_without_thumb(self, mock_search):
        mock_search.return_value = Mock(
            status_code=200,
            json=lambda: {
                "results": [
                    {"type": "artist", "id": 1, "title": "No Thumb", "thumb": ""},
                    {"type": "artist", "id": 2, "title": "Has Thumb", "thumb": "https://img.discogs.com/x.jpg"},
                ]
            },
        )
        res = self.client.get("/api/search/discogs-artist-search/", {"q": "x"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        artists = res.json().get("artists", [])
        self.assertEqual(len(artists), 2)
        self.assertEqual(artists[0]["thumb"], "")
        self.assertEqual(artists[1]["thumb"], "https://img.discogs.com/x.jpg")

    @patch("musicdb.views.discogs_artist_views.get_artist")
    def test_discogs_artist_images_returns_images(self, mock_get):
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {
                "id": 42,
                "name": "Artist",
                "images": [
                    {"uri": "https://img.discogs.com/a.jpg", "width": 600, "type": "primary"},
                ],
            },
        )
        res = self.client.get("/api/search/discogs-artist-images/", {"discogs_artist_id": "42"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(len(body.get("images", [])), 1)
        self.assertEqual(body["images"][0]["url"], "https://img.discogs.com/a.jpg")
