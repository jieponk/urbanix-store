"""Matikan sumber Google News: isinya banyak berita HP/mobil dan link-nya tidak bisa dibaca isinya
(AI tidak punya bahan untuk menulis artikel). Bisa dinyalakan lagi di Seller Center bila perlu."""
from django.db import migrations


def matikan(apps, schema_editor):
    NewsSource = apps.get_model("store", "NewsSource")
    NewsSource.objects.filter(feed_url__contains="news.google.").update(is_active=False)


def nyalakan(apps, schema_editor):
    NewsSource = apps.get_model("store", "NewsSource")
    NewsSource.objects.filter(feed_url__contains="news.google.").update(is_active=True)


class Migration(migrations.Migration):
    dependencies = [("store", "0029_berita_lengkap_komentar")]
    operations = [migrations.RunPython(matikan, nyalakan)]
