
import json
import os
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from store.models import Category, Product


class Command(BaseCommand):
    help = "Impor 206 produk Shopee dari products_full.json"

    def handle(self, *args, **kwargs):
        base_dir = os.path.dirname(
            os.path.dirname(
                os.path.dirname(
                    os.path.dirname(os.path.abspath(__file__))
                )
            )
        )
        json_path = os.path.join(
            base_dir, "data", "products_full.json"
        )

        if not os.path.exists(json_path):
            raise CommandError(
                f"File data produk tidak ditemukan: {json_path}"
            )

        with open(json_path, "r", encoding="utf-8") as file:
            products_data = json.load(file)

        self.stdout.write(
            f"Mulai memproses {len(products_data)} produk..."
        )

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for item in products_data:
            name = str(item.get("name") or "").strip()
            product_id = item.get("id")
            variations = item.get("variations") or []

            if not name:
                self.stdout.write(
                    self.style.WARNING(
                        f"Produk ID {product_id}: nama kosong, dilewati."
                    )
                )
                skipped_count += 1
                continue

            # Ambil harga dari produk atau variasi pertamanya.
            raw_price = item.get("price")

            if raw_price in (None, "") and variations:
                raw_price = variations[0].get("price")

            if raw_price in (None, ""):
                self.stdout.write(
                    self.style.WARNING(
                        f"Harga '{name}' tidak ditemukan, dilewati."
                    )
                )
                skipped_count += 1
                continue

            try:
                price = Decimal(str(raw_price).replace(",", ""))

                if not price.is_finite() or price < 0:
                    raise InvalidOperation
            except (InvalidOperation, ValueError):
                self.stdout.write(
                    self.style.WARNING(
                        f"Harga '{name}' tidak valid: "
                        f"{raw_price!r}, dilewati."
                    )
                )
                skipped_count += 1
                continue

            # Pilih variasi pertama untuk SKU dan stok produk.
            first_variation = variations[0] if variations else {}

            sku = str(
                item.get("parent_sku")
                or first_variation.get("sku")
                or f"SHOPEE-{product_id}"
            ).strip()

            stock = first_variation.get(
                "stock", item.get("stock", 0)
            )

            try:
                stock = max(0, int(stock or 0))
            except (TypeError, ValueError):
                stock = 0

            cat_name = str(item.get("category") or "Umum").strip()
            cat_slug = slugify(cat_name) or "umum"

            # Buat kategori dengan slug unik.
            category_obj = Category.objects.filter(
                slug=cat_slug
            ).first()

            if category_obj is None:
                category_obj = Category.objects.create(
                    name=cat_name,
                    slug=cat_slug,
                    description="",
                )

            image_url = (
                item.get("cover_image")
                or item.get("image_url")
                or "https://via.placeholder.com/400x400?text=URBANIX+Product"
            )

            base_slug = slugify(name) or "produk"

            defaults = {
                "name": name,
                "slug": base_slug,
                "sku": sku,
                "description": item.get("description") or "",
                "category": category_obj,
                "price": price,
                "discount_price": None,
                "stock": stock,
                "image_url": image_url,
                "is_active": True,
            }

            try:
                with transaction.atomic():
                    # ID dari JSON dipakai sebagai identitas utama.
                    existing = None

                    if product_id is not None:
                        existing = Product.objects.filter(
                            pk=product_id
                        ).first()

                    if existing is not None:
                        for field, value in defaults.items():
                            setattr(existing, field, value)
                        existing.save()
                        created = False
                    else:
                        # Cegah konflik slug dan SKU.
                        if Product.objects.filter(
                            slug=base_slug
                        ).exists():
                            defaults["slug"] = (
                                f"{base_slug}-{product_id or sku.lower()}"
                            )

                        if Product.objects.filter(sku=sku).exists():
                            defaults["sku"] = f"{sku}-{product_id}"

                        if product_id is not None:
                            product_obj = Product(
                                id=product_id,
                                **defaults,
                            )
                            product_obj.save(force_insert=True)
                        else:
                            product_obj = Product.objects.create(
                                **defaults
                            )

                        created = True

                if created:
                    created_count += 1
                else:
                    updated_count += 1

            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(
                        f"Gagal memproses '{name}' "
                        f"(ID {product_id}): {exc}"
                    )
                )
                skipped_count += 1

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "IMPOR SELESAI\n"
                f"Produk baru : {created_count}\n"
                f"Diperbarui  : {updated_count}\n"
                f"Dilewati    : {skipped_count}"
            )
        )

        self.stdout.write(
            self.style.WARNING(
                "Catatan: harga dan stok yang disimpan pada Product "
                "berasal dari variasi pertama. Semua variasi belum "
                "disimpan terpisah karena model ProductVariation "
                "belum tersedia."
            )
        )
