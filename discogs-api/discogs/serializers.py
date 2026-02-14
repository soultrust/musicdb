from rest_framework import serializers
from .models import AlbumOverview

class AlbumOverviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlbumOverview
        fields = ['id', 'artist', 'album', 'overview', 'source', 'created_at', 'updated_at']