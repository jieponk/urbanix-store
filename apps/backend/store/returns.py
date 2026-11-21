"""Pengembalian barang/dana (retur) ala marketplace.

Pembeli: ajukan maks. `return_window_hours` (bawaan 2×24 jam) setelah paket diterima, pilih alasan,
jelaskan, lampirkan foto resi + video unboxing tanpa potong (atau kirim videonya lewat WhatsApp).
Admin: tinjau → setujui/tolak → barang diterima → dana dikembalikan / barang pengganti dikirim.
Identitas pembeli dibuktikan dengan nomor HP yang dipakai saat pesan.
"""
import re
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .images import ImageError, to_webp
from .models import AuditLog, Order, ReturnRequest, StoreSettings

VIDEO_EXT = (".mp4", ".mov", ".webm", ".m4v", ".3gp", ".mkv")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif")
MAX_PHOTO = 10 * 1024 * 1024
MIN_DESCRIPTION = 20
OPEN = {"REQUESTED", "APPROVED", "RETURN_SHIPPED", "RECEIVED"}


def _digits(value) -> str:
    d = re.sub(r"\D", "", str(value or ""))
    return "0" + d[2:] if d.startswith("62") else d


def phone_ok(order: Order, phone) -> bool:
    given = _digits(phone)
    return len(given) >= 8 and given == _digits(order.customer_phone)


def received_at(order: Order):
    return order.delivered_at or (order.updated_at if order.status == "COMPLETED" else None)


def eligibility(order: Order, store=None) -> dict:
    store = store or StoreSettings.load()
    hours = store.return_window_hours or 48
    got = received_at(order)
    deadline = got + timedelta(hours=hours) if got else None
    reason = ""
    if hasattr(order, "return_request"):
        reason = "Pengembalian untuk pesanan ini sudah diajukan."
    elif order.status != "COMPLETED" and order.shipment_status != "delivered":
        reason = "Pengembalian bisa diajukan setelah paket diterima."
    elif deadline and timezone.now() > deadline:
        reason = f"Batas pengajuan pengembalian ({hours // 24}×24 jam setelah paket diterima) sudah lewat."
    return {
        "can_request": not reason,
        "reason": reason,
        "deadline": deadline,
        "window_hours": hours,
        "video_max_mb": store.return_video_max_mb or 50,
    }


def serialize(ret: ReturnRequest, admin=False) -> dict:
    order = ret.order
    data = {
        "id": ret.pk,
        "order_number": order.order_number,
        "status": ret.status,
        "status_label": ret.get_status_display(),
        "reason": ret.reason,
        "reason_label": ret.get_reason_display(),
        "description": ret.description,
        "resolution": ret.resolution,
        "resolution_label": ret.get_resolution_display(),
        "video_via_whatsapp": ret.video_via_whatsapp,
        "has_video": bool(ret.unboxing_video),
        "admin_note": ret.admin_note,
        "return_courier": ret.return_courier,
        "return_tracking_number": ret.return_tracking_number,
        "refund_amount": str(ret.refund_amount) if ret.refund_amount is not None else None,
        "refund_method": ret.refund_method,
        "replacement_tracking_number": ret.replacement_tracking_number,
        "history": ret.history,
        "created_at": ret.created_at,
        "updated_at": ret.updated_at,
        "items": [
            {"id": i.pk, "name": i.product_name, "variation": i.variation_name, "quantity": i.quantity,
             "price": str(i.price_snapshot)}
            for i in order.items.all() if not ret.item_ids or i.pk in ret.item_ids
        ],
    }
    if admin:
        data.update({
            "waybill_photo": ret.waybill_photo.url if ret.waybill_photo else "",
            "unboxing_video": ret.unboxing_video.url if ret.unboxing_video else "",
            "customer_name": order.customer_name,
            "customer_phone": order.customer_phone,
            "payment_method": order.payment_method,
            "billed_amount": str(order.billed_amount),
            "received_at": received_at(order),
        })
    return data


def _log(ret: ReturnRequest, status_code: str, note: str = "", by: str = ""):
    ret.history = (ret.history or []) + [{
        "status": status_code,
        "label": dict(ReturnRequest.STATUSES).get(status_code, status_code),
        "note": note[:300],
        "by": by,
        "at": timezone.now().isoformat(),
    }]


def _wa_link(order: Order) -> str:
    store = StoreSettings.load()
    wa = "".join(ch for ch in (store.whatsapp_number or "") if ch.isdigit())
    if not wa:
        return ""
    from urllib.parse import quote

    return f"https://wa.me/{wa}?text=" + quote(
        f"Halo admin, saya kirim video unboxing untuk pengajuan retur pesanan {order.order_number}.")


def _public(fn):
    fn = permission_classes([AllowAny])(fn)
    return authentication_classes([])(fn)


# ---------------------------------------------------------------- pembeli
@api_view(["GET", "POST"])
@_public
@parser_classes([MultiPartParser, FormParser, JSONParser])
@throttle_classes([ScopedRateThrottle])
def buyer_return(request, order_number):
    order = get_object_or_404(Order.objects.prefetch_related("items"), order_number=order_number)
    store = StoreSettings.load()
    ret = getattr(order, "return_request", None)

    if request.method == "GET":
        return Response({
            "eligibility": eligibility(order, store),
            "reasons": [{"value": k, "label": v} for k, v in ReturnRequest.REASONS],
            "resolutions": [{"value": k, "label": v} for k, v in ReturnRequest.RESOLUTIONS],
            "items": [{"id": i.pk, "name": i.product_name, "variation": i.variation_name, "quantity": i.quantity}
                      for i in order.items.all()],
            "return": serialize(ret) if ret else None,
            "whatsapp_url": _wa_link(order),
        })

    d = request.data
    if not phone_ok(order, d.get("phone")):
        return Response({"error": "Nomor HP tidak sama dengan nomor saat memesan."}, status=status.HTTP_403_FORBIDDEN)
    action = d.get("action") or "create"

    if action == "ship_back":
        if not ret or ret.status != "APPROVED":
            return Response({"error": "Pengembalian belum disetujui admin."}, status=400)
        tracking = str(d.get("tracking_number") or "").strip()[:80]
        if len(tracking) < 6:
            return Response({"error": "Isi nomor resi pengiriman balik dengan benar."}, status=400)
        ret.return_courier = str(d.get("courier") or "").strip()[:50]
        ret.return_tracking_number = tracking
        ret.status = "RETURN_SHIPPED"
        _log(ret, "RETURN_SHIPPED", f"{ret.return_courier} {tracking}".strip(), "Pembeli")
        ret.save()
        AuditLog.objects.create(action="Retur: pembeli kirim balik", details=f"{order.order_number} resi {tracking}")
        return Response({"return": serialize(ret)})

    if action == "cancel":
        if not ret or ret.status != "REQUESTED":
            return Response({"error": "Pengembalian tidak bisa dibatalkan pada tahap ini."}, status=400)
        ret.status = "CANCELLED"
        _log(ret, "CANCELLED", "", "Pembeli")
        ret.save()
        return Response({"return": serialize(ret)})

    # --- ajukan baru
    elig = eligibility(order, store)
    if not elig["can_request"]:
        return Response({"error": elig["reason"]}, status=400)
    reason = d.get("reason")
    if reason not in dict(ReturnRequest.REASONS):
        return Response({"error": "Pilih alasan pengembalian."}, status=400)
    description = str(d.get("description") or "").strip()
    if len(description) < MIN_DESCRIPTION:
        return Response({"error": f"Jelaskan masalahnya minimal {MIN_DESCRIPTION} karakter."}, status=400)
    resolution = d.get("resolution") if d.get("resolution") in dict(ReturnRequest.RESOLUTIONS) else "REFUND"
    item_ids = []
    raw_items = d.getlist("item_ids") if hasattr(d, "getlist") else d.get("item_ids") or []
    valid = set(order.items.values_list("pk", flat=True))
    for x in raw_items:
        try:
            if int(x) in valid:
                item_ids.append(int(x))
        except (TypeError, ValueError):
            continue

    photo = request.FILES.get("waybill_photo")
    if not photo:
        return Response({"error": "Lampirkan foto resi pengiriman."}, status=400)
    if photo.size > MAX_PHOTO or not photo.name.lower().endswith(IMAGE_EXT):
        return Response({"error": "Foto resi harus JPG/PNG/WEBP maks. 10 MB."}, status=400)
    try:
        photo_file = to_webp(photo, 1600)
    except ImageError as exc:
        return Response({"error": str(exc)}, status=400)

    video = request.FILES.get("unboxing_video")
    via_wa = str(d.get("video_via_whatsapp") or "").lower() in ("1", "true", "on", "yes")
    max_mb = elig["video_max_mb"]
    if video:
        if not video.name.lower().endswith(VIDEO_EXT):
            return Response({"error": "Video harus MP4/MOV/WEBM."}, status=400)
        if video.size > max_mb * 1024 * 1024:
            return Response({"error": f"Video lebih dari {max_mb} MB. Kirim videonya lewat WhatsApp saja."}, status=400)
        via_wa = False
    elif not via_wa:
        return Response({"error": "Lampirkan video unboxing, atau pilih kirim video lewat WhatsApp."}, status=400)

    ret = ReturnRequest(order=order, reason=reason, description=description[:3000], item_ids=item_ids,
                        resolution=resolution, video_via_whatsapp=via_wa)
    ret.waybill_photo.save(photo_file.name, photo_file, save=False)
    if video:
        ret.unboxing_video.save(video.name, video, save=False)
    _log(ret, "REQUESTED", ret.get_reason_display(), "Pembeli")
    ret.save()
    AuditLog.objects.create(action="Retur diajukan", details=f"{order.order_number}: {ret.get_reason_display()}")
    from .emails import notify_admin_return, notify_return_status

    notify_admin_return(order)
    notify_return_status(order)
    return Response({"return": serialize(ret), "whatsapp_url": _wa_link(order) if via_wa else ""},
                    status=status.HTTP_201_CREATED)


buyer_return.cls.throttle_scope = "retur"


# ---------------------------------------------------------------- admin (Seller Center)
def seller_returns(request):
    qs = ReturnRequest.objects.select_related("order").prefetch_related("order__items")
    st = request.query_params.get("status") or ""
    if st == "open":
        qs = qs.filter(status__in=OPEN)
    elif st:
        qs = qs.filter(status=st)
    from django.db.models import Count

    from .seller_api import paginate

    data = paginate(request, qs, lambda r: serialize(r, admin=True))
    data["counts"] = {row["status"]: row["n"] for row in ReturnRequest.objects.values("status").annotate(n=Count("id"))}
    data["status_choices"] = [{"value": k, "label": v} for k, v in ReturnRequest.STATUSES]
    return Response(data)


TRANSITIONS = {
    "approve": ({"REQUESTED"}, "APPROVED"),
    "reject": ({"REQUESTED", "APPROVED", "RETURN_SHIPPED", "RECEIVED"}, "REJECTED"),
    "received": ({"APPROVED", "RETURN_SHIPPED"}, "RECEIVED"),
    "refund": ({"APPROVED", "RETURN_SHIPPED", "RECEIVED"}, "REFUNDED"),
    "replace": ({"APPROVED", "RETURN_SHIPPED", "RECEIVED"}, "REPLACED"),
}


def seller_return_detail(request, pk):
    ret = get_object_or_404(ReturnRequest.objects.select_related("order"), pk=pk)
    if request.method == "POST":
        d = request.data
        action = d.get("action")
        if action == "note":
            ret.admin_note = str(d.get("admin_note") or "")[:1000]
            ret.save(update_fields=["admin_note", "updated_at"])
            return Response(serialize(ret, admin=True))
        if action not in TRANSITIONS:
            return Response({"error": "Aksi tidak dikenal."}, status=400)
        allowed, new_status = TRANSITIONS[action]
        if ret.status not in allowed:
            return Response({"error": f"Tidak bisa dari status '{ret.get_status_display()}'."}, status=400)
        note = str(d.get("admin_note") or "").strip()[:1000]
        if action == "reject" and len(note) < 10:
            return Response({"error": "Tulis alasan penolakan untuk pembeli (min. 10 karakter)."}, status=400)
        if action == "refund":
            try:
                amount = Decimal(str(d.get("refund_amount") or "").replace(".", "").replace(",", "."))
            except InvalidOperation:
                return Response({"error": "Isi jumlah dana yang dikembalikan."}, status=400)
            if amount <= 0 or amount > ret.order.billed_amount:
                return Response({"error": "Jumlah dana tidak valid (maks. total yang dibayar)."}, status=400)
            ret.refund_amount = amount
            ret.refund_method = str(d.get("refund_method") or "").strip()[:120]
        if action == "replace":
            ret.replacement_tracking_number = str(d.get("tracking_number") or "").strip()[:80]
        if note:
            ret.admin_note = note
        ret.status = new_status
        user = request.user
        _log(ret, new_status, note or ret.refund_method or ret.replacement_tracking_number,
             user.get_full_name() or user.username)
        ret.save()
        from .emails import notify_return_status

        notify_return_status(ret.order)
    return Response(serialize(ret, admin=True))
