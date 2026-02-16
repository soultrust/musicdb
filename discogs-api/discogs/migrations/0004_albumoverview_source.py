# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('discogs', '0003_consumedalbum_title'),
    ]

    operations = [
        migrations.AddField(
            model_name='albumoverview',
            name='source',
            field=models.CharField(default='unknown', max_length=50),
        ),
    ]
