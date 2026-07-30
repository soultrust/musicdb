"""Tests for MusicBrainz band-member extraction."""

from django.test import SimpleTestCase

from musicdb.views.common import build_artist_members_from_relations


class BuildArtistMembersTests(SimpleTestCase):
    def test_extracts_backward_members_with_instruments(self):
        data = {
            "relations": [
                {
                    "type": "member of band",
                    "direction": "backward",
                    "begin": "1960",
                    "end": "1970-04-10",
                    "ended": True,
                    "attributes": ["bass guitar", "lead vocals", "original"],
                    "artist": {
                        "id": "paul-id",
                        "name": "Paul McCartney",
                    },
                },
                {
                    "type": "member of band",
                    "direction": "backward",
                    "begin": "1962",
                    "end": None,
                    "ended": False,
                    "attributes": ["drums (drum set)"],
                    "artist": {"id": "ringo-id", "name": "Ringo Starr"},
                },
                {
                    # Person's membership in another band — ignore on this artist page
                    "type": "member of band",
                    "direction": "forward",
                    "attributes": ["guitar"],
                    "artist": {"id": "other-band", "name": "Other Band"},
                },
                {
                    "type": "tribute",
                    "direction": "forward",
                    "artist": {"id": "tribute-id", "name": "Tribute Act"},
                },
            ]
        }
        members = build_artist_members_from_relations(data)
        self.assertEqual(len(members), 2)
        # Current (not ended) before past, even if begin is later
        self.assertEqual(members[0]["id"], "ringo-id")
        self.assertEqual(members[0]["instruments"], ["drums (drum set)"])
        self.assertFalse(members[0]["ended"])
        self.assertEqual(members[1]["id"], "paul-id")
        self.assertEqual(members[1]["instruments"], ["bass guitar", "lead vocals"])
        self.assertTrue(members[1]["original"])
        self.assertTrue(members[1]["ended"])

    def test_empty_when_no_member_relations(self):
        self.assertEqual(build_artist_members_from_relations({"relations": []}), [])
        self.assertEqual(build_artist_members_from_relations({}), [])
