"""
Isi stok semua produk & varian sekaligus (untuk masa awal, saat stok dikonfirmasi manual lewat WhatsApp).

Contoh (PowerShell, di folder apps/backend dengan venv aktif):
    python manage.py isi_stok                     # semua varian/produk jadi 10
    python manage.py isi_stok --jumlah 5          # semua jadi 5
    python manage.py isi_stok --hanya-kosong      # hanya yang stoknya 0
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from store.models import Product, ProductVariation


class Command(BaseCommand):
    help = "Isi stok semua produk dan varian dengan jumlah yang sama."

    def add_arguments(self, parser):
        parser.add_argument("--jumlah", type=int, default=10, help="Stok per varian/produk (default 10).")
        parser.add_argument(
            "--hanya-kosong",
            action="store_true",
            help="Hanya ubah yang stoknya 0; stok yang sudah terisi dibiarkan.",
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        jumlah = max(0, opts["jumlah"])
        variations = ProductVariation.objects.all()
        plain = Product.objects.filter(variations__isnull=True)
        if opts["hanya_kosong"]:
            variations = variations.filter(stock=0)
            plain = plain.filter(stock=0)

        n_var = variations.update(stock=jumlah)
        n_plain = plain.update(stock=jumlah)
        for product in Product.objects.filter(variations__isnull=False).distinct():
            product.sync_stock_from_variations()

        self.stdout.write(
            self.style.SUCCESS(
                f"Selesai: {n_var} varian dan {n_plain} produk tanpa varian diisi stok {jumlah}."
            )
        )
