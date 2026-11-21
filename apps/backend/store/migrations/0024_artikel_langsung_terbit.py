"""Terbitkan artikel rekomendasi langsung (bukan draf) + artikel baru dari folder.

- Artikel dari store/content/artikel-draf/*.md yang belum ada → dibuat & langsung TERBIT.
- Yang sudah dibuat sebagai DRAF oleh 0023 → diubah jadi TERBIT.
  Artikel yang sudah diterbitkan/diedit manual tidak disentuh selain status draf.
"""

from datetime import timedelta
from pathlib import Path

from django.db import migrations
from django.utils import timezone

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content" / "artikel-draf"

CATEGORY_NAMES = {
    "tips-tutorial": "Tips & Tutorial",
    "panduan-beli": "Panduan Beli",
    "review": "Review",
    "promo-event": "Promo & Event",
}


def parse(text):
    meta, body = {}, text
    if text.startswith("---"):
        _, head, body = text.split("---", 2)
        for line in head.strip().splitlines():
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, body.strip() + "\n"


def forwards(apps, schema_editor):
    Category = apps.get_model("store", "ArticleCategory")
    Article = apps.get_model("store", "Article")
    Product = apps.get_model("store", "Product")

    if not CONTENT_DIR.exists():
        return
    now = timezone.now()
    files = sorted(CONTENT_DIR.glob("*.md"))
    # File terakhir (paling baru) tampil paling atas.
    for i, path in enumerate(files):
        published_at = now - timedelta(minutes=len(files) - i)
        meta, body = parse(path.read_text(encoding="utf-8"))
        slug = meta.get("slug")
        if not slug:
            continue
        article = Article.objects.filter(slug=slug).first()
        if article:
            if article.status == "DRAFT":
                article.status = "PUBLISHED"
                article.published_at = article.published_at or published_at
                article.save(update_fields=["status", "published_at"])
            continue
        cat_slug = meta.get("category", "tips-tutorial")
        category, _ = Category.objects.get_or_create(
            slug=cat_slug, defaults={"name": CATEGORY_NAMES.get(cat_slug, cat_slug.title())}
        )
        article = Article.objects.create(
            title=meta.get("title", slug)[:160],
            slug=slug,
            excerpt=meta.get("excerpt", "")[:300],
            body=body,
            category=category,
            tags=meta.get("tags", ""),
            status="PUBLISHED",
            published_at=published_at,
        )
        ids = [int(x) for x in meta.get("products", "").replace(" ", "").split(",") if x.isdigit()]
        if ids:
            article.related_products.add(*Product.objects.filter(id__in=ids))


class Migration(migrations.Migration):
    dependencies = [("store", "0023_artikel_draf_rekomendasi")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
