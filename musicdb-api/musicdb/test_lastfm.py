from unittest.mock import Mock, patch

from django.test import TestCase

from .lastfm_client import get_artist_top_albums
from .views.common import merge_lastfm_popularity


class LastfmClientTests(TestCase):
    @patch("musicdb.lastfm_client.settings")
    def test_returns_none_when_api_key_missing(self, mock_settings):
        mock_settings.LASTFM_API_KEY = ""
        result = get_artist_top_albums("Pink Floyd")
        self.assertIsNone(result)

    @patch("musicdb.lastfm_client.requests.get")
    @patch("musicdb.lastfm_client.settings")
    def test_returns_albums_on_success(self, mock_settings, mock_get):
        mock_settings.LASTFM_API_KEY = "test-key"
        mock_get.return_value = Mock(
            status_code=200,
            json=Mock(return_value={
                "topalbums": {
                    "album": [
                        {
                            "name": "The Dark Side of the Moon",
                            "playcount": "500000",
                            "listeners": "300000",
                            "mbid": "rg-1",
                            "image": [
                                {"#text": "", "size": "small"},
                                {"#text": "https://img.example.com/large.jpg", "size": "large"},
                            ],
                        },
                        {
                            "name": "Wish You Were Here",
                            "playcount": "300000",
                            "listeners": "200000",
                            "mbid": "",
                            "image": [],
                        },
                        {
                            "name": "(null)",
                            "playcount": "100",
                            "mbid": "",
                        },
                    ]
                }
            }),
        )
        result = get_artist_top_albums("Pink Floyd")
        self.assertIsNotNone(result)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["name"], "The Dark Side of the Moon")
        self.assertEqual(result[0]["playcount"], 500000)
        self.assertEqual(result[0]["mbid"], "rg-1")
        self.assertEqual(result[0]["image_url"], "https://img.example.com/large.jpg")
        self.assertEqual(result[1]["name"], "Wish You Were Here")
        self.assertEqual(result[1]["mbid"], "")

    @patch("musicdb.lastfm_client.requests.get")
    @patch("musicdb.lastfm_client.settings")
    def test_returns_none_on_http_error(self, mock_settings, mock_get):
        mock_settings.LASTFM_API_KEY = "test-key"
        mock_get.return_value = Mock(status_code=500)
        result = get_artist_top_albums("Pink Floyd")
        self.assertIsNone(result)

    @patch("musicdb.lastfm_client.requests.get")
    @patch("musicdb.lastfm_client.settings")
    def test_returns_none_on_network_error(self, mock_settings, mock_get):
        mock_settings.LASTFM_API_KEY = "test-key"
        mock_get.side_effect = Exception("timeout")
        result = get_artist_top_albums("Pink Floyd")
        self.assertIsNone(result)


class MergeLastfmPopularityTests(TestCase):
    def test_returns_original_when_lastfm_is_none(self):
        mb = [{"id": "rg-1", "title": "Album A", "year": "2020"}]
        result = merge_lastfm_popularity(mb, None)
        self.assertEqual(result, mb)

    def test_matches_by_mbid(self):
        mb = [
            {"id": "rg-1", "title": "Album A", "year": "2020"},
            {"id": "rg-2", "title": "Album B", "year": "2010"},
        ]
        lfm = [
            {"name": "Album B", "mbid": "rg-2", "playcount": 5000, "listeners": 3000},
            {"name": "Album A", "mbid": "rg-1", "playcount": 10000, "listeners": 8000},
        ]
        result = merge_lastfm_popularity(mb, lfm)
        self.assertEqual(result[0]["id"], "rg-1")
        self.assertEqual(result[0]["playcount"], 10000)
        self.assertEqual(result[1]["id"], "rg-2")
        self.assertEqual(result[1]["playcount"], 5000)

    def test_matches_by_title_when_mbid_missing(self):
        mb = [{"id": "rg-1", "title": "The Wall", "year": "1979"}]
        lfm = [{"name": "The Wall", "mbid": "", "playcount": 9000, "listeners": 7000}]
        result = merge_lastfm_popularity(mb, lfm)
        self.assertEqual(result[0]["playcount"], 9000)

    def test_unmatched_albums_get_zero_playcount(self):
        mb = [
            {"id": "rg-1", "title": "Popular", "year": "2000"},
            {"id": "rg-2", "title": "Obscure", "year": "2005"},
        ]
        lfm = [{"name": "Popular", "mbid": "rg-1", "playcount": 1000, "listeners": 500}]
        result = merge_lastfm_popularity(mb, lfm)
        self.assertEqual(result[0]["id"], "rg-1")
        self.assertEqual(result[0]["playcount"], 1000)
        self.assertEqual(result[1]["id"], "rg-2")
        self.assertEqual(result[1]["playcount"], 0)
