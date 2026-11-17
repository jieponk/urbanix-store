"""
Satu sumber kebenaran untuk harga yang dibayar pembeli.

Harga akhir = harga terendah dari:
- harga normal (varian atau produk),
- Product.discount_price lama (hanya produk tanpa varian),
- promo "Potong harga" yang sedang berjalan (per varian, per produk, atau persen).
"""
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.db.models import Prefetch, Q, Sum
from django.utils import timezone

from .models import PriceCutItem, Product, ProductVariation


def running_items_queryset(now=None):
    now = now or timezone.now()
    return (
        PriceCutItem.objects.filter(price_cut__is_active=True)
        .filter(Q(price_cut__starts_at__isnull=True) | Q(price_cut__starts_at__lte=now))
        .filter(Q(price_cut__ends_at__isnull=True) | Q(price_cut__ends_at__gte=now))
        .select_related("price_cut")
        # Kuota terpakai = barang di pesanan yang tidak dibatalkan
        .annotate(
            quota_used=Sum(
                "order_items__quantity",
                filter=~Q(order_items__order__status="CANCELLED"),
            )
        )
    )


def quota_left(item) -> int | None:
    """Sisa kuota item promo (None = tanpa batas)."""
    if item.quota is None:
        return None
    used = getattr(item, "quota_used", None)
    if used is None:
        used = sold_count(item)
    return max(0, item.quota - (used or 0))


def sold_count(item) -> int:
    from .models import OrderItem

    return (
        OrderItem.objects.filter(flash_item=item).exclude(order__status="CANCELLED").aggregate(n=Sum("quantity"))["n"]
        or 0
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
    item: object = None  # PriceCutItem yang dipakai (untuk kuota)
    is_flash: bool = False
    quota: int | None = None
    quota_left: int | None = None

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
        left = quota_left(item)
        if left is not None and left <= 0:
            continue  # kuota habis: harga kembali normal
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
                item=item,
                is_flash=item.price_cut.is_flash_sale,
                quota=item.quota,
                quota_left=left,
            )
    return best
