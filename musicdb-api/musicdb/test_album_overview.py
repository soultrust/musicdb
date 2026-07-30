"""Tests for the album-overview endpoint (MusicBrainz release-group → Wikidata → Wikipedia)."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


def _mb_release_group_with_wikidata(entity_id="Q12345"):
    return {
        "id": "rg-mbid",
        "title": "OK Computer",
        "relations": [
            {
                "type": "wikidata",
                "url": {"resource": f"https://www.wikidata.org/wiki/{entity_id}"},
            }
        ],
    }


def _mb_release_group_no_wikidata():
    return {"id": "rg-mbid", "title": "Obscure Album", "relations": []}


class AlbumOverviewTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="albumoverviewuser",
            email="albumoverview@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_missing_mbid_returns_400(self):
        res = self.client.get("/api/search/album-overview/")
        self.assertEqual(res.status_code, 400)

    @patch("musicdb.views.artist_overview_views.mb.get_release_group")
    def test_upstream_error(self, mock_get):
        mock_get.return_value = Mock(status_code=503)
        res = self.client.get("/api/search/album-overview/", {"mbid": "abc"})
        self.assertEqual(res.status_code, 502)

    @patch("musicdb.views.artist_overview_views.mb.get_release_group")
    def test_no_wikidata_link_returns_null_overview(self, mock_get):
        mock_get.return_value = Mock(status_code=200, json=lambda: _mb_release_group_no_wikidata())
        res = self.client.get("/api/search/album-overview/", {"mbid": "abc"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIsNone(body["overview"])
        self.assertEqual(body["reason"], "no_wikidata_link")

    @patch("musicdb.views.artist_overview_views._wikipedia_extract")
    @patch("musicdb.views.artist_overview_views._wikipedia_title_from_wikidata")
    @patch("musicdb.views.artist_overview_views.mb.get_release_group")
    def test_full_chain_returns_overview(self, mock_mb, mock_wiki_title, mock_extract):
        mock_mb.return_value = Mock(status_code=200, json=lambda: _mb_release_group_with_wikidata())
        mock_wiki_title.return_value = "OK Computer"
        mock_extract.return_value = "OK Computer is the third studio album by the English rock band Radiohead."
        res = self.client.get("/api/search/album-overview/", {"mbid": "test-rg-mbid"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(
            res.json()["overview"],
            "OK Computer is the third studio album by the English rock band Radiohead.",
        )

    @patch("musicdb.views.artist_overview_views._wikipedia_title_from_wikidata")
    @patch("musicdb.views.artist_overview_views.mb.get_release_group")
    def test_no_wikipedia_article_returns_null(self, mock_mb, mock_wiki_title):
        mock_mb.return_value = Mock(status_code=200, json=lambda: _mb_release_group_with_wikidata())
        mock_wiki_title.return_value = None
        res = self.client.get("/api/search/album-overview/", {"mbid": "test-rg-mbid"})
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIsNone(body["overview"])
        self.assertEqual(body["reason"], "no_wikipedia_article")
