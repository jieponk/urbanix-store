"""
Satu sumber kebenaran untuk harga yang dibayar pembeli.

Harga akhir = harga terendah dari:
- harga normal (varian atau produk),
- Product.discount_price lama (hanya produk tanpa varian),
- promo "Potong harga" yang sedang berjalan (per varian, per produk, atau persen).
"""
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Prefetch, Q
from django.utils import timezone

from .models import PriceCutItem, Product, ProductVariation


def running_items_queryset(now=None):
    now = now or timezone.now()
    return (
        PriceCutItem.objects.filter(price_cut__is_active=True)
        .filter(Q(price_cut__starts_at__isnull=True) | Q(price_cut__starts_at__lte=now))
        .filter(Q(price_cut__ends_at__isnull=True) | Q(price_cut__ends_at__gte=now))
        .select_related("price_cut")
    )


def prefetch_running_promos():
    """Pakai di queryset: Product.objects.prefetch_related(prefetch_running_promos())."""
    return Prefetch("price_cut_items", queryset=running_items_queryset(), to_attr="running_promo_items")


@dataclass
class PriceInfo:
    normal: Decimal
    final: Decimal
    promo_name: str = ""
    promo_ends_at: object = None

    @property
    def discount_percent(self) -> int:
        if self.final >= self.normal or self.normal <= 0:
            return 0
        return int(((self.normal - self.final) / self.normal * 100).quantize(Decimal("1"), ROUND_HALF_UP))


def _promo_items(product: Product):
    items = getattr(product, "running_promo_items", None)
    if items is None:
        items = list(running_items_queryset().filter(product=product))
        product.running_promo_items = items
    return items


def price_info(product: Product, variation: ProductVariation | None = None) -> PriceInfo:
    normal = variation.price if variation else product.price
    best = PriceInfo(normal=normal, final=normal)

    if variation is None and product.discount_price and 0 < product.discount_price < normal:
        best.final = product.discount_price

    for item in _promo_items(product):
        if item.variation_id and (variation is None or item.variation_id != variation.pk):
            continue
        if item.promo_price is not None:
            if item.variation_id is None and variation is not None:
                continue  # harga tetap level produk hanya untuk produk tanpa varian
            candidate = item.promo_price
        else:
            candidate = (normal * (Decimal(100) - item.discount_percent) / Decimal(100)).quantize(
                Decimal("1"), ROUND_HALF_UP
            )
        if 0 < candidate < best.final:
            best = PriceInfo(
                normal=normal,
                final=candidate,
                promo_name=item.price_cut.name,
                promo_ends_at=item.price_cut.ends_at,
            )
    return best
