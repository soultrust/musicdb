from rest_framework import serializers

from .models import List


class ListCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=512)
    list_type = serializers.ChoiceField(
        choices=[List.LIST_TYPE_RELEASE, List.LIST_TYPE_PERSON],
        default=List.LIST_TYPE_RELEASE,
    )

    def validate_name(self, value):
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("List name is required")
        return name


class ListItemsWriteSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["release", "master", "album"])
    id = serializers.CharField()
    list_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=True)
    title = serializers.CharField(required=False, allow_blank=True, default="")


class SpotifyTrackNestedSerializer(serializers.Serializer):
    id = serializers.CharField()
    uri = serializers.CharField(required=False, allow_blank=True, default="")
    name = serializers.CharField(required=False, allow_blank=True, default="")
    artists = serializers.ListField(required=False, default=list)


class ManualSpotifyMatchSerializer(serializers.Serializer):
    release_id = serializers.CharField()
    track_title = serializers.CharField()
    spotify_track = SpotifyTrackNestedSerializer()

    def validate_release_id(self, value):
        rid = (value or "").strip()
        if not rid:
            raise serializers.ValidationError("This field may not be blank.")
        return rid

    def validate_track_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("This field may not be blank.")
        return title


class EspeciallyLikedTrackWriteSerializer(serializers.Serializer):
    item_type = serializers.ChoiceField(choices=["release", "master", "album"])
    item_id = serializers.CharField()
    track_title = serializers.CharField()
    track_position = serializers.CharField(required=False, allow_blank=True, default="")
    especially_liked = serializers.BooleanField(required=False, default=False)

    def validate_item_id(self, value):
        iid = (value or "").strip()
        if not iid:
            raise serializers.ValidationError("This field may not be blank.")
        return iid

    def validate_track_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("This field may not be blank.")
        return title
