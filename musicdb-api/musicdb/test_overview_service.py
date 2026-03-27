"""Unit tests for album overview fetching and the album-overview API."""

from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from musicdb.models import AlbumOverview
from musicdb.services.overview_service import (
    AlbumOverviewFetchOutcome,
    _extract_album_overview,
    fetch_album_overview_outcome,
)


def _ok_json_response(data):
    m = Mock()
    m.status_code = 200
    m.json = lambda: data
    m.raise_for_status = lambda: None
    return m


class OverviewServiceUnitTests(TestCase):
    """Mock HTTP; no external calls."""

    @patch("musicdb.services.overview_service.requests.get")
    def test_fetch_wikipedia_success(self, mock_get):
        long_intro = (
            "Nevermind is the second studio album by Nirvana, released in 1991 on DGC Records. "
            "It became a defining release for grunge and alternative rock. "
        )

        def get_side_effect(url, params=None, **kwargs):
            params = params or {}
            if params.get("list") == "search":
                return _ok_json_response({"query": {"search": [{"title": "Nevermind"}]}})
            if params.get("prop") == "extracts":
                return _ok_json_response(
                    {"query": {"pages": {"123": {"extract": long_intro + "\n\n== Reception ==\nCritics praised the record."}}}}
                )
            raise AssertionError(f"unexpected get params {params}")

        mock_get.side_effect = get_side_effect

        out = fetch_album_overview_outcome("Nirvana", "Nevermind", use_gemini=False)
        self.assertIsInstance(out, AlbumOverviewFetchOutcome)
        self.assertIsNotNone(out.overview_text)
        self.assertGreater(len(out.overview_text), 50)
        self.assertEqual(out.source, "wikipedia")
        self.assertIsNone(out.gemini_error)
        self.assertIsNone(out.wikipedia_error)

    @patch("musicdb.services.overview_service.requests.get")
    def test_fetch_wikipedia_no_article_sets_error(self, mock_get):
        mock_get.return_value = _ok_json_response({"query": {"search": []}})

        out = fetch_album_overview_outcome("Unknown", "Unknown Album Zzz", use_gemini=False)
        self.assertIsNone(out.overview_text)
        self.assertIsNone(out.source)
        self.assertIsNone(out.gemini_error)
        self.assertIsNotNone(out.wikipedia_error)
        self.assertIn("No Wikipedia article", out.wikipedia_error)

    def test_extract_prefers_intro_and_reception_sections(self):
        content = """First paragraph is long enough to qualify as overview body text here.

== Reception ==
The album received widespread critical acclaim and strong reviews from press.

== Track listing ==
A1 Song One
"""
        result = _extract_album_overview(content)
        self.assertIsNotNone(result)
        self.assertIn("Overview:", result)
        self.assertIn("Reception:", result)

    def test_extract_fallback_truncates_when_no_sections(self):
        plain = "x" * 200
        result = _extract_album_overview(plain)
        self.assertIsNotNone(result)
        self.assertIn("Overview:", result)


class AlbumOverviewAPITests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="overviewuser",
            email="overviewuser@example.com",
            password="password123",
        )
        refresh = RefreshToken.for_user(self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

    def test_requires_album_and_artist(self):
        res = self.client.get("/api/search/album-overview/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.get("/api/search/album-overview/", {"album": "x"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_returns_cached_row_without_fetching(self):
        AlbumOverview.objects.create(
            artist="Cached Artist",
            album="Cached Album",
            overview="From database cache.",
            source="wikipedia",
        )
        res = self.client.get(
            "/api/search/album-overview/",
            {"album": "Cached Album", "artist": "Cached Artist"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["source"], "cache")
        self.assertEqual(body["data"]["overview"], "From database cache.")

    @patch("musicdb.views.overview_views.fetch_album_overview_outcome")
    def test_miss_creates_overview_and_returns_200(self, mock_fetch):
        mock_fetch.return_value = AlbumOverviewFetchOutcome(
            overview_text="Fresh overview text " * 5,
            source="wikipedia",
            gemini_error=None,
            wikipedia_error=None,
        )
        res = self.client.get(
            "/api/search/album-overview/",
            {"album": "New LP", "artist": "New Artist"},
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        body = res.json()
        self.assertEqual(body["source"], "wikipedia")
        self.assertIn("Fresh overview", body["data"]["overview"])
        self.assertTrue(AlbumOverview.objects.filter(artist="New Artist", album="New LP").exists())

    @patch("musicdb.views.overview_views.fetch_album_overview_outcome")
    def test_fetch_failure_returns_503(self, mock_fetch):
        mock_fetch.return_value = AlbumOverviewFetchOutcome(
            overview_text=None,
            source=None,
            gemini_error=None,
            wikipedia_error="RuntimeError: nothing worked",
        )
        res = self.client.get(
            "/api/search/album-overview/",
            {"album": "Nope", "artist": "Nope"},
        )
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("error", res.json())
