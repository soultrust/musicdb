"""
Tests for the Discogs API client. Require DISCOGS_USER_AGENT (and optionally
DISCOGS_TOKEN) in .env. Hit the real Discogs API (integration tests).
"""
import unittest

from django.conf import settings
from django.test import TestCase

from discogs.client import get_api_root, search


class DiscogsClientIntegrationTests(TestCase):
    """Integration tests: real HTTP calls to api.discogs.com."""

    @unittest.skipIf(
        not getattr(settings, "DISCOGS_USER_AGENT", None),
        "DISCOGS_USER_AGENT not set in .env",
    )
    def test_get_api_root_returns_200_and_welcome_message(self):
        """Client and credentials work: API root returns success and expected shape."""
        response = get_api_root()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("hello", data)
        self.assertIn("api_version", data)
        self.assertEqual(data["api_version"], "v2")

    @unittest.skipIf(
        not getattr(settings, "DISCOGS_USER_AGENT", None),
        "DISCOGS_USER_AGENT not set in .env",
    )
    def test_search_returns_200_and_paginated_results(self):
        """Search returns success and has pagination + results list."""
        response = search("nevermind")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("pagination", data)
        self.assertIsInstance(data["results"], list)
        pagination = data["pagination"]
        self.assertIn("page", pagination)
        self.assertIn("per_page", pagination)
        self.assertIn("items", pagination)

    @unittest.skipIf(
        not getattr(settings, "DISCOGS_USER_AGENT", None),
        "DISCOGS_USER_AGENT not set in .env",
    )
    def test_search_respects_per_page(self):
        """Search accepts per_page and returns at most that many results."""
        response = search("nirvana", per_page=3)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertLessEqual(len(data["results"]), 3)
        self.assertEqual(data["pagination"]["per_page"], 3)
