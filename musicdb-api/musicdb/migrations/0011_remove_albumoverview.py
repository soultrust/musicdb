from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("musicdb", "0010_trackespeciallyliked"),
    ]

    operations = [
        migrations.DeleteModel(name="AlbumOverview"),
    ]
