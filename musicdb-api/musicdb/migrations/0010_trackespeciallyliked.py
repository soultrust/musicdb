from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("musicdb", "0009_track_spotify_link"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TrackEspeciallyLiked",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_type", models.CharField(max_length=20)),
                ("item_id", models.CharField(max_length=64)),
                ("track_position", models.CharField(blank=True, max_length=32)),
                ("track_title", models.CharField(max_length=512)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="especially_liked_tracks",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["item_type", "item_id", "track_position", "track_title"],
                "unique_together": {("user", "item_type", "item_id", "track_position", "track_title")},
            },
        ),
    ]
