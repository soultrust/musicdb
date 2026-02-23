# Generated manually to fix "value too long for type character varying(32)"
# when adding MusicBrainz albums (UUIDs are 36 chars) to lists.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("musicdb", "0007_add_list_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="consumedalbum",
            name="discogs_id",
            field=models.CharField(max_length=64),
        ),
        migrations.AlterField(
            model_name="listitem",
            name="discogs_id",
            field=models.CharField(max_length=64),
        ),
    ]
