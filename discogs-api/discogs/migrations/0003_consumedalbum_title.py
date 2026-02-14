# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("discogs", "0002_add_consumed_album"),
    ]

    operations = [
        migrations.AddField(
            model_name="consumedalbum",
            name="title",
            field=models.CharField(blank=True, max_length=512),
        ),
    ]
