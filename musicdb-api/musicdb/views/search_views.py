from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from spotify.client import artist_image_url_for_musicbrainz_name

from .. import musicbrainz_client as mb
from ..models import ArtistSpotifyImageLink, ConsumedAlbum
from .discogs_artist_image import discogs_artist_image_url
from .common import (
    _bad_request,
    build_artist_album_list_from_browse,
    build_artist_album_list_from_release_groups,
    _fetch_display_title_from_catalog,
    _normalize_mb_artist,
    _normalize_mb_recording,
    _normalize_mb_release,
    _parse_optional_int,
    _upstream_error,
    _validate_choice,
    _validate_required,
)


class SearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.GET.get("q", "").strip()
        required_error = _validate_required({"q": q})
        if required_error:
            return _bad_request("Missing query parameter: q")
        search_type = (request.GET.get("type") or "album").strip().lower()
        type_error = _validate_choice(search_type, ("artist", "album", "song"), "type")
        if type_error:
            return type_error
        page = max(1, int(request.GET.get("page", 1)))
        per_page = 100  # MusicBrainz search max per request
        offset = (page - 1) * per_page
        year = _parse_optional_int((request.GET.get("year") or "").strip())
        year_from = _parse_optional_int((request.GET.get("year_from") or "").strip())
        year_to = _parse_optional_int((request.GET.get("year_to") or "").strip())
        artist = (request.GET.get("artist") or "").strip() or None
        if search_type != "album":
            artist = None
        response, results = mb.search(
            q,
            search_type=search_type,
            limit=per_page,
            offset=offset,
            year=year,
            year_from=year_from,
            year_to=year_to,
            artist=artist,
        )
        if response.status_code != 200:
            return _upstream_error("MusicBrainz", response.status_code)
        return Response({"results": results})


@method_decorator(csrf_exempt, name="dispatch")
class ConsumedAlbumView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        required_error = _validate_required({"type": resource_type, "id": resource_id})
        if required_error:
            return _bad_request("Missing required parameters: type and id")
        type_error = _validate_choice(resource_type, ("release", "master"), "type")
        if type_error:
            return type_error
        record = ConsumedAlbum.objects.filter(
            user=request.user, type=resource_type, discogs_id=str(resource_id)
        ).first()
        return Response({"consumed": record.consumed if record else False})

    def _set_consumed(self, request):
        resource_type = request.query_params.get("type", "").strip().lower()
        resource_id = request.query_params.get("id", "").strip()
        required_error = _validate_required({"type": resource_type, "id": resource_id})
        if required_error:
            return _bad_request("Missing required parameters: type and id")
        type_error = _validate_choice(resource_type, ("release", "master"), "type")
        if type_error:
            return type_error
        try:
            consumed = request.data.get("consumed", True)
            if not isinstance(consumed, bool):
                consumed = bool(consumed)
            title = (request.data.get("title") or "").strip()
        except Exception:
            consumed = True
            title = ""
        if consumed:
            fetched = _fetch_display_title_from_catalog(resource_type, resource_id)
            if fetched:
                title = fetched
        record, _ = ConsumedAlbum.objects.update_or_create(
            user=request.user,
            type=resource_type,
            discogs_id=str(resource_id),
            defaults={"consumed": consumed, "title": title},
        )
        return Response({"consumed": record.consumed})

    def put(self, request):
        return self._set_consumed(request)

    def post(self, request):
        return self._set_consumed(request)


class ConsumedTitlesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        titles = list(
            ConsumedAlbum.objects.filter(user=request.user, consumed=True)
            .exclude(title="")
            .values_list("title", flat=True)
            .distinct()
        )
        return Response({"titles": titles})


class ConsumedListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        records = list(
            ConsumedAlbum.objects.filter(user=request.user, consumed=True).values("type", "discogs_id", "title")
        )
        results = []
        for r in records:
            tid = r["discogs_id"]
            id_val = int(tid) if tid.isdigit() else tid
            title = (r["title"] or "").strip() or f"({r['type']} #{tid})"
            results.append({"type": r["type"], "id": id_val, "title": title})
        return Response({"results": results})


class ConsumedBackfillView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        updated = 0
        for rec in ConsumedAlbum.objects.filter(user=request.user, consumed=True):
            fetched = _fetch_display_title_from_catalog(rec.type, rec.discogs_id)
            if fetched and (not (rec.title or "").strip() or " - " not in (rec.title or "")):
                rec.title = fetched
                rec.save(update_fields=["title"])
                updated += 1
        return Response({"updated": updated})


class DetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resource_type = request.GET.get("type", "").strip().lower()
        resource_id = (request.GET.get("id") or "").strip()
        required_error = _validate_required({"type": resource_type, "id": resource_id})
        if required_error:
            return _bad_request("Missing required parameters: type and id")
        type_error = _validate_choice(resource_type, ("artist", "album", "song"), "type")
        if type_error:
            return type_error
        if resource_type == "artist":
            response = mb.get_artist(resource_id)
            if response.status_code != 200:
                return _upstream_error("MusicBrainz", response.status_code)
            artist_data = response.json()
            albums = []
            rg_browse = mb.browse_release_groups_by_artist(resource_id)
            if rg_browse.status_code == 200:
                albums = build_artist_album_list_from_release_groups(rg_browse.json())
            normalized = _normalize_mb_artist(artist_data, albums=albums)
            if not normalized.get("thumb"):
                spotify_url = artist_image_url_for_musicbrainz_name(
                    normalized.get("title") or (artist_data.get("name") or "")
                )
                if spotify_url:
                    normalized["thumb"] = spotify_url
                    normalized["images"] = [{"uri": spotify_url}]
            if not normalized.get("thumb"):
                discogs_url = discogs_artist_image_url(
                    normalized.get("title") or (artist_data.get("name") or ""),
                    artist_data,
                )
                if discogs_url:
                    normalized["thumb"] = discogs_url
                    normalized["images"] = [{"uri": discogs_url}]
            link = ArtistSpotifyImageLink.objects.filter(
                user=request.user,
                musicbrainz_artist_id=resource_id,
            ).first()
            if link:
                normalized["thumb"] = link.image_url
                normalized["images"] = [{"uri": link.image_url}]
                normalized["manual_spotify_artist_image"] = True
            else:
                normalized["manual_spotify_artist_image"] = False
            return Response(normalized)
        if resource_type == "album":
            response = mb.get_release(resource_id)
            if response.status_code == 200:
                return Response(_normalize_mb_release(response.json()))
            # ID might be a release-group; find a release inside it
            rg_resp = mb.browse_releases_by_release_group(resource_id, limit=1)
            if rg_resp.status_code == 200:
                releases = (rg_resp.json() or {}).get("releases") or []
                if releases:
                    return Response(_normalize_mb_release(releases[0]))
            return _upstream_error("MusicBrainz", response.status_code)
        response = mb.get_recording(resource_id)
        if response.status_code != 200:
            return _upstream_error("MusicBrainz", response.status_code)
        return Response(_normalize_mb_recording(response.json()))
