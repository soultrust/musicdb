# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("discogs", "0001_album_overview"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConsumedAlbum",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("type", models.CharField(max_length=20)),
                ("discogs_id", models.CharField(max_length=32)),
                ("consumed", models.BooleanField(default=True)),
            ],
            options={
                "ordering": ["-id"],
                "unique_together": {("type", "discogs_id")},
            },
        ),
    ]
