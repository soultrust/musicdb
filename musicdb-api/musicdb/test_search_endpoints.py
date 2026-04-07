from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from musicdb.models import ArtistSpotifyImageLink
from musicdb.views.common import _is_usable_artist_image_url


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
        mock_browse.json.return_value = {"release-groups": []}
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_release_groups_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name", return_value=None
        ), patch("musicdb.views.search_views.discogs_artist_image_url", return_value=None):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "artist-id"})
            self.assertEqual(res.status_code, 200)
            body = res.json()
            self.assertEqual(body.get("title"), "The Artist")
            self.assertEqual(body.get("albums"), [])
            self.assertIs(body.get("manual_spotify_artist_image"), False)

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
        mock_browse.json.return_value = {"release-groups": []}
        spotify_url = "https://i.scdn.co/image/abc123"
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_release_groups_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name",
            return_value=spotify_url,
        ) as mock_spotify_img, patch(
            "musicdb.views.search_views.discogs_artist_image_url", return_value=None
        ):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "mbid-1"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), spotify_url)
        self.assertEqual(body.get("images"), [{"uri": spotify_url}])
        mock_spotify_img.assert_called_once_with("Test Artist")
        self.assertIs(body.get("manual_spotify_artist_image"), False)

    def test_artist_detail_mb_image_skips_spotify(self):
        """Direct CDN / normal URLs are kept; Spotify is not called."""
        mb_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Direct.jpg/220px-Direct.jpg"
        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "Test Artist",
            "id": "mbid-1",
            "relations": [
                {
                    "type": "image",
                    "url": {"resource": mb_url},
                }
            ],
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"release-groups": []}
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_release_groups_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name"
        ) as mock_spotify_img, patch(
            "musicdb.views.search_views.discogs_artist_image_url", return_value=None
        ):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "mbid-1"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), mb_url)
        mock_spotify_img.assert_not_called()
        self.assertIs(body.get("manual_spotify_artist_image"), False)

    def test_artist_detail_commons_wiki_page_triggers_spotify_fallback(self):
        """Wikimedia Commons File: page URLs are HTML — ignore for thumb and use Spotify if available."""
        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "Pink Floyd",
            "id": "mbid-pf",
            "relations": [
                {
                    "type": "image",
                    "url": {
                        "resource": "https://commons.wikimedia.org/wiki/File:PinkFloyd1973_retouched.jpg",
                    },
                }
            ],
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"release-groups": []}
        spotify_url = "https://i.scdn.co/image/spotify123"
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_release_groups_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name",
            return_value=spotify_url,
        ) as mock_spotify_img, patch(
            "musicdb.views.search_views.discogs_artist_image_url", return_value=None
        ):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "mbid-pf"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), spotify_url)
        mock_spotify_img.assert_called_once_with("Pink Floyd")
        self.assertIs(body.get("manual_spotify_artist_image"), False)

    def test_artist_detail_manual_image_override_wins(self):
        user = get_user_model().objects.get(username="searchuser")
        mbid = "artist-id"
        override_url = "https://i.scdn.co/image/manual-chosen"
        ArtistSpotifyImageLink.objects.create(
            user=user,
            musicbrainz_artist_id=mbid,
            image_url=override_url,
            spotify_artist_id="sp1",
        )
        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "The Artist",
            "id": mbid,
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"release-groups": []}
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_release_groups_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name", return_value=None
        ), patch("musicdb.views.search_views.discogs_artist_image_url", return_value=None):
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": mbid})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), override_url)
        self.assertIs(body.get("manual_spotify_artist_image"), True)

    def test_artist_detail_discogs_fallback_when_mb_and_spotify_empty(self):
        mock_artist_res = Mock(status_code=200)
        mock_artist_res.json.return_value = {
            "name": "Discogs Only",
            "id": "mbid-dc",
        }
        mock_browse = Mock(status_code=200)
        mock_browse.json.return_value = {"release-groups": []}
        discogs_url = "https://img.discogs.com/primary.jpg"
        with patch("musicdb.views.search_views.mb.get_artist", return_value=mock_artist_res), patch(
            "musicdb.views.search_views.mb.browse_release_groups_by_artist", return_value=mock_browse
        ), patch(
            "musicdb.views.search_views.artist_image_url_for_musicbrainz_name", return_value=None
        ), patch(
            "musicdb.views.search_views.discogs_artist_image_url", return_value=discogs_url
        ) as mock_dc:
            res = self.client.get("/api/search/detail/", {"type": "artist", "id": "mbid-dc"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body.get("thumb"), discogs_url)
        self.assertEqual(body.get("images"), [{"uri": discogs_url}])
        mock_dc.assert_called_once()
        call_name, call_data = mock_dc.call_args[0]
        self.assertEqual(call_name, "Discogs Only")
        self.assertEqual(call_data["name"], "Discogs Only")


class ArtistImageUrlUsabilityTests(TestCase):
    """Unit tests for wiki-vs-direct URL heuristic."""

    def test_commons_file_page_not_usable(self):
        self.assertFalse(
            _is_usable_artist_image_url(
                "https://commons.wikimedia.org/wiki/File:PinkFloyd1973_retouched.jpg"
            )
        )

    def test_upload_wikimedia_usable(self):
        self.assertTrue(
            _is_usable_artist_image_url(
                "https://upload.wikimedia.org/wikipedia/commons/b/be/PinkFloyd1973_retouched.jpg"
            )
        )

    def test_wikipedia_article_not_usable(self):
        self.assertFalse(
            _is_usable_artist_image_url("https://en.wikipedia.org/wiki/Pink_Floyd")
        )

    def test_other_https_usable(self):
        self.assertTrue(_is_usable_artist_image_url("https://i.scdn.co/image/abc"))
