"""Tests for filtered studio-album list on artist detail."""

from django.test import TestCase

from .views.common import (
    ARTIST_STUDIO_ALBUMS_MAX,
    build_artist_album_list_from_release_groups,
)


class BuildArtistAlbumListTests(TestCase):
    def test_excludes_live_and_compilation_secondary_types(self):
        rg_data = {
            "release-groups": [
                {
                    "id": "rg-studio",
                    "title": "The Wall",
                    "first-release-date": "1979",
                    "primary-type": "Album",
                    "secondary-types": [],
                },
                {
                    "id": "rg-live",
                    "title": "Live at Wembley",
                    "first-release-date": "1980",
                    "primary-type": "Album",
                    "secondary-types": ["Live"],
                },
                {
                    "id": "rg-comp",
                    "title": "Hits",
                    "first-release-date": "2000",
                    "primary-type": "Album",
                    "secondary-types": ["Compilation"],
                },
            ]
        }
        rows = build_artist_album_list_from_release_groups(rg_data)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["id"], "rg-studio")
        self.assertEqual(rows[0]["title"], "The Wall")

    def test_sorted_newest_first(self):
        rg_data = {
            "release-groups": [
                {"id": "a", "title": "Old", "first-release-date": "1970", "secondary-types": []},
                {"id": "b", "title": "New", "first-release-date": "1990", "secondary-types": []},
            ]
        }
        rows = build_artist_album_list_from_release_groups(rg_data)
        self.assertEqual([r["id"] for r in rows], ["b", "a"])

    def test_respects_max_albums_cap(self):
        rgs = [
            {
                "id": f"rg-{i}",
                "title": f"Album {i}",
                "first-release-date": str(2000 + i),
                "secondary-types": [],
            }
            for i in range(60)
        ]
        rows = build_artist_album_list_from_release_groups(
            {"release-groups": rgs}, max_albums=10
        )
        self.assertEqual(len(rows), 10)
        self.assertEqual(rows[0]["year"], "2059")

    def test_default_max_constant(self):
        self.assertEqual(ARTIST_STUDIO_ALBUMS_MAX, 50)
