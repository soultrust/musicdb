from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import TrackEspeciallyLiked
from ..serializers import EspeciallyLikedTrackWriteSerializer
from .common import _validate_choice, _validate_required, _validation_error_response


class EspeciallyLikedTracksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        item_type = (request.GET.get("item_type") or "").strip().lower()
        item_id = (request.GET.get("item_id") or "").strip()
        required_error = _validate_required({"item_type": item_type, "item_id": item_id})
        if required_error:
            return required_error
        type_error = _validate_choice(item_type, ("release", "master", "album"), "item_type")
        if type_error:
            return type_error
        rows = TrackEspeciallyLiked.objects.filter(user=request.user, item_type=item_type, item_id=item_id)
        tracks = [{"track_title": row.track_title, "track_position": row.track_position} for row in rows]
        return Response({"tracks": tracks})


class EspeciallyLikedTrackView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ser = EspeciallyLikedTrackWriteSerializer(data=request.data)
        if not ser.is_valid():
            return _validation_error_response(ser)
        item_type = ser.validated_data["item_type"]
        item_id = ser.validated_data["item_id"]
        track_title = ser.validated_data["track_title"]
        track_position = str(ser.validated_data.get("track_position") or "").strip()
        especially_liked = ser.validated_data["especially_liked"]

        query = {
            "user": request.user,
            "item_type": item_type,
            "item_id": item_id,
            "track_position": track_position[:32],
            "track_title": track_title[:512],
        }
        if especially_liked:
            TrackEspeciallyLiked.objects.update_or_create(**query, defaults={})
        else:
            TrackEspeciallyLiked.objects.filter(**query).delete()
        return Response({"ok": True, "especially_liked": especially_liked})
