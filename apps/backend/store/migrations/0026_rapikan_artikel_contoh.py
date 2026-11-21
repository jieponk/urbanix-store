"""Rapikan artikel contoh bawaan: artikel uji tampilan disembunyikan (jadi draf),
artikel sambutan tidak lagi disematkan supaya artikel terbaru yang jadi sorotan."""

from django.db import migrations


def forwards(apps, schema_editor):
    Article = apps.get_model("store", "Article")
    Article.objects.filter(slug="tes-tampilan-artikel", status="PUBLISHED").update(status="DRAFT")
    Article.objects.filter(slug="selamat-datang-di-inspirasi-urbanix").update(is_pinned=False)


class Migration(migrations.Migration):
    dependencies = [("store", "0025_berita_ai_teks_penuh")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
