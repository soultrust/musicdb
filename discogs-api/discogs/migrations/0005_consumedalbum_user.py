# Generated migration: add user FK to ConsumedAlbum for per-user consumed list

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("discogs", "0004_albumoverview_source"),
    ]

    operations = [
        migrations.AddField(
            model_name="consumedalbum",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.CASCADE,
                related_name="consumed_albums",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterUniqueTogether(
            name="consumedalbum",
            unique_together={("user", "type", "discogs_id")},
        ),
    ]
