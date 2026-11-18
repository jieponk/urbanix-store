"""Isi tambahan halaman produk: "Lengkapi gear-mu" (aksesori yang cocok) & artikel Inspirasi yang membahasnya.

GET /api/v1/products/<id>/lengkapi/ → {"accessories": [ProductSerializer…], "articles": [kartu artikel…]}
"""
import re

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Article, Product
from .pricing import prefetch_running_promos
from .product_fix import detect_brand
from .serializers import ProductSerializer

# Kategori yang sifatnya "pelengkap" gear utama.
ACCESSORY_CAT = re.compile(r"aksesori|memory|memori|tas|case|tripod|stabilizer|gimbal|lighting|lampu|audio|mic|filter|baterai", re.I)
# Kata kunci aksesori yang hampir selalu dibutuhkan kreator (kartu memori, filter, baterai, tas, mic).
ESSENTIAL = re.compile(r"\b(sd ?card|micro ?sd|memory card|kartu memori|nd filter|filter|battery|baterai|charger|case|tas|bag|mic|microphone|tripod|cage|handle)\b", re.I)
WORDS = re.compile(r"[a-z0-9]+")


def _tokens(name: str) -> set[str]:
    stop = {"urbanix", "garansi", "resmi", "original", "combo", "kit", "for", "with", "dan", "untuk", "the", "new", "basic", "standard"}
    return {w for w in WORDS.findall((name or "").lower()) if len(w) > 2 and w not in stop}


def accessories_for(product: Product, limit: int = 6) -> list[Product]:
    brand = (detect_brand(product.name) or "").lower()
    own_tokens = _tokens(product.name)
    price = float(product.discount_price or product.price or 0)
    base = (
        Product.objects.filter(is_active=True)
        .exclude(pk=product.pk)
        .exclude(category_id=product.category_id)
        .select_related("category")
        .prefetch_related("variations", prefetch_running_promos())
    )
    scored = []
    for p in base:
        in_stock = p.stock > 0 or any(v.stock > 0 for v in p.variations.all())
        if not in_stock:
            continue
        score = 0
        if ACCESSORY_CAT.search(p.category.name if p.category_id else ""):
            score += 3
        if ESSENTIAL.search(p.name):
            score += 2
        if brand and brand == (detect_brand(p.name) or "").lower():
            score += 3
        overlap = len(own_tokens & _tokens(p.name))
        score += min(overlap, 3) * 2  # mis. "Osmo Pocket 4" ↔ "Filter ND Osmo Pocket 4"
        p_price = float(p.discount_price or p.price or 0)
        if price and p_price and p_price <= price * 0.5:
            score += 1  # pelengkap biasanya lebih murah dari barang utama
        if score >= 5:
            scored.append((score, -p.id, p))
    scored.sort(reverse=True)
    return [p for _, _, p in scored[:limit]]


def articles_for(product: Product, limit: int = 3) -> list[dict]:
    from .articles_api import card

    now = timezone.now()
    token = f"[[produk:{product.pk}]]"
    qs = (
        Article.objects.filter(status="PUBLISHED", published_at__lte=now)
        .filter(Q(related_products=product) | Q(body__contains=token))
        .distinct()
        .select_related("category")
        .order_by("-published_at")[:limit]
    )
    return [card(a) for a in qs]


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def product_extras(request, product_id):
    from django.core.cache import cache

    key = f"lengkapi:{product_id}"
    data = cache.get(key)
    if data is None:
        product = get_object_or_404(Product.objects.select_related("category"), pk=product_id, is_active=True)
        data = {
            "accessories": ProductSerializer(accessories_for(product), many=True).data,
            "articles": articles_for(product),
        }
        cache.set(key, data, 600)  # 10 menit: harga/stok tetap cukup segar
    return Response(data)
