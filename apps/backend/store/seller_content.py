"""API Seller Center bagian 2: promo (potong harga), voucher, banner, berita, ulasan, kategori, pengaturan toko."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import news as news_engine
from .models import (
    Banner,
    Category,
    NewsArticle,
    NewsSource,
    PriceCut,
    PriceCutItem,
    Product,
    ProductVariation,
    Review,
    StoreSettings,
    Voucher,
)
from .pricing import price_info
from .seller_api import bad, paginate, rupiah, staff


def _errors(exc) -> str:
    """Ringkas error validasi Django/DRF menjadi satu kalimat."""
    detail = getattr(exc, "message_dict", None) or getattr(exc, "detail", None) or getattr(exc, "messages", None) or str(exc)
    if isinstance(detail, dict):
        parts = []
        for field, msgs in detail.items():
            msgs = msgs if isinstance(msgs, (list, tuple)) else [msgs]
            text = " ".join(str(m) for m in msgs)
            parts.append(text if field in ("__all__", "non_field_errors") else f"{field}: {text}")
        return " ".join(parts)
    if isinstance(detail, (list, tuple)):
        return " ".join(str(m) for m in detail)
    return str(detail)


class CleanModelSerializer(serializers.ModelSerializer):
    """Menjalankan model.clean() supaya aturan di model (mis. voucher) tetap berlaku."""

    def validate(self, attrs):
        instance = self.instance or self.Meta.model()
        for key, value in attrs.items():
            setattr(instance, key, value)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(_errors(exc)) from None
        return attrs


def _crud(request, serializer_cls, instance=None, partial=True):
    serializer = serializer_cls(instance, data=request.data, partial=partial)
    if not serializer.is_valid():
        return bad(_errors(serializers.ValidationError(serializer.errors)))
    obj = serializer.save()
    return Response(serializer_cls(obj).data, status=status.HTTP_201_CREATED if instance is None else 200)


def _status(obj) -> str:
    now = timezone.now()
    if not obj.is_active:
        return "Nonaktif"
    if obj.starts_at and obj.starts_at > now:
        return "Terjadwal"
    if obj.ends_at and obj.ends_at < now:
        return "Selesai"
    return "Berjalan"


# --------------------------------------------------------------------------- promo (potong harga)
class PriceCutSerializer(CleanModelSerializer):
    status = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = PriceCut
        fields = ["id", "name", "starts_at", "ends_at", "is_active", "status", "items_count", "created_at"]
        read_only_fields = ["created_at"]

    def get_status(self, obj):
        return _status(obj)

    def get_items_count(self, obj):
        return getattr(obj, "n_items", None) if hasattr(obj, "n_items") else obj.items.count()


def _promo_item(item: PriceCutItem):
    product, variation = item.product, item.variation
    if variation:
        variation.product = product
    normal = variation.price if variation else product.price
    if item.promo_price is not None:
        final = item.promo_price
    else:
        final = (normal * (Decimal(100) - item.discount_percent) / Decimal(100)).quantize(Decimal("1"))
    return {
        "id": item.id,
        "product_id": product.id,
        "variation_id": variation.id if variation else None,
        "name": product.name,
        "variation": variation.name if variation else ("Semua varian" if product.buyable_variations() else ""),
        "sku": (variation.sku if variation else "") or product.sku,
        "image_url": (variation.image_url if variation and variation.image_url else product.image_url) or "",
        "normal_price": rupiah(normal),
        "promo_price": rupiah(item.promo_price) if item.promo_price is not None else None,
        "discount_percent": float(item.discount_percent) if item.discount_percent is not None else None,
        "final_price": rupiah(final),
        "stock": variation.stock if variation else product.stock,
    }


@staff(["GET", "POST"])
def promos(request):
    if request.method == "POST":
        return _crud(request, PriceCutSerializer, partial=False)
    qs = PriceCut.objects.annotate(n_items=Count("items")).order_by("-is_active", "-id")
    return Response([PriceCutSerializer(p).data for p in qs])


@staff(["GET", "PATCH", "DELETE"])
def promo_detail(request, pk):
    cut = get_object_or_404(PriceCut, pk=pk)
    if request.method == "DELETE":
        cut.delete()
        return Response(status=204)
    if request.method == "PATCH":
        resp = _crud(request, PriceCutSerializer, cut)
        if resp.status_code >= 400:
            return resp
        cut.refresh_from_db()
    items = cut.items.select_related("product", "variation").order_by("product__name", "variation__name")
    return Response({**PriceCutSerializer(cut).data, "items": [_promo_item(i) for i in items]})


@staff(["POST"])
def promo_items(request, pk):
    """{"items": [{"product_id", "variation_id"?, "promo_price"? | "discount_percent"?}, ...]} — tambah/ubah."""
    cut = get_object_or_404(PriceCut, pk=pk)
    rows = request.data.get("items") or []
    saved, errors = 0, []
    for row in rows:
        product = Product.objects.filter(pk=row.get("product_id")).first()
        if not product:
            errors.append(f"Produk {row.get('product_id')} tidak ditemukan.")
            continue
        variation = None
        if row.get("variation_id"):
            variation = ProductVariation.objects.filter(pk=row["variation_id"], product=product).first()
            if not variation:
                errors.append(f"Varian tidak ditemukan untuk {product.name}.")
                continue
        item = PriceCutItem.objects.filter(price_cut=cut, product=product, variation=variation).first() or PriceCutItem(
            price_cut=cut, product=product, variation=variation
        )
        price = row.get("promo_price")
        percent = row.get("discount_percent")
        item.promo_price = Decimal(str(price)) if price not in (None, "") else None
        item.discount_percent = Decimal(str(percent)) if percent not in (None, "") else None
        try:
            item.full_clean(exclude=["price_cut"])
        except DjangoValidationError as exc:
            label = product.name + (f" — {variation.name}" if variation else "")
            errors.append(f"{label}: {_errors(exc)}")
            continue
        item.save()
        saved += 1
    items = cut.items.select_related("product", "variation").order_by("product__name", "variation__name")
    return Response({"saved": saved, "errors": errors, "items": [_promo_item(i) for i in items]},
                    status=200 if saved or not errors else 400)


@staff(["DELETE"])
def promo_item_delete(request, item_id):
    get_object_or_404(PriceCutItem, pk=item_id).delete()
    return Response(status=204)


# --------------------------------------------------------------------------- voucher
class VoucherSerializer(CleanModelSerializer):
    status = serializers.SerializerMethodField()
    used = serializers.SerializerMethodField()

    class Meta:
        model = Voucher
        fields = [
            "id", "code", "title", "terms", "voucher_type", "value", "max_discount", "min_purchase",
            "for_whatsapp", "for_midtrans", "exclude_promo", "can_combine", "usage_limit", "per_customer_limit",
            "starts_at", "ends_at", "is_active", "is_public", "show_in_popup", "sort_order", "status", "used",
        ]

    def get_status(self, obj):
        return _status(obj)

    def get_used(self, obj):
        return obj.used_count() if obj.pk else 0

    def validate_code(self, value):
        code = "".join(value.split()).upper()
        if not code:
            raise serializers.ValidationError("Kode wajib diisi.")
        if Voucher.objects.exclude(pk=getattr(self.instance, "pk", None)).filter(code=code).exists():
            raise serializers.ValidationError("Kode sudah dipakai voucher lain.")
        return code


@staff(["GET", "POST"])
def vouchers(request):
    if request.method == "POST":
        return _crud(request, VoucherSerializer, partial=False)
    return Response([VoucherSerializer(v).data for v in Voucher.objects.order_by("sort_order", "-id")])


@staff(["GET", "PATCH", "DELETE"])
def voucher_detail(request, pk):
    voucher = get_object_or_404(Voucher, pk=pk)
    if request.method == "DELETE":
        voucher.delete()
        return Response(status=204)
    if request.method == "PATCH":
        return _crud(request, VoucherSerializer, voucher)
    return Response(VoucherSerializer(voucher).data)


# --------------------------------------------------------------------------- banner
ALLOWED_IMAGE = (".jpg", ".jpeg", ".png", ".webp", ".gif")
MAX_IMAGE = 5 * 1024 * 1024


class BannerSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    image = serializers.FileField(required=False)
    mobile_image = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = Banner
        fields = ["id", "title", "image", "mobile_image", "link_url", "sort_order", "starts_at", "ends_at",
                  "is_active", "status"]

    def get_status(self, obj):
        return _status(obj)

    def _check(self, f):
        if f and (not f.name.lower().endswith(ALLOWED_IMAGE) or f.size > MAX_IMAGE):
            raise serializers.ValidationError("Gambar harus JPG/PNG/WebP/GIF, maks. 5 MB.")
        return f

    def validate_image(self, f):
        return self._check(f)

    def validate_mobile_image(self, f):
        return self._check(f)

    def validate(self, attrs):
        if not self.instance and not attrs.get("image"):
            raise serializers.ValidationError("Gambar banner wajib diupload.")
        starts = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts and ends and ends <= starts:
            raise serializers.ValidationError("Waktu selesai harus setelah waktu mulai.")
        return attrs

    def to_representation(self, obj):
        data = super().to_representation(obj)
        data["image"] = obj.image.url if obj.image else ""
        data["mobile_image"] = obj.mobile_image.url if obj.mobile_image else ""
        return data


def _banner_data(request):
    """multipart: field kosong ('') berarti 'hapus nilai' untuk tanggal & gambar HP."""
    data = {}
    for key, value in request.data.items():
        if key in ("image", "mobile_image") and isinstance(value, str):
            if key == "mobile_image" and value == "":
                data[key] = None
            continue
        if key in ("starts_at", "ends_at") and value in ("", "null"):
            data[key] = None
        elif key == "is_active" and isinstance(value, str):
            data[key] = value.lower() in ("1", "true", "ya", "on")
        else:
            data[key] = value
    return data


@staff(["GET", "POST"])
def banners(request):
    if request.method == "POST":
        serializer = BannerSerializer(data=_banner_data(request))
        if not serializer.is_valid():
            return bad(_errors(serializers.ValidationError(serializer.errors)))
        return Response(BannerSerializer(serializer.save()).data, status=201)
    return Response([BannerSerializer(b).data for b in Banner.objects.all()])


@staff(["PATCH", "DELETE"])
def banner_detail(request, pk):
    banner = get_object_or_404(Banner, pk=pk)
    if request.method == "DELETE":
        banner.image.delete(save=False)
        if banner.mobile_image:
            banner.mobile_image.delete(save=False)
        banner.delete()
        return Response(status=204)
    serializer = BannerSerializer(banner, data=_banner_data(request), partial=True)
    if not serializer.is_valid():
        return bad(_errors(serializers.ValidationError(serializer.errors)))
    return Response(BannerSerializer(serializer.save()).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def public_banners(request):
    """Banner beranda yang sedang tayang (dipakai storefront)."""
    now = timezone.now()
    running = [b for b in Banner.objects.filter(is_active=True) if b.is_running(now)]
    return Response([
        {"id": b.id, "title": b.title, "image": b.image.url,
         "mobile_image": b.mobile_image.url if b.mobile_image else "", "link_url": b.link_url}
        for b in running
    ])


# --------------------------------------------------------------------------- berita
def _news_row(a: NewsArticle):
    return {
        "id": a.id, "title": a.title, "summary": a.summary, "original_title": a.original_title,
        "url": a.url, "image_url": a.image_url, "source": a.source.name, "published_at": a.published_at,
        "is_visible": a.is_visible, "is_pinned": a.is_pinned, "is_translated": a.is_translated,
    }


@staff(["GET"])
def news_articles(request):
    qs = NewsArticle.objects.select_related("source").order_by("-is_pinned", "-published_at")
    p = request.query_params
    if p.get("q"):
        qs = qs.filter(Q(title__icontains=p["q"]) | Q(original_title__icontains=p["q"]))
    if p.get("source", "").isdigit():
        qs = qs.filter(source_id=int(p["source"]))
    if p.get("filter") == "hidden":
        qs = qs.filter(is_visible=False)
    elif p.get("filter") == "pinned":
        qs = qs.filter(is_pinned=True)
    elif p.get("filter") == "untranslated":
        qs = qs.filter(is_translated=False)
    data = paginate(request, qs, _news_row)
    data["sources"] = [
        {"id": s.id, "name": s.name, "is_active": s.is_active, "language": s.language, "feed_url": s.feed_url,
         "last_fetched_at": s.last_fetched_at, "last_error": s.last_error, "articles": s.n}
        for s in NewsSource.objects.annotate(n=Count("articles"))
    ]
    data["translation_ready"] = bool(news_engine.deepl_key())
    return Response(data)


@staff(["PATCH"])
def news_article_detail(request, pk):
    article = get_object_or_404(NewsArticle.objects.select_related("source"), pk=pk)
    for field in ("title", "summary"):
        if field in request.data:
            value = str(request.data[field]).strip()
            if field == "title" and not value:
                return bad("Judul tidak boleh kosong.")
            setattr(article, field, value[:300] if field == "title" else value)
    for field in ("is_visible", "is_pinned"):
        if field in request.data:
            setattr(article, field, bool(request.data[field]))
    article.save()
    return Response(_news_row(article))


@staff(["PATCH"])
def news_source_detail(request, pk):
    source = get_object_or_404(NewsSource, pk=pk)
    if "is_active" in request.data:
        source.is_active = bool(request.data["is_active"])
        source.save(update_fields=["is_active"])
    return Response({"id": source.id, "is_active": source.is_active})


@staff(["POST"])
def news_fetch(request):
    report = news_engine.refresh_all(force=True)
    return Response({"report": report, "new": sum(report.values()), "translation_ready": bool(news_engine.deepl_key())})


# --------------------------------------------------------------------------- ulasan
def _review_row(r: Review):
    return {
        "id": r.id, "customer_name": r.customer_name, "rating": r.rating, "text": r.text,
        "product": r.product.name if r.product_id else r.product_name, "variation": r.variation_name,
        "date": r.review_date, "source": r.get_source_display(), "is_published": r.is_published,
    }


@staff(["GET"])
def reviews(request):
    qs = Review.objects.select_related("product").order_by("-review_date", "-id")
    p = request.query_params
    if p.get("q"):
        qs = qs.filter(Q(customer_name__icontains=p["q"]) | Q(text__icontains=p["q"]) | Q(product__name__icontains=p["q"]))
    if p.get("filter") == "hidden":
        qs = qs.filter(is_published=False)
    elif p.get("rating", "").isdigit():
        qs = qs.filter(rating=int(p["rating"]))
    return Response(paginate(request, qs, _review_row))


@staff(["PATCH", "DELETE"])
def review_detail(request, pk):
    review = get_object_or_404(Review.objects.select_related("product"), pk=pk)
    if request.method == "DELETE":
        review.delete()
        return Response(status=204)
    if "is_published" in request.data:
        review.is_published = bool(request.data["is_published"])
        review.save(update_fields=["is_published"])
    return Response(_review_row(review))


# --------------------------------------------------------------------------- kategori & pengaturan
@staff(["GET"])
def categories(request):
    qs = Category.objects.annotate(
        n=Count("products", filter=Q(products__is_active=True))
    ).order_by("name")
    return Response([{"id": c.id, "name": c.name, "slug": c.slug, "products": c.n} for c in qs])


@staff(["PATCH"])
def category_detail(request, pk):
    category = get_object_or_404(Category, pk=pk)
    name = str(request.data.get("name", "")).strip()
    if not name:
        return bad("Nama kategori wajib diisi.")
    category.name = name[:100]
    category.save(update_fields=["name"])
    return Response({"id": category.id, "name": category.name})


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = [
            "whatsapp_number", "shopee_store_url", "shopee_reviews_url", "enable_whatsapp", "enable_shopee",
            "enable_midtrans", "show_whatsapp_popup", "voucher_combo_min_purchase", "shopee_rating",
            "shopee_rating_count",
        ]


@staff(["GET", "PATCH"])
def store_settings(request):
    store = StoreSettings.load()
    if request.method == "PATCH":
        serializer = SettingsSerializer(store, data=request.data, partial=True)
        if not serializer.is_valid():
            return bad(_errors(serializers.ValidationError(serializer.errors)))
        serializer.save()
    from . import checkout_service as svc

    return Response({**SettingsSerializer(store).data, "midtrans_configured": svc.midtrans_is_configured(),
                     "deepl_configured": bool(news_engine.deepl_key())})
