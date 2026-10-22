
import json
import os
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from store.models import Category, Product, ProductVariation


class Command(BaseCommand):
    help = "Impor produk dan variasi Shopee dari products_full.json"

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
                f"File JSON tidak ditemukan: {json_path}"
            )

        with open(json_path, "r", encoding="utf-8") as file:
            products_data = json.load(file)

        product_created = 0
        product_updated = 0
        variation_created = 0
        variation_updated = 0
        variation_skipped = 0

        self.stdout.write(
            f"Memproses {len(products_data)} produk Shopee..."
        )

        for item in products_data:
            product_id = item.get("id")
            name = (item.get("name") or "").strip()
            variations = item.get("variations") or []

            if not name:
                variation_skipped += len(variations)
                continue

            first_variation = variations[0] if variations else {}

            raw_price = item.get("price")
            if raw_price in (None, ""):
                raw_price = first_variation.get("price")

            try:
                price = Decimal(str(raw_price))
                if not price.is_finite() or price < 0:
                    raise InvalidOperation
            except (InvalidOperation, TypeError, ValueError):
                self.stdout.write(
                    self.style.WARNING(
                        f"Harga tidak valid, produk dilewati: {name}"
                    )
                )
                variation_skipped += len(variations)
                continue

            category_name = (item.get("category") or "Umum").strip()
            category_slug = slugify(category_name) or "umum"

            category, _ = Category.objects.get_or_create(
                slug=category_slug,
                defaults={"name": category_name}
            )

            base_slug = slugify(name) or "produk"
            parent_sku = (
                item.get("parent_sku")
                or first_variation.get("sku")
                or f"SHOPEE-{product_id}"
            )
            parent_sku = str(parent_sku).strip()

            image_url = (
                item.get("cover_image")
                or item.get("image_url")
                or "https://via.placeholder.com/400x400?text=URBANIX+Product"
            )

            try:
                with transaction.atomic():
                    product = (
                        Product.objects.filter(pk=product_id).first()
                        if product_id is not None
                        else None
                    )

                    defaults = {
                        "name": name,
                        "slug": base_slug,
                        "sku": parent_sku,
                        "description": item.get("description") or "",
                        "category": category,
                        "price": price,
                        "stock": max(
                            0, int(first_variation.get("stock", 0) or 0)
                        ),
                        "image_url": image_url,
                        "is_active": True,
                    }

                    if product:
                        for field, value in defaults.items():
                            setattr(product, field, value)
                        product.save()
                        product_updated += 1
                    else:
                        if Product.objects.filter(
                            slug=base_slug
                        ).exists():
                            defaults["slug"] = (
                                f"{base_slug}-{product_id}"
                            )

                        if Product.objects.filter(
                            sku=parent_sku
                        ).exists():
                            defaults["sku"] = (
                                f"{parent_sku}-{product_id}"
                            )

                        if product_id is not None:
                            product = Product(
                                id=product_id, **defaults
                            )
                            product.save(force_insert=True)
                        else:
                            product = Product.objects.create(**defaults)

                        product_created += 1

                    for variation in variations:
                        variation_id = variation.get("variation_id")
                        variation_name = (
                            variation.get("name") or ""
                        ).strip()
                        variation_sku = str(
                            variation.get("sku") or ""
                        ).strip()

                        if variation_id in (None, ""):
                            variation_skipped += 1
                            continue

                        try:
                            variation_price = Decimal(
                                str(variation.get("price"))
                            )
                            if (
                                not variation_price.is_finite()
                                or variation_price < 0
                            ):
                                raise InvalidOperation

                            variation_stock = max(
                                0,
                                int(variation.get("stock", 0) or 0)
                            )
                        except (
                            InvalidOperation,
                            TypeError,
                            ValueError,
                        ):
                            variation_skipped += 1
                            continue

                        _, created = (
                            ProductVariation.objects.update_or_create(
                                variation_id=str(variation_id),
                                defaults={
                                    "product": product,
                                    "name": variation_name,
                                    "sku": variation_sku,
                                    "price": variation_price,
                                    "stock": variation_stock,
                                },
                            )
                        )

                        if created:
                            variation_created += 1
                        else:
                            variation_updated += 1

            except Exception as exc:
                raise CommandError(
                    f"Gagal mengimpor produk {name} "
                    f"(ID {product_id}): {exc}"
                ) from exc

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("IMPOR SELESAI"))
        self.stdout.write(
            f"Produk baru       : {product_created}"
        )
        self.stdout.write(
            f"Produk diperbarui : {product_updated}"
        )
        self.stdout.write(
            f"Variasi baru      : {variation_created}"
        )
        self.stdout.write(
            f"Variasi diperbarui: {variation_updated}"
        )
        self.stdout.write(
            f"Variasi dilewati  : {variation_skipped}"
        )

        total_variations = ProductVariation.objects.count()
        self.stdout.write(
            f"Total variasi di database: {total_variations}"
        )
