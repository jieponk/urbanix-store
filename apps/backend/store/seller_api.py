"""API Seller Center (/api/v1/seller/...): khusus akun staf (is_staff), login memakai token.

Bagian 1: login, dashboard/laporan, pesanan, produk & varian, mass update.
Bagian konten & promo ada di seller_content.py.
"""

from __future__ import annotations

import re
import tempfile
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from zoneinfo import ZoneInfo

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import checkout_service as svc
from .models import Category, Order, OrderItem, PriceCut, PriceCutItem, Product, ProductVariation
from .pricing import prefetch_running_promos, price_info
from .serializers import ProductSerializer
from .xlsx_reader import read_sheets
from .xlsx_writer import build_xlsx

WIB = ZoneInfo("Asia/Jakarta")

STATUS_LABELS = {
    "PENDING": "Baru",
    "PROCESSING": "Diproses",
    "SHIPPED": "Dikirim",
    "COMPLETED": "Selesai",
    "CANCELLED": "Dibatalkan",
}
PAYMENT_LABELS = {"UNPAID": "Belum bayar", "PAID": "Lunas", "FAILED": "Gagal", "EXPIRED": "Kedaluwarsa"}
METHOD_LABELS = {"WHATSAPP": "WhatsApp", "MIDTRANS": "Bayar di web", "SHOPEE": "Shopee"}


# --------------------------------------------------------------------------- dasar
class IsStaff(BasePermission):
    message = "Hanya untuk admin toko."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)


def staff(methods):
    """@staff(["GET"]) = endpoint khusus staf dengan token."""

    def deco(fn):
        fn = permission_classes([IsStaff])(fn)
        fn = authentication_classes([TokenAuthentication])(fn)
        return api_view(methods)(fn)

    return deco


def rupiah(value) -> int:
    return int(Decimal(value or 0).quantize(Decimal("1"), ROUND_HALF_UP))


def to_decimal(value, field: str, allow_none=False) -> Decimal | None:
    if value in (None, "") and allow_none:
        return None
    try:
        text = str(value).strip().replace("Rp", "").replace(".", "").replace(",", ".").replace(" ", "")
        number = Decimal(text)
    except (InvalidOperation, AttributeError):
        raise ValueError(f"{field}: angka tidak valid ({value}).") from None
    if number < 0:
        raise ValueError(f"{field}: tidak boleh minus.")
    return number


def to_int(value, field: str) -> int:
    number = to_decimal(value, field)
    if number != number.to_integral_value():
        raise ValueError(f"{field}: harus bilangan bulat.")
    return int(number)


def bad(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"error": message}, status=code)


def paginate(request, qs, serialize, default_size=20):
    try:
        size = max(5, min(100, int(request.query_params.get("size", default_size))))
        page = max(1, int(request.query_params.get("page", 1)))
    except ValueError:
        size, page = default_size, 1
    total = qs.count()
    pages = max(1, -(-total // size))
    page = min(page, pages)
    start = (page - 1) * size
    return {"count": total, "page": page, "pages": pages, "size": size,
            "results": [serialize(o) for o in qs[start:start + size]]}


def date_range(request):
    """?range=today|7d|30d|90d|month|custom (&from=YYYY-MM-DD&to=YYYY-MM-DD). Mengembalikan tanggal WIB."""
    today = timezone.now().astimezone(WIB).date()
    choice = request.query_params.get("range", "30d")
    if choice == "custom":
        try:
            start = datetime.strptime(request.query_params.get("from", ""), "%Y-%m-%d").date()
            end = datetime.strptime(request.query_params.get("to", ""), "%Y-%m-%d").date()
        except ValueError:
            start, end = today - timedelta(days=29), today
        if end < start:
            start, end = end, start
    elif choice == "today":
        start = end = today
    elif choice == "month":
        start, end = today.replace(day=1), today
    else:
        days = {"7d": 7, "90d": 90}.get(choice, 30)
        start, end = today - timedelta(days=days - 1), today
    start_dt = datetime.combine(start, time.min, WIB)
    end_dt = datetime.combine(end + timedelta(days=1), time.min, WIB)
    return start, end, start_dt, end_dt


def xlsx_response(content: bytes, filename: str) -> HttpResponse:
    resp = HttpResponse(content, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


def wa_link(phone: str) -> str:
    digits = "".join(ch for ch in phone or "" if ch.isdigit())
    if digits.startswith("0"):
        digits = "62" + digits[1:]
    return f"https://wa.me/{digits}" if digits else ""


# --------------------------------------------------------------------------- login
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def login(request):
    username = str(request.data.get("username", "")).strip()
    password = str(request.data.get("password", ""))
    user = authenticate(request, username=username, password=password)
    if not user or not user.is_active:
        return bad("Username atau password salah.", status.HTTP_401_UNAUTHORIZED)
    if not user.is_staff:
        return bad("Akun ini bukan admin toko.", status.HTTP_403_FORBIDDEN)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": _user(user)})


login.cls.throttle_scope = "seller_login"


def _user(user):
    return {"username": user.username, "name": user.get_full_name() or user.username, "is_superuser": user.is_superuser}


@staff(["GET"])
def me(request):
    return Response({**_user(request.user), "new_orders": Order.objects.filter(status="PENDING").count()})


@staff(["POST"])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"ok": True})


# --------------------------------------------------------------------------- dashboard
@staff(["GET"])
def dashboard(request):
    start, end, start_dt, end_dt = date_range(request)
    in_range = Order.objects.filter(created_at__gte=start_dt, created_at__lt=end_dt)
    valid = in_range.exclude(status="CANCELLED")

    totals = valid.aggregate(revenue=Sum("total_amount"), orders=Count("id"), discount=Sum("discount_amount"))
    revenue = rupiah(totals["revenue"])
    orders = totals["orders"] or 0
    items_sold = OrderItem.objects.filter(order__in=valid).aggregate(q=Sum("quantity"))["q"] or 0

    # Periode sebelumnya (panjang sama) untuk perbandingan.
    length = end_dt - start_dt
    prev = Order.objects.filter(created_at__gte=start_dt - length, created_at__lt=start_dt).exclude(status="CANCELLED")
    prev_totals = prev.aggregate(revenue=Sum("total_amount"), orders=Count("id"))

    daily = {
        row["day"]: row
        for row in valid.annotate(day=TruncDate("created_at", tzinfo=WIB))
        .values("day").annotate(revenue=Sum("total_amount"), orders=Count("id"))
    }
    series, day = [], start
    while day <= end:
        row = daily.get(day, {})
        series.append({"date": day.isoformat(), "revenue": rupiah(row.get("revenue")), "orders": row.get("orders", 0)})
        day += timedelta(days=1)

    top = (
        OrderItem.objects.filter(order__in=valid)
        .values("product_id", "product_name", "variation_name")
        .annotate(qty=Sum("quantity"), revenue=Sum(F("price_snapshot") * F("quantity")))
        .order_by("-qty", "-revenue")[:6]
    )
    by_method = valid.values("payment_method").annotate(orders=Count("id"), revenue=Sum("total_amount"))
    by_status = in_range.values("status").annotate(n=Count("id"))

    vouchers: dict[str, dict] = {}
    for codes, disc in valid.exclude(voucher_codes="").values_list("voucher_codes", "discount_amount"):
        for code in codes.split(","):
            v = vouchers.setdefault(code, {"code": code, "used": 0})
            v["used"] += 1

    low_variations = (
        ProductVariation.objects.filter(product__is_active=True, stock__lte=2)
        .select_related("product").order_by("stock", "product__name")[:8]
    )
    low_stock = [
        {"product_id": v.product_id, "name": v.product.name, "variation": v.name, "sku": v.sku or v.product.sku, "stock": v.stock}
        for v in low_variations
    ]
    if len(low_stock) < 8:
        for p in Product.objects.filter(is_active=True, stock__lte=2, variations__isnull=True).order_by("stock")[: 8 - len(low_stock)]:
            low_stock.append({"product_id": p.id, "name": p.name, "variation": "", "sku": p.sku, "stock": p.stock})

    active = Product.objects.filter(is_active=True)
    return Response({
        "range": {"from": start.isoformat(), "to": end.isoformat()},
        "summary": {
            "revenue": revenue,
            "orders": orders,
            "average": rupiah(Decimal(revenue) / orders) if orders else 0,
            "items_sold": items_sold,
            "discount": rupiah(totals["discount"]),
            "prev_revenue": rupiah(prev_totals["revenue"]),
            "prev_orders": prev_totals["orders"] or 0,
            "cancelled": in_range.filter(status="CANCELLED").count(),
        },
        "need_action": {
            "new_orders": Order.objects.filter(status="PENDING").count(),
            "to_ship": Order.objects.filter(status="PROCESSING").count(),
        },
        "series": series,
        "top_products": [
            {"product_id": t["product_id"], "name": t["product_name"], "variation": t["variation_name"],
             "qty": t["qty"], "revenue": rupiah(t["revenue"])}
            for t in top
        ],
        "by_method": [
            {"method": m["payment_method"], "label": METHOD_LABELS.get(m["payment_method"], m["payment_method"] or "-"),
             "orders": m["orders"], "revenue": rupiah(m["revenue"])}
            for m in by_method
        ],
        "by_status": {s["status"]: s["n"] for s in by_status},
        "vouchers": sorted(vouchers.values(), key=lambda v: -v["used"]),
        "low_stock": low_stock,
        "catalog": {
            "active": active.count(),
            "inactive": Product.objects.filter(is_active=False).count(),
            "no_shopee": active.filter(Q(shopee_url__isnull=True) | Q(shopee_url="")).count(),
            "out_of_stock": active.filter(stock=0).count(),
            "no_image": active.filter(Q(image_url__isnull=True) | Q(image_url="")).count(),
        },
        "recent_orders": [_order_row(o) for o in Order.objects.order_by("-created_at")[:6]],
    })


# --------------------------------------------------------------------------- pesanan
def _orders_filtered(request):
    qs = Order.objects.all().order_by("-created_at")
    p = request.query_params
    if p.get("q"):
        q = p["q"].strip()
        qs = qs.filter(
            Q(order_number__icontains=q) | Q(customer_name__icontains=q)
            | Q(customer_phone__icontains=q) | Q(tracking_number__icontains=q)
            | Q(items__sku__icontains=q) | Q(items__product_name__icontains=q)
        ).distinct()
    if p.get("status") in STATUS_LABELS:
        qs = qs.filter(status=p["status"])
    if p.get("payment_status") in PAYMENT_LABELS:
        qs = qs.filter(payment_status=p["payment_status"])
    if p.get("method"):
        qs = qs.filter(payment_method=p["method"])
    if p.get("range"):
        _, _, start_dt, end_dt = date_range(request)
        qs = qs.filter(created_at__gte=start_dt, created_at__lt=end_dt)
    return qs


def _order_row(o: Order):
    return {
        "order_number": o.order_number,
        "created_at": o.created_at,
        "customer_name": o.customer_name,
        "customer_phone": o.customer_phone,
        "city": o.shipping_city,
        "total": rupiah(o.total_amount),
        "status": o.status,
        "status_label": STATUS_LABELS.get(o.status, o.status),
        "payment_status": o.payment_status,
        "payment_label": PAYMENT_LABELS.get(o.payment_status, o.payment_status),
        "method": o.payment_method,
        "method_label": METHOD_LABELS.get(o.payment_method, o.payment_method or "-"),
        "voucher_codes": o.voucher_codes,
        "tracking_number": o.tracking_number,
    }


def _order_detail(o: Order):
    items = list(o.items.select_related("product", "variation"))
    return {
        **_order_row(o),
        "customer_email": o.customer_email,
        "shipping_address": o.shipping_address,
        "province": o.shipping_province,
        "postal_code": o.shipping_postal_code,
        "notes": o.notes,
        "subtotal": rupiah(sum(i.price_snapshot * i.quantity for i in items)),
        "discount_amount": rupiah(o.discount_amount),
        "discount_note": o.discount_note,
        "shipping_discount_max": rupiah(o.shipping_discount_max),
        "shipping_courier": o.shipping_courier,
        "shipping_cost": rupiah(o.shipping_cost) if o.shipping_cost is not None else None,
        "admin_note": o.admin_note,
        "stock_reserved": o.stock_reserved,
        "updated_at": o.updated_at,
        "whatsapp_customer": wa_link(o.customer_phone),
        "items": [
            {
                "product_id": i.product_id,
                "name": i.product_name,
                "variation": i.variation_name,
                "sku": i.sku,
                "price": rupiah(i.price_snapshot),
                "quantity": i.quantity,
                "subtotal": rupiah(i.price_snapshot * i.quantity),
                "image_url": (i.variation.image_url if i.variation and i.variation.image_url else
                              (i.product.image_url if i.product else "")) or "",
            }
            for i in items
        ],
        "status_choices": [{"value": k, "label": v} for k, v in STATUS_LABELS.items()],
        "payment_choices": [{"value": k, "label": v} for k, v in PAYMENT_LABELS.items()],
    }


@staff(["GET"])
def orders(request):
    data = paginate(request, _orders_filtered(request), _order_row)
    data["status_counts"] = {
        row["status"]: row["n"] for row in Order.objects.values("status").annotate(n=Count("id"))
    }
    return Response(data)


@staff(["GET", "PATCH"])
def order_detail(request, number):
    order = get_object_or_404(Order, order_number=number)
    if request.method == "PATCH":
        d = request.data
        fields = []
        try:
            if "status" in d:
                if d["status"] not in STATUS_LABELS:
                    return bad("Status tidak dikenal.")
                order.status = d["status"]
                fields.append("status")
            if "payment_status" in d:
                if d["payment_status"] not in PAYMENT_LABELS:
                    return bad("Status pembayaran tidak dikenal.")
                order.payment_status = d["payment_status"]
                fields.append("payment_status")
            for name, limit in (("shipping_courier", 50), ("tracking_number", 80)):
                if name in d:
                    setattr(order, name, str(d[name] or "").strip()[:limit])
                    fields.append(name)
            if "admin_note" in d:
                order.admin_note = str(d["admin_note"] or "")
                fields.append("admin_note")
            if "shipping_cost" in d:
                order.shipping_cost = to_decimal(d["shipping_cost"], "Ongkir", allow_none=True)
                fields.append("shipping_cost")
        except ValueError as exc:
            return bad(str(exc))
        if order.status == "CANCELLED" and order.stock_reserved:
            svc.release_stock(order)
        if fields:
            order.save(update_fields=fields + ["updated_at"])
    return Response(_order_detail(order))


@staff(["POST"])
def order_stock(request, number):
    """POST {"action": "deduct" | "restore"}: kurangi/kembalikan stok sesuai isi pesanan."""
    order = get_object_or_404(Order, order_number=number)
    action = request.data.get("action")
    if action == "restore":
        svc.release_stock(order)
    elif action == "deduct":
        if order.stock_reserved:
            return bad("Stok pesanan ini sudah dikurangi sebelumnya.")
        with transaction.atomic():
            for item in order.items.select_related("product", "variation"):
                target = item.variation or item.product
                if target is None:
                    continue
                type(target).objects.filter(pk=target.pk).update(stock=F("stock") - item.quantity)
                type(target).objects.filter(pk=target.pk, stock__lt=0).update(stock=0)
                if item.variation and item.product:
                    item.product.sync_stock_from_variations()
            order.stock_reserved = True
            order.save(update_fields=["stock_reserved"])
    else:
        return bad("Aksi tidak dikenal.")
    order.refresh_from_db()
    return Response(_order_detail(order))


@staff(["GET"])
def orders_export(request):
    rows = [["No. pesanan", "Tanggal", "Status", "Pembayaran", "Metode", "Nama", "No. HP", "Kota", "Alamat",
             "Produk", "Varian", "SKU", "Qty", "Harga", "Subtotal item", "Voucher", "Potongan", "Total pesanan",
             "Kurir", "No. resi", "Ongkir"]]
    for o in _orders_filtered(request).prefetch_related("items"):
        local = o.created_at.astimezone(WIB).strftime("%Y-%m-%d %H:%M")
        for idx, i in enumerate(o.items.all()):
            first = idx == 0
            rows.append([
                o.order_number, local, STATUS_LABELS.get(o.status), PAYMENT_LABELS.get(o.payment_status),
                METHOD_LABELS.get(o.payment_method, o.payment_method), o.customer_name, o.customer_phone,
                o.shipping_city, o.shipping_address, i.product_name, i.variation_name, i.sku, i.quantity,
                rupiah(i.price_snapshot), rupiah(i.price_snapshot * i.quantity), o.voucher_codes if first else "",
                rupiah(o.discount_amount) if first else "", rupiah(o.total_amount) if first else "",
                o.shipping_courier if first else "", o.tracking_number if first else "",
                rupiah(o.shipping_cost) if first and o.shipping_cost is not None else "",
            ])
    stamp = timezone.now().astimezone(WIB).strftime("%Y%m%d-%H%M")
    widths = {"Pesanan": [22, 16, 11, 12, 12, 18, 15, 14, 30, 36, 18, 16, 6, 12, 14, 16, 11, 14, 10, 18, 10]}
    return xlsx_response(build_xlsx({"Pesanan": rows}, widths), f"laporan-pesanan-{stamp}.xlsx")


# --------------------------------------------------------------------------- produk
def _products_qs():
    return Product.objects.select_related("category").prefetch_related("variations", prefetch_running_promos())


def _product_row(p: Product):
    data = ProductSerializer(p).data
    variations = p.buyable_variations()
    return {
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "category": p.category.name if p.category_id else "",
        "category_id": p.category_id,
        "image_url": p.image_url or "",
        "price": rupiah(data["price"]),
        "final_price": rupiah(data["final_price"]),
        "discount_percent": data["discount_percent"],
        "promo_name": data["promo_name"],
        "stock": p.stock,
        "variations": len(variations),
        "is_active": p.is_active,
        "shopee_url": p.shopee_url or "",
    }


def _variation_row(p: Product, v: ProductVariation):
    v.product = p
    info = price_info(p, v)
    return {
        "id": v.id,
        "variation_id": v.variation_id,
        "name": v.name,
        "sku": v.sku,
        "price": rupiah(v.price),
        "final_price": rupiah(info.final),
        "promo_name": info.promo_name,
        "stock": v.stock,
        "image_url": v.image_url,
    }


def _product_detail(p: Product):
    info = price_info(p) if not p.buyable_variations() else None
    return {
        **_product_row(p),
        "description": p.description,
        "images": p.images or [],
        "base_price": rupiah(p.price),
        "base_final_price": rupiah(info.final) if info else None,
        "variation_list": [_variation_row(p, v) for v in p.buyable_variations()],
        "promos": [
            {"id": it.price_cut_id, "name": it.price_cut.name, "variation": it.variation.name if it.variation_id else "",
             "promo_price": rupiah(it.promo_price) if it.promo_price is not None else None,
             "discount_percent": float(it.discount_percent) if it.discount_percent is not None else None,
             "running": it.price_cut.is_running()}
            for it in p.price_cut_items.select_related("price_cut", "variation").order_by("-price_cut__id")
        ],
    }


def _filter_products(request, qs):
    p = request.query_params
    if p.get("q"):
        q = p["q"].strip()
        qs = qs.filter(Q(name__icontains=q) | Q(sku__icontains=q) | Q(variations__sku__icontains=q)).distinct()
    if p.get("category", "").isdigit():
        qs = qs.filter(category_id=int(p["category"]))
    f = p.get("filter", "")
    if f == "inactive":
        qs = qs.filter(is_active=False)
    elif f != "all":
        qs = qs.filter(is_active=True)
    if f == "out_of_stock":
        qs = qs.filter(stock=0)
    elif f == "low_stock":
        qs = qs.filter(Q(stock__lte=2) | Q(variations__stock__lte=2)).distinct()
    elif f == "no_shopee":
        qs = qs.filter(Q(shopee_url__isnull=True) | Q(shopee_url=""))
    elif f == "no_image":
        qs = qs.filter(Q(image_url__isnull=True) | Q(image_url=""))
    elif f == "promo":
        now = timezone.now()
        qs = qs.filter(
            price_cut_items__price_cut__is_active=True,
        ).filter(
            Q(price_cut_items__price_cut__starts_at__isnull=True) | Q(price_cut_items__price_cut__starts_at__lte=now),
            Q(price_cut_items__price_cut__ends_at__isnull=True) | Q(price_cut_items__price_cut__ends_at__gte=now),
        ).distinct()
    order = {"name": "name", "stock": "stock", "-stock": "-stock", "price": "price", "-price": "-price",
             "-id": "-id"}.get(p.get("sort", ""), "name")
    return qs.order_by(order, "id")


@staff(["GET"])
def products(request):
    data = paginate(request, _filter_products(request, _products_qs()), _product_row, default_size=25)
    data["categories"] = list(Category.objects.order_by("name").values("id", "name"))
    return Response(data)


@staff(["GET", "PATCH"])
def product_detail(request, pk):
    product = get_object_or_404(_products_qs(), pk=pk)
    if request.method == "PATCH":
        d = request.data
        try:
            if "name" in d:
                name = str(d["name"]).strip()
                if not name:
                    return bad("Nama produk wajib diisi.")
                product.name = name[:255]
            if "sku" in d:
                sku = str(d["sku"]).strip()
                if not sku:
                    return bad("SKU induk wajib diisi.")
                if Product.objects.exclude(pk=product.pk).filter(sku=sku).exists():
                    return bad(f"SKU {sku} sudah dipakai produk lain.")
                product.sku = sku[:50]
            if "category_id" in d:
                product.category = get_object_or_404(Category, pk=int(d["category_id"]))
            if "description" in d:
                product.description = str(d["description"])
            if "price" in d:
                price = to_decimal(d["price"], "Harga")
                if price <= 0:
                    return bad("Harga harus lebih dari 0.")
                product.price = price
            if "stock" in d:
                if product.buyable_variations():
                    return bad("Produk ini punya varian: ubah stok di tiap varian.")
                product.stock = to_int(d["stock"], "Stok")
            if "shopee_url" in d:
                url = str(d["shopee_url"] or "").strip()
                if url and not url.startswith("http"):
                    return bad("Link Shopee harus diawali https://")
                product.shopee_url = url or None
            if "image_url" in d:
                product.image_url = str(d["image_url"] or "").strip() or None
            if "is_active" in d:
                product.is_active = bool(d["is_active"])
        except ValueError as exc:
            return bad(str(exc))
        product.save()
        product = get_object_or_404(_products_qs(), pk=pk)
    return Response(_product_detail(product))


@staff(["PATCH"])
def variation_detail(request, pk):
    variation = get_object_or_404(ProductVariation.objects.select_related("product"), pk=pk)
    d = request.data
    try:
        if "name" in d:
            variation.name = str(d["name"]).strip()[:255]
        if "sku" in d:
            variation.sku = str(d["sku"]).strip()[:100]
        if "price" in d:
            price = to_decimal(d["price"], "Harga")
            if price <= 0:
                return bad("Harga harus lebih dari 0.")
            variation.price = price
        if "stock" in d:
            variation.stock = to_int(d["stock"], "Stok")
        if "image_url" in d:
            variation.image_url = str(d["image_url"] or "").strip()
    except ValueError as exc:
        return bad(str(exc))
    variation.save()
    variation.product.sync_stock_from_variations()
    product = get_object_or_404(_products_qs(), pk=variation.product_id)
    return Response(_product_detail(product))


# --------------------------------------------------------------------------- mass update
def _round(value: Decimal, step: int) -> Decimal:
    step = max(1, step)
    return (value / step).quantize(Decimal("1"), ROUND_HALF_UP) * step


@staff(["POST"])
def products_bulk(request):
    """{"ids": [..] | "all_filtered": true + filter params, "action": ..., "value": ...}"""
    d = request.data
    action = d.get("action")
    ids = [int(i) for i in d.get("ids", []) if str(i).isdigit()]
    if not ids:
        return bad("Pilih minimal satu produk.")
    qs = Product.objects.filter(pk__in=ids)
    value = d.get("value")

    try:
        with transaction.atomic():
            if action == "activate":
                n = qs.update(is_active=True)
            elif action == "deactivate":
                n = qs.update(is_active=False)
            elif action == "category":
                category = get_object_or_404(Category, pk=int(value))
                n = qs.update(category=category)
            elif action == "price_percent":
                percent = Decimal(str(value))
                if not (-90 <= percent <= 300) or percent == 0:
                    return bad("Persen perubahan harga harus antara -90 dan 300, dan bukan 0.")
                step = int(d.get("round", 100) or 1)
                factor = (Decimal(100) + percent) / Decimal(100)
                n = 0
                for p in qs.prefetch_related("variations"):
                    p.price = max(Decimal(step), _round(p.price * factor, step))
                    p.save(update_fields=["price"])
                    for v in p.variations.all():
                        v.price = max(Decimal(step), _round(v.price * factor, step))
                        v.save(update_fields=["price"])
                    n += 1
            elif action == "set_stock":
                stock = to_int(value, "Stok")
                n = 0
                for p in qs.prefetch_related("variations"):
                    if p.variations.exists():
                        p.variations.update(stock=stock)
                        p.sync_stock_from_variations()
                    else:
                        Product.objects.filter(pk=p.pk).update(stock=stock)
                    n += 1
            elif action == "add_promo":
                cut = get_object_or_404(PriceCut, pk=int((value or {}).get("price_cut_id", 0)))
                percent = Decimal(str((value or {}).get("discount_percent", "")))
                if not (0 < percent < 100):
                    return bad("Potongan promo harus antara 0 dan 100%.")
                n = 0
                for p in qs:
                    PriceCutItem.objects.filter(price_cut=cut, product=p).delete()
                    PriceCutItem.objects.create(price_cut=cut, product=p, discount_percent=percent)
                    n += 1
            elif action == "remove_promo":
                cut = get_object_or_404(PriceCut, pk=int(value))
                n, _ = PriceCutItem.objects.filter(price_cut=cut, product__in=qs).delete()
            else:
                return bad("Aksi tidak dikenal.")
    except (ValueError, InvalidOperation, TypeError) as exc:
        return bad(f"Nilai tidak valid: {exc}")
    return Response({"updated": n})


TEMPLATE_HEADER = ["product_id", "variation_id", "SKU", "Nama produk", "Varian", "Harga normal", "Stok",
                   "Link Shopee", "Aktif (ya/tidak)"]


@staff(["GET"])
def products_template(request):
    """Excel untuk mass update: satu baris per SKU yang bisa dibeli (produk tanpa varian / tiap varian)."""
    rows = [TEMPLATE_HEADER]
    for p in _filter_products(request, _products_qs()):
        variations = p.buyable_variations()
        active = "ya" if p.is_active else "tidak"
        if variations:
            for i, v in enumerate(variations):
                rows.append([p.id, v.id, v.sku or p.sku, p.name, v.name, rupiah(v.price), v.stock,
                             (p.shopee_url or "") if i == 0 else "", active if i == 0 else ""])
        else:
            rows.append([p.id, "", p.sku, p.name, "", rupiah(p.price), p.stock, p.shopee_url or "", active])
    info = [
        ["Cara pakai"],
        ["1. Ubah kolom Harga normal, Stok, Link Shopee, atau Aktif. Kolom lain jangan diubah."],
        ["2. Baris yang tidak berubah boleh dibiarkan atau dihapus."],
        ["3. Link Shopee & Aktif berlaku untuk produk (diisi di baris varian pertama)."],
        ["4. Upload file ini di Seller Center > Mass update, cek pratinjau, lalu klik Terapkan."],
        ["Harga promo diatur di menu Promo, bukan di file ini."],
    ]
    stamp = timezone.now().astimezone(WIB).strftime("%Y%m%d-%H%M")
    widths = {"Produk": [10, 12, 18, 48, 22, 14, 8, 40, 14], "Cara pakai": [90]}
    return xlsx_response(build_xlsx({"Produk": rows, "Cara pakai": info}, widths), f"mass-update-produk-{stamp}.xlsx")


def _read_upload(upload) -> list[list[str]]:
    name = (upload.name or "").lower()
    if name.endswith(".csv"):
        import csv
        import io

        text = upload.read().decode("utf-8-sig", errors="replace")
        dialect = csv.Sniffer().sniff(text[:2000], delimiters=",;\t") if text.strip() else csv.excel
        return [row for row in csv.reader(io.StringIO(text), dialect)]
    with tempfile.NamedTemporaryFile(suffix=".xlsx") as tmp:
        for chunk in upload.chunks():
            tmp.write(chunk)
        tmp.flush()
        sheets = read_sheets(tmp.name)
    return sheets.get("Produk") or next(iter(sheets.values()), [])


@staff(["POST"])
def products_import(request):
    """Upload file mass update. ?apply=1 untuk menyimpan; tanpa itu hanya pratinjau perubahan."""
    upload = request.FILES.get("file")
    if not upload:
        return bad("Pilih file Excel (.xlsx) atau CSV.")
    try:
        rows = _read_upload(upload)
    except Exception:  # noqa: BLE001
        return bad("File tidak bisa dibaca. Pakai template Excel dari tombol Unduh template.")
    if not rows:
        return bad("File kosong.")
    header = [h.strip().lower() for h in rows[0]]

    def col(*names):
        for n in names:
            if n.lower() in header:
                return header.index(n.lower())
        return None

    c_pid, c_vid, c_sku = col("product_id"), col("variation_id"), col("sku")
    c_price, c_stock = col("harga normal", "harga"), col("stok", "stock")
    c_shopee, c_active = col("link shopee"), col("aktif (ya/tidak)", "aktif")
    if c_pid is None and c_sku is None:
        return bad("Kolom product_id atau SKU tidak ditemukan. Pakai template dari Seller Center.")

    apply = request.query_params.get("apply") == "1"
    changes, errors = [], []

    def cell(row, idx):
        return row[idx].strip() if idx is not None and idx < len(row) and row[idx] is not None else ""

    with transaction.atomic():
        for line_no, row in enumerate(rows[1:], start=2):
            if not any(str(c).strip() for c in row):
                continue
            pid, vid, sku = cell(row, c_pid), cell(row, c_vid), cell(row, c_sku)
            product = variation = None
            if vid.isdigit():
                variation = ProductVariation.objects.select_related("product").filter(pk=int(vid)).first()
                product = variation.product if variation else None
            elif pid.isdigit():
                product = Product.objects.filter(pk=int(pid)).first()
            elif sku:
                variation = ProductVariation.objects.select_related("product").filter(sku=sku).first()
                product = variation.product if variation else Product.objects.filter(sku=sku).first()
            if not product:
                errors.append(f"Baris {line_no}: produk tidak ditemukan ({sku or pid or vid}).")
                continue
            target = variation or product
            label = product.name + (f" — {variation.name}" if variation and variation.name else "")
            diff = {}
            try:
                price_text = cell(row, c_price)
                if price_text:
                    price = to_decimal(price_text, "Harga")
                    if price <= 0:
                        raise ValueError("Harga harus lebih dari 0.")
                    if price != target.price:
                        diff["Harga"] = (rupiah(target.price), rupiah(price))
                        target.price = price
                stock_text = cell(row, c_stock)
                if stock_text:
                    if variation is None and product.buyable_variations():
                        raise ValueError("produk bervarian: isi stok per varian.")
                    stock = to_int(stock_text, "Stok")
                    if stock != target.stock:
                        diff["Stok"] = (target.stock, stock)
                        target.stock = stock
                shopee = cell(row, c_shopee)
                if shopee and shopee != (product.shopee_url or ""):
                    if not shopee.startswith("http"):
                        raise ValueError("Link Shopee harus diawali https://")
                    diff["Link Shopee"] = (product.shopee_url or "-", shopee)
                    product.shopee_url = shopee
                active_text = cell(row, c_active).lower()
                if active_text in ("ya", "tidak", "yes", "no", "1", "0", "true", "false"):
                    active = active_text in ("ya", "yes", "1", "true")
                    if active != product.is_active:
                        diff["Aktif"] = ("ya" if product.is_active else "tidak", "ya" if active else "tidak")
                        product.is_active = active
            except ValueError as exc:
                errors.append(f"Baris {line_no} ({label}): {exc}")
                continue
            if diff:
                changes.append({"line": line_no, "name": label, "sku": (variation.sku if variation else "") or product.sku,
                                "changes": {k: {"from": a, "to": b} for k, (a, b) in diff.items()}})
                if apply:
                    target.save()
                    if variation:
                        product.save(update_fields=["shopee_url", "is_active"])
                        product.sync_stock_from_variations()
        if not apply:
            transaction.set_rollback(True)
    return Response({"applied": apply, "changes": changes, "errors": errors[:50], "error_count": len(errors)})
