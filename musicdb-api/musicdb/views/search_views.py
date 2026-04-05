import json
import time

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .. import musicbrainz_client as mb
from ..models import ConsumedAlbum
from .common import (
    _bad_request,
    _build_artist_albums_from_browse,
    _fetch_display_title_from_catalog,
    _normalize_mb_artist,
    _normalize_mb_recording,
    _normalize_mb_release,
    _parse_optional_int,
    _upstream_error,
    _validate_choice,
    _validate_required,
)

_DEBUG_LOG_PATH = "/Users/soultrust/dev/personal-projects/musicdb/.cursor/debug-c43793.log"


def _agent_debug_log(location, message, data, hypothesis_id="A"):
    # region agent log
    try:
        line = (
            json.dumps(
                {
                    "sessionId": "c43793",
                    "location": location,
                    "message": message,
                    "data": data,
                    "timestamp": int(time.time() * 1000),
                    "hypothesisId": hypothesis_id,
                }
            )
            + "\n"
        )
        with open(_DEBUG_LOG_PATH, "a", encoding="utf-8") as _f:
            _f.write(line)
    except Exception:
        pass
    # endregion


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
        per_page = 20
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
            # region agent log
            t_artist0 = time.perf_counter()
            _agent_debug_log(
                "search_views.DetailAPIView.get",
                "artist_detail_start",
                {"artist_id": resource_id},
                "B",
            )
            # endregion
            response = mb.get_artist(resource_id)
            # region agent log
            t_after_ga = time.perf_counter()
            _agent_debug_log(
                "search_views.DetailAPIView.get",
                "after_get_artist",
                {
                    "status": response.status_code,
                    "ms": round((t_after_ga - t_artist0) * 1000, 2),
                },
                "B",
            )
            # endregion
            if response.status_code != 200:
                return _upstream_error("MusicBrainz", response.status_code)
            artist_data = response.json()
            albums = []
            browse = mb.browse_releases_by_artist(resource_id)
            # region agent log
            t_after_br = time.perf_counter()
            br_payload = browse.json() if browse.status_code == 200 else {}
            _agent_debug_log(
                "search_views.DetailAPIView.get",
                "after_browse_releases",
                {
                    "status": browse.status_code,
                    "ms": round((t_after_br - t_after_ga) * 1000, 2),
                    "raw_release_count": len((br_payload.get("releases") or [])),
                },
                "B",
            )
            # endregion
            if browse.status_code == 200:
                # region agent log
                t_build0 = time.perf_counter()
                # endregion
                albums = _build_artist_albums_from_browse(br_payload)
                # region agent log
                t_build1 = time.perf_counter()
                _agent_debug_log(
                    "search_views.DetailAPIView.get",
                    "after_build_artist_albums",
                    {
                        "ms": round((t_build1 - t_build0) * 1000, 2),
                        "albums_len": len(albums),
                    },
                    "A",
                )
                # endregion
            # region agent log
            t_done = time.perf_counter()
            _agent_debug_log(
                "search_views.DetailAPIView.get",
                "artist_detail_total_ms",
                {"ms": round((t_done - t_artist0) * 1000, 2)},
                "A",
            )
            # endregion
            return Response(_normalize_mb_artist(artist_data, albums=albums))
        if resource_type == "album":
            response = mb.get_release(resource_id)
            if response.status_code != 200:
                return _upstream_error("MusicBrainz", response.status_code)
            return Response(_normalize_mb_release(response.json()))
        response = mb.get_recording(resource_id)
        if response.status_code != 200:
            return _upstream_error("MusicBrainz", response.status_code)
        return Response(_normalize_mb_recording(response.json()))
