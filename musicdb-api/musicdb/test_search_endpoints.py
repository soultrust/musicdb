from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class SearchEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="searchuser",
            email="searchuser@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_search_validation_and_success(self):
        res = self.client.get("/api/search/")
        self.assertEqual(res.status_code, 400)

        res = self.client.get("/api/search/", {"q": "test", "type": "invalid"})
        self.assertEqual(res.status_code, 400)

        with patch("musicdb.views.search_views.mb.search") as mock_search:
            mock_search.return_value = (
                Mock(status_code=200),
                [{"type": "album", "id": "r1", "title": "Album 1"}],
            )
            res = self.client.get(
                "/api/search/",
                {"q": "test", "type": "album", "year": "not-a-year", "year_from": "x", "year_to": "y"},
            )
            self.assertEqual(res.status_code, 200)
            body = res.json()
            self.assertEqual(len(body.get("results", [])), 1)
            _, kwargs = mock_search.call_args
            self.assertIsNone(kwargs.get("year"))
            self.assertIsNone(kwargs.get("year_from"))
            self.assertIsNone(kwargs.get("year_to"))

    def test_search_upstream_error_maps_to_502(self):
        with patch("musicdb.views.search_views.mb.search") as mock_search:
            mock_search.return_value = (Mock(status_code=503), [])
            res = self.client.get("/api/search/", {"q": "test", "type": "album"})
            self.assertEqual(res.status_code, 502)

    def test_detail_validation_and_upstream_mapping(self):
        res = self.client.get("/api/search/detail/")
        self.assertEqual(res.status_code, 400)

        res = self.client.get("/api/search/detail/", {"type": "invalid", "id": "abc"})
        self.assertEqual(res.status_code, 400)

        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "The Artist",
            "id": "artist-id",
            "disambiguation": "",
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"releases": []}
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_releases_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name", return_value=None
        ):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "artist-id"})
            self.assertEqual(res.status_code, 200)
            body = res.json()
            self.assertEqual(body.get("title"), "The Artist")
            self.assertEqual(body.get("albums"), [])

        with patch("musicdb.views.search_views.mb.get_artist", return_value=Mock(status_code=500)):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "artist-id"})
            self.assertEqual(res.status_code, 502)

    def test_artist_detail_spotify_fallback_fills_thumb_when_mb_has_no_image(self):
        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "Test Artist",
            "id": "mbid-1",
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"releases": []}
        spotify_url = "https://i.scdn.co/image/abc123"
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_releases_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name",
            return_value=spotify_url,
        ) as mock_spotify_img:
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "mbid-1"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), spotify_url)
        self.assertEqual(body.get("images"), [{"uri": spotify_url}])
        mock_spotify_img.assert_called_once_with("Test Artist")

    def test_artist_detail_mb_image_skips_spotify(self):
        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "Test Artist",
            "id": "mbid-1",
            "relations": [
                {
                    "type": "image",
                    "url": {"resource": "https://commons.wikimedia.org/wiki/File:Photo.jpg"},
                }
            ],
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"releases": []}
        mb_url = "https://commons.wikimedia.org/wiki/File:Photo.jpg"
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_releases_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name"
        ) as mock_spotify_img:
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "mbid-1"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), mb_url)
        mock_spotify_img.assert_not_called()
