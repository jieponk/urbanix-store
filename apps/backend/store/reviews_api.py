"""Ulasan produk dari pembeli terverifikasi (pesanan di urbanix.id).

Alur: pesanan Selesai -> email berisi link ulasan bertanda tangan -> pembeli memberi bintang/ulasan/foto
-> tampil di halaman produk (dan dibaca Google sebagai rating produk).
Berbeda dengan model Review lama (salinan ulasan Shopee) yang hanya tampilan dan TIDAK dipakai untuk data rating.
"""
from __future__ import annotations

from django.core import signing
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .articles_api import _public
from .checkout_service import frontend_url
from .images import ImageError, to_webp
from .models import Order, Product, ProductReview
from .seller_api import bad, paginate, staff

SALT = "urbanix-ulasan"
REVIEWABLE = ("SHIPPED", "COMPLETED")
MAX_PHOTO = 8 * 1024 * 1024


class ReviewThrottle(SimpleRateThrottle):
    scope = "product_review"
    rate = "10/min"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


# --------------------------------------------------------------------------- helpers
def review_token(order: Order) -> str:
    return signing.Signer(salt=SALT).sign(order.order_number)


def review_url(order: Order) -> str:
    return frontend_url(f"/ulasan/{review_token(order)}")


def _order_from_token(token: str) -> Order | None:
    try:
        number = signing.Signer(salt=SALT).unsign(token)
    except signing.BadSignature:
        return None
    return Order.objects.prefetch_related("items__product", "buyer_reviews").filter(order_number=number).first()


def display_name(name: str) -> str:
    """'Rani Susanti' -> 'Rani S.'"""
    parts = [p for p in (name or "").split() if p]
    if not parts:
        return "Pembeli"
    first = parts[0][:20].capitalize()
    return f"{first} {parts[-1][0].upper()}." if len(parts) > 1 else first


def _public_review(r: ProductReview) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "rating": r.rating,
        "body": r.body,
        "photo_url": r.photo.url if r.photo else "",
        "variation_name": r.variation_name,
        "created_at": r.created_at,
        "staff_reply": r.staff_reply,
        "verified": True,
    }


def rating_summary(product_id: int) -> dict:
    qs = ProductReview.objects.filter(product_id=product_id, is_visible=True)
    agg = qs.aggregate(avg=Avg("rating"), count=Count("id"))
    dist = {str(i): 0 for i in range(5, 0, -1)}
    for row in qs.values("rating").annotate(n=Count("id")):
        dist[str(row["rating"])] = row["n"]
    return {"average": round(agg["avg"] or 0, 1), "count": agg["count"], "distribution": dist}


# --------------------------------------------------------------------------- publik
@api_view(["GET"])
@_public
def product_reviews(request, product_id):
    get_object_or_404(Product, pk=product_id)
    qs = ProductReview.objects.filter(product_id=product_id, is_visible=True)
    if request.query_params.get("foto") == "1":
        qs = qs.exclude(photo="")
    data = paginate(request, qs, _public_review, default_size=10)
    data["summary"] = rating_summary(product_id)
    return Response(data)


def _order_payload(order: Order) -> dict:
    done = {r.product_id: r for r in order.buyer_reviews.all()}
    items, seen = [], set()
    for it in order.items.all():
        if not it.product_id or it.product_id in seen:
            continue
        seen.add(it.product_id)
        p = it.product
        r = done.get(it.product_id)
        items.append({
            "product_id": it.product_id,
            "name": it.product_name,
            "variation_name": it.variation_name,
            "image_url": getattr(p, "image_url", "") or "",
            "review": _public_review(r) if r else None,
        })
    return {
        "order_number": order.order_number,
        "customer_name": display_name(order.customer_name),
        "can_review": order.status in REVIEWABLE,
        "items": items,
    }


@api_view(["GET", "POST"])
@_public
def order_review(request, token):
    order = _order_from_token(token)
    if not order:
        return Response({"error": "Link ulasan tidak valid."}, status=404)
    if request.method == "GET":
        return Response(_order_payload(order))

    if not ReviewThrottle().allow_request(request, None):
        return Response({"error": "Terlalu cepat. Tunggu sebentar."}, status=429)
    if order.status not in REVIEWABLE:
        return bad("Ulasan bisa diberikan setelah pesanan dikirim.")
    data = request.data
    try:
        product_id = int(data.get("product_id"))
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return bad("Pilih produk dan bintang.")
    if not 1 <= rating <= 5:
        return bad("Bintang harus 1 sampai 5.")
    item = next((i for i in order.items.all() if i.product_id == product_id), None)
    if not item:
        return bad("Produk ini tidak ada di pesananmu.")
    if any(r.product_id == product_id for r in order.buyer_reviews.all()):
        return bad("Produk ini sudah kamu ulas. Terima kasih!")
    body = (data.get("body") or "").strip()
    if len(body) > 2000:
        return bad("Ulasan maksimal 2.000 karakter.")
    name = (data.get("name") or "").strip()[:60] or display_name(order.customer_name)

    review = ProductReview(
        product_id=product_id, order=order, variation_name=item.variation_name[:255],
        name=name, rating=rating, body=body,
    )
    photo = request.FILES.get("photo")
    if photo:
        if photo.size > MAX_PHOTO:
            return bad("Foto maksimal 8 MB.")
        try:
            review.photo.save("ulasan.webp", to_webp(photo, max_side=1600), save=False)
        except ImageError as e:
            return bad(str(e))
    review.save()
    return Response({"message": "Terima kasih atas ulasanmu!", "review": _public_review(review)}, status=201)


# --------------------------------------------------------------------------- Seller Center
def _seller_review(r: ProductReview) -> dict:
    return {
        **_public_review(r),
        "is_visible": r.is_visible,
        "product": {"id": r.product_id, "name": r.product.name if r.product_id else ""},
        "order_number": r.order.order_number,
    }


@staff(["GET"])
def seller_reviews(request):
    qs = ProductReview.objects.select_related("product", "order")
    if request.query_params.get("status") == "hidden":
        qs = qs.filter(is_visible=False)
    elif request.query_params.get("status") == "unreplied":
        qs = qs.filter(staff_reply="")
    try:
        if request.query_params.get("rating"):
            qs = qs.filter(rating=int(request.query_params["rating"]))
    except ValueError:
        pass
    data = paginate(request, qs, _seller_review)
    agg = ProductReview.objects.filter(is_visible=True).aggregate(avg=Avg("rating"), count=Count("id"))
    data["summary"] = {"average": round(agg["avg"] or 0, 1), "count": agg["count"]}
    return Response(data)


@staff(["PATCH", "DELETE"])
def seller_review_detail(request, pk):
    r = get_object_or_404(ProductReview.objects.select_related("product", "order"), pk=pk)
    if request.method == "DELETE":
        r.delete()
        return Response(status=204)
    if "is_visible" in request.data:
        r.is_visible = str(request.data.get("is_visible")).lower() in ("1", "true", "yes", "on")
    if "staff_reply" in request.data:
        r.staff_reply = (request.data.get("staff_reply") or "").strip()[:1500]
        r.staff_reply_at = timezone.now() if r.staff_reply else None
    r.save()
    return Response(_seller_review(r))
