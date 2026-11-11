"""Endpoint checkout tamu. Tidak memakai autentikasi/CSRF karena dipanggil dari proxy Next.js."""
import re
from decimal import Decimal

from django.db.models import Case, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import checkout_service as svc
from . import vouchers as voucher_engine
from .checkout_serializers import CheckoutSerializer, QuoteRequestSerializer
from . import news as news_engine
from .models import NewsArticle, NewsSource, Order, Review, StoreSettings


def _public(view):
    view = authentication_classes([])(view)
    return permission_classes([AllowAny])(view)


@api_view(["GET"])
@_public
def store_settings(request):
    store = StoreSettings.load()
    reviews = Review.objects.filter(is_published=True)
    popup = next((v for v in voucher_engine.public_vouchers() if v.show_in_popup), None)
    popup_percent = (
        str(Decimal(str(popup.value)).normalize()) if popup and popup.voucher_type == "PERCENT" else "0"
    )
    return Response(
        {
            "methods": svc.available_methods(store),
            "whatsapp_number": store.whatsapp_number,
            "shopee_store_url": store.shopee_store_url,
            # Kompatibel dengan tampilan lama: persen & popup diambil dari voucher popup.
            "whatsapp_discount_percent": popup_percent,
            "whatsapp_discount_on_promo": bool(popup and not popup.exclude_promo),
            "show_whatsapp_popup": bool(store.show_whatsapp_popup and store.whatsapp_number and popup),
            "popup_voucher": voucher_engine.voucher_summary(popup) if popup else None,
            "shopee_rating": str(store.shopee_rating) if store.shopee_rating is not None else None,
            "shopee_rating_count": store.shopee_rating_count,
            "shopee_reviews_url": store.shopee_reviews_url,
            "review_count": reviews.count(),
        }
    )


@api_view(["GET"])
@_public
def review_list(request):
    """Ulasan yang ditampilkan. ?product=<id> untuk satu produk, ?limit=<n> (maks. 50)."""
    # Ulasan yang ada komentarnya tampil lebih dulu, lalu yang terbaru.
    qs = (
        Review.objects.filter(is_published=True)
        .select_related("product")
        .annotate(has_text=Case(When(text="", then=Value(0)), default=Value(1), output_field=IntegerField()))
        .order_by("-has_text", "-review_date", "-id")
    )
    product = request.query_params.get("product")
    if product and product.isdigit():
        qs = qs.filter(product_id=int(product))
    try:
        limit = max(1, min(50, int(request.query_params.get("limit", 12))))
    except ValueError:
        limit = 12
    return Response(
        [
            {
                "id": r.id,
                "name": r.masked_name,
                "rating": r.rating,
                "text": r.text,
                "product_id": r.product_id,
                "product_name": r.product.name if r.product else r.product_name,
                "variation_name": r.variation_name,
                "date": r.review_date,
                "source": r.get_source_display(),
            }
            for r in qs[:limit]
        ]
    )


@api_view(["POST"])
@_public
@throttle_classes([ScopedRateThrottle])
def checkout_quote(request):
    serializer = QuoteRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    try:
        return Response(
            svc.quote(data["items"], data["voucher_codes"], data["payment_method"], data["phone"] or None)
        )
    except svc.CheckoutError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


checkout_quote.cls.throttle_scope = "checkout_quote"


@api_view(["POST"])
@_public
@throttle_classes([ScopedRateThrottle])
def checkout(request):
    serializer = CheckoutSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        result = svc.place_order(serializer.validated_data)
    except svc.CheckoutError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result, status=status.HTTP_201_CREATED)


checkout.cls.throttle_scope = "checkout"


def _mask_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) < 7:
        return ""
    return f"{digits[:4]}{'*' * (len(digits) - 7)}{digits[-3:]}"


@api_view(["GET"])
@_public
def order_detail(request, order_number):
    """Ringkasan pesanan untuk halaman /pesanan/<no>. Data pribadi (alamat, HP) tidak ditampilkan."""
    order = get_object_or_404(
        Order.objects.prefetch_related("items"), order_number=order_number
    )
    return Response(
        {
            "order_number": order.order_number,
            "created_at": order.created_at,
            "customer_name": order.customer_name,
            "payment_method": order.payment_method,
            "payment_status": order.payment_status,
            "status": order.status,
            "total_amount": str(order.total_amount),
            "discount_amount": str(order.discount_amount),
            "discount_note": order.discount_note,
            "voucher_codes": order.voucher_codes,
            "shipping_discount_max": str(order.shipping_discount_max),
            # Untuk invoice: hanya kota/provinsi & HP disamarkan (link pesanan bisa diteruskan ke orang lain).
            "customer_phone_masked": _mask_phone(order.customer_phone),
            "shipping_city": order.shipping_city,
            "shipping_province": order.shipping_province,
            "shipping_courier": order.shipping_courier,
            "tracking_number": order.tracking_number,
            "shipping_cost": str(order.shipping_cost) if order.shipping_cost is not None else None,
            "updated_at": order.updated_at,
            "tax_note": "Harga sudah termasuk PPN.",
            "shipping_note": "Ongkos kirim dikonfirmasi penjual.",
            "payment_url": order.payment_url if order.payment_status == "UNPAID" else "",
            "whatsapp_url": svc.whatsapp_url(order) if order.payment_method == "WHATSAPP" else "",
            "items": [
                {
                    "product_id": item.product_id,
                    "name": item.product_name,
                    "variation_name": item.variation_name,
                    "sku": item.sku,
                    "unit_price": str(item.price_snapshot),
                    "quantity": item.quantity,
                    "subtotal": str(item.price_snapshot * item.quantity),
                }
                for item in order.items.all()
            ],
        }
    )


@api_view(["POST"])
@_public
def midtrans_webhook(request):
    code, message = svc.handle_midtrans_notification(dict(request.data))
    return Response({"status": message}, status=code)


@api_view(["GET"])
@_public
def voucher_list(request):
    """Voucher publik yang sedang berlaku (untuk diklaim di beranda/halaman produk)."""
    return Response([voucher_engine.voucher_summary(v) for v in voucher_engine.public_vouchers()])



def _article(a):
    return {
        "id": a.id,
        "title": a.title,
        "summary": a.summary,
        "url": a.url,
        "image_url": a.image_url,
        "source": a.source.name,
        "source_id": a.source_id,
        "published_at": a.published_at,
        "is_translated": a.is_translated or a.source.language == "id",
        "is_pinned": a.is_pinned,
    }


@api_view(["GET"])
@_public
def news_list(request):
    """Berita kamera & fotografi. ?source=<id>, ?page=<n>, ?limit=<n> (maks. 48)."""
    news_engine.refresh_in_background()
    qs = NewsArticle.objects.filter(is_visible=True, source__is_active=True).select_related("source")
    source = request.query_params.get("source", "")
    if source.isdigit():
        qs = qs.filter(source_id=int(source))
    try:
        limit = max(1, min(48, int(request.query_params.get("limit", 12))))
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        limit, page = 12, 1
    total = qs.count()
    start = (page - 1) * limit
    sources = NewsSource.objects.filter(is_active=True, articles__is_visible=True).distinct()
    return Response({
        "count": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "results": [_article(a) for a in qs[start:start + limit]],
        "sources": [{"id": s.id, "name": s.name, "site_url": s.site_url} for s in sources],
    })


BRANDS = [
    "Sony", "Canon", "Nikon", "Fujifilm", "Fuji", "Panasonic", "Lumix", "DJI", "GoPro", "Insta360",
    "Godox", "Rode", "RØDE", "Sigma", "Tamron", "Zhiyun", "Leica", "OM System", "Olympus", "Hasselblad",
    "Ricoh", "Pentax", "Blackmagic", "Saramonic", "Boya", "Ulanzi", "SmallRig", "Viltrox", "Yongnuo",
    "Samyang", "Laowa", "Aputure", "Nanlite", "Hollyland", "Sandisk", "Lexar", "Peak Design", "K&F",
]


def related_products(article, limit=4):
    """Produk toko yang mereknya disebut di judul berita; kalau tidak ada, produk promo/terbaru."""
    from .models import Product
    from .pricing import prefetch_running_promos
    from .serializers import ProductSerializer

    text = f"{article.original_title} {article.title}".lower()
    base = Product.objects.filter(is_active=True).select_related("category").prefetch_related(
        "variations", prefetch_running_promos()
    )
    found, brand = [], ""
    for name in BRANDS:
        if re.search(rf"(?<![a-z]){re.escape(name.lower())}(?![a-z])", text):
            found = list(base.filter(name__icontains=name).order_by("-stock", "-id")[:limit])
            if found:
                brand = name
                break
    if not found:
        found = list(base.filter(price_cut_items__isnull=False).distinct().order_by("-id")[:limit]) or list(
            base.order_by("-id")[:limit]
        )
    return brand, ProductSerializer(found, many=True).data


@api_view(["GET"])
@_public
def news_detail(request, pk):
    article = get_object_or_404(
        NewsArticle.objects.select_related("source"), pk=pk, is_visible=True, source__is_active=True
    )
    brand, products = related_products(article)
    more = (
        NewsArticle.objects.filter(is_visible=True, source__is_active=True)
        .exclude(pk=article.pk)
        .select_related("source")[:3]
    )
    return Response({
        **_article(article),
        "source_site": article.source.site_url,
        "original_title": article.original_title,
        "related_brand": brand,
        "related_products": products,
        "more": [_article(a) for a in more],
    })
