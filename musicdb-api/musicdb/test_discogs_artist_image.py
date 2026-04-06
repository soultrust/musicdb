"""Unit tests for Discogs artist image fallback."""

from unittest.mock import Mock, patch

from django.test import TestCase

from musicdb.views.discogs_artist_image import discogs_artist_image_url


class DiscogsArtistImageUrlTests(TestCase):
    @patch("musicdb.views.discogs_artist_image.get_artist")
    def test_uses_discogs_id_from_musicbrainz_relation(self, mock_get_artist):
        mock_get_artist.return_value = Mock(
            status_code=200,
            json=lambda: {
                "images": [
                    {"type": "primary", "uri": "https://img.discogs.com/a.jpg"},
                ]
            },
        )
        artist_data = {
            "name": "Band",
            "relations": [
                {
                    "type": "discogs",
                    "url": {"resource": "https://www.discogs.com/artist/999-Band"},
                }
            ],
        }
        url = discogs_artist_image_url("Band", artist_data)
        self.assertEqual(url, "https://img.discogs.com/a.jpg")
        mock_get_artist.assert_called_once_with("999")

    @patch("musicdb.views.discogs_artist_image.get_artist")
    @patch("musicdb.views.discogs_artist_image.search")
    def test_search_exact_name_match_then_get_artist(self, mock_search, mock_get_artist):
        mock_search.return_value = Mock(
            status_code=200,
            json=lambda: {
                "results": [
                    {"type": "artist", "id": 42, "title": "Exact Name"},
                ]
            },
        )
        mock_get_artist.return_value = Mock(
            status_code=200,
            json=lambda: {
                "images": [{"uri": "https://img.discogs.com/b.jpg", "type": "secondary"}],
            },
        )
        url = discogs_artist_image_url("Exact Name", {})
        self.assertEqual(url, "https://img.discogs.com/b.jpg")
        mock_search.assert_called_once()
        mock_get_artist.assert_called_once_with(42)

    @patch("musicdb.views.discogs_artist_image.search")
    def test_returns_none_when_search_fails(self, mock_search):
        mock_search.return_value = Mock(status_code=500)
        self.assertIsNone(discogs_artist_image_url("X", {}))

    @patch("musicdb.views.discogs_artist_image.get_artist")
    @patch("musicdb.views.discogs_artist_image.search")
    def test_returns_none_when_no_exact_title_match(self, mock_search, mock_get_artist):
        mock_search.return_value = Mock(
            status_code=200,
            json=lambda: {
                "results": [
                    {"type": "artist", "id": 1, "title": "Different Artist"},
                ]
            },
        )
        self.assertIsNone(discogs_artist_image_url("Solo Act", {}))
        mock_get_artist.assert_not_called()
