from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from store.category_map import clean_category
from store.models import Category, Product


class Command(BaseCommand):
    help = (
        "Rapikan kategori lama (nama mentah Shopee) menjadi kategori utama "
        "yang bersih, tanpa perlu seed ulang."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Tampilkan rencana perubahan tanpa menyimpan apa pun.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        moved = 0

        for old in list(Category.objects.all()):
            clean_name = clean_category(old.name)
            clean_slug = slugify(clean_name) or "lainnya"

            if old.slug == clean_slug and old.name == clean_name:
                continue

            new, _ = Category.objects.get_or_create(
                slug=clean_slug, defaults={"name": clean_name}
            )
            if new.pk == old.pk:
                continue

            count = Product.objects.filter(category=old).count()
            self.stdout.write(f"{old.name!r} -> {clean_name!r} ({count} produk)")
            moved += count

            if not dry_run:
                Product.objects.filter(category=old).update(category=new)
                old.delete()

        if dry_run:
            transaction.set_rollback(True)
            self.stdout.write(self.style.WARNING("Dry run: tidak ada yang disimpan."))

        self.stdout.write(
            self.style.SUCCESS(
                f"Selesai. {moved} produk dipindahkan. "
                f"Kategori sekarang: {Category.objects.count()}"
            )
        )
