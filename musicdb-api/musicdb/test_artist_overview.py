"""Tests for the artist-overview endpoint (MusicBrainz → Wikidata → Wikipedia)."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def _mb_artist_with_wikidata(entity_id="Q188668"):
    return {
        "id": "8ed2e0b3-aa4c-4e13-bec3-dc7e9ba1a234",
        "name": "Thom Yorke",
        "relations": [
            {
                "type": "wikidata",
                "url": {"resource": f"https://www.wikidata.org/wiki/{entity_id}"},
            },
        ],
    }


def _mb_artist_no_wikidata():
    return {
        "id": "00000000-0000-0000-0000-000000000000",
        "name": "Obscure Artist",
        "relations": [
            {"type": "image", "url": {"resource": "https://upload.wikimedia.org/img.jpg"}},
        ],
    }


class ArtistOverviewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="overviewuser",
            email="overview@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_missing_mbid_returns_400(self):
        res = self.client.get("/api/search/artist-overview/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("musicdb.views.artist_overview_views.mb.get_artist")
    def test_musicbrainz_error_returns_502(self, mock_get):
        mock_get.return_value = Mock(status_code=503)
        res = self.client.get("/api/search/artist-overview/", {"mbid": "abc"})
        self.assertEqual(res.status_code, status.HTTP_502_BAD_GATEWAY)

    @patch("musicdb.views.artist_overview_views.mb.get_artist")
    def test_no_wikidata_link_returns_null_overview(self, mock_get):
        mock_get.return_value = Mock(status_code=200, json=lambda: _mb_artist_no_wikidata())
        res = self.client.get("/api/search/artist-overview/", {"mbid": "abc"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertIsNone(body["overview"])
        self.assertEqual(body["reason"], "no_wikidata_link")

    @patch("musicdb.views.artist_overview_views._wikipedia_extract")
    @patch("musicdb.views.artist_overview_views._wikipedia_title_from_wikidata")
    @patch("musicdb.views.artist_overview_views.mb.get_artist")
    def test_full_chain_returns_overview(self, mock_mb, mock_wiki_title, mock_extract):
        mock_mb.return_value = Mock(status_code=200, json=lambda: _mb_artist_with_wikidata())
        mock_wiki_title.return_value = "Thom Yorke"
        mock_extract.return_value = "Thomas Edward Yorke is an English musician."
        res = self.client.get("/api/search/artist-overview/", {"mbid": "test-mbid"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["overview"], "Thomas Edward Yorke is an English musician.")
        mock_wiki_title.assert_called_once_with("Q188668")
        mock_extract.assert_called_once_with("Thom Yorke")

    @patch("musicdb.views.artist_overview_views._wikipedia_title_from_wikidata")
    @patch("musicdb.views.artist_overview_views.mb.get_artist")
    def test_no_wikipedia_article_returns_null(self, mock_mb, mock_wiki_title):
        mock_mb.return_value = Mock(status_code=200, json=lambda: _mb_artist_with_wikidata())
        mock_wiki_title.return_value = None
        res = self.client.get("/api/search/artist-overview/", {"mbid": "test-mbid"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertIsNone(body["overview"])
        self.assertEqual(body["reason"], "no_wikipedia_article")

    @patch("musicdb.views.artist_overview_views._wikipedia_extract")
    @patch("musicdb.views.artist_overview_views._wikipedia_title_from_wikidata")
    @patch("musicdb.views.artist_overview_views.mb.get_artist")
    def test_empty_extract_returns_null(self, mock_mb, mock_wiki_title, mock_extract):
        mock_mb.return_value = Mock(status_code=200, json=lambda: _mb_artist_with_wikidata())
        mock_wiki_title.return_value = "Thom Yorke"
        mock_extract.return_value = None
        res = self.client.get("/api/search/artist-overview/", {"mbid": "test-mbid"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertIsNone(body["overview"])
        self.assertEqual(body["reason"], "empty_extract")
