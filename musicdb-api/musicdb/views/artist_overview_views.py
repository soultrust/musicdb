"""
Artist overview text via MusicBrainz → Wikidata → Wikipedia.

Chain:
  1. GET MusicBrainz artist (url-rels) to find the Wikidata relation
  2. GET Wikidata entity sitelinks to find the English Wikipedia article title
  3. GET Wikipedia extracts API for a clean plaintext introduction
"""

import logging
import re

import requests
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .. import musicbrainz_client as mb
from .common import _bad_request, _upstream_error

logger = logging.getLogger(__name__)

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"

_WIKIDATA_ENTITY_RE = re.compile(r"(Q\d+)")


def _extract_wikidata_id(artist_data: dict) -> str | None:
    """Pull the Wikidata entity ID (e.g. Q188668) from MusicBrainz url-rels."""
    for rel in artist_data.get("relations") or []:
        if rel.get("type") != "wikidata":
            continue
        url = (rel.get("url") or {}).get("resource") or ""
        m = _WIKIDATA_ENTITY_RE.search(url)
        if m:
            return m.group(1)
    return None


def _wikipedia_title_from_wikidata(entity_id: str) -> str | None:
    """Resolve a Wikidata entity ID to the English Wikipedia article title."""
    resp = requests.get(
        WIKIDATA_API,
        params={
            "action": "wbgetentities",
            "ids": entity_id,
            "props": "sitelinks",
            "sitefilter": "enwiki",
            "format": "json",
        },
        headers={"User-Agent": "SoulTrustMusicDB/1.0"},
        timeout=10,
    )
    if resp.status_code != 200:
        return None
    entity = resp.json().get("entities", {}).get(entity_id, {})
    return entity.get("sitelinks", {}).get("enwiki", {}).get("title") or None


def _wikipedia_extract(title: str) -> str | None:
    """Fetch the introductory plaintext extract from English Wikipedia."""
    resp = requests.get(
        WIKIPEDIA_API,
        params={
            "action": "query",
            "titles": title,
            "prop": "extracts",
            "exintro": "1",
            "explaintext": "1",
            "format": "json",
        },
        headers={"User-Agent": "SoulTrustMusicDB/1.0"},
        timeout=10,
    )
    if resp.status_code != 200:
        return None
    pages = resp.json().get("query", {}).get("pages", {})
    for page in pages.values():
        extract = (page.get("extract") or "").strip()
        if extract:
            return extract
    return None


class ArtistOverviewView(APIView):
    """GET ?mbid=<musicbrainz-artist-id> → {overview: "..."}"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        mbid = (request.GET.get("mbid") or "").strip()
        if not mbid:
            return _bad_request("Missing required parameter: mbid")

        artist_resp = mb.get_artist(mbid)
        if artist_resp.status_code != 200:
            return _upstream_error("MusicBrainz", artist_resp.status_code)
        artist_data = artist_resp.json()

        wikidata_id = _extract_wikidata_id(artist_data)
        if not wikidata_id:
            return Response({"overview": None, "reason": "no_wikidata_link"})

        wiki_title = _wikipedia_title_from_wikidata(wikidata_id)
        if not wiki_title:
            return Response({"overview": None, "reason": "no_wikipedia_article"})

        extract = _wikipedia_extract(wiki_title)
        if not extract:
            return Response({"overview": None, "reason": "empty_extract"})

        return Response({"overview": extract})
