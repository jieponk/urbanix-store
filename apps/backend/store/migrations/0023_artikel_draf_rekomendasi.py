"""Masukkan 10 artikel rekomendasi (gaya santai) sebagai DRAF.

Isi artikel ada di store/content/artikel-draf/*.md (frontmatter + Markdown).
Hanya dibuat bila slug belum ada, jadi aman dijalankan ulang dan tidak
menimpa artikel yang sudah diedit di Seller Center.
"""

from pathlib import Path

from django.db import migrations

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
    for path in sorted(CONTENT_DIR.glob("*.md")):
        meta, body = parse(path.read_text(encoding="utf-8"))
        slug = meta.get("slug")
        if not slug or Article.objects.filter(slug=slug).exists():
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
            status="DRAFT",
        )
        ids = [int(x) for x in meta.get("products", "").replace(" ", "").split(",") if x.isdigit()]
        if ids:
            article.related_products.add(*Product.objects.filter(id__in=ids))


class Migration(migrations.Migration):
    dependencies = [("store", "0022_product_reviews")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
