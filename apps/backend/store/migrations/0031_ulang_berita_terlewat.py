"""Berita dari sumber langsung (bukan Google News) yang sempat ditandai "skip" diproses ulang:
sebagian terlewat hanya karena isi artikelnya gagal diambil, bukan karena bukan topik kamera."""
from django.db import migrations


def ulang(apps, schema_editor):
    NewsArticle = apps.get_model("store", "NewsArticle")
    NewsArticle.objects.filter(ai_status="skip").exclude(url__startswith="https://news.google.").update(ai_status="pending")


class Migration(migrations.Migration):
    dependencies = [("store", "0030_matikan_google_news")]
    operations = [migrations.RunPython(ulang, migrations.RunPython.noop)]
