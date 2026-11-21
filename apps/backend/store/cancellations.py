"""Pembatalan pesanan yang sudah dibayar (ala marketplace).

Pembeli: ajukan selama pesanan sudah lunas dan paket BELUM diserahkan ke kurir; pilih alasan + catatan.
Identitas dibuktikan dengan nomor HP saat memesan (sama seperti retur).
Admin: setujui → pesanan Dibatalkan, stok kembali, resi Biteship dibatalkan otomatis → catat pengembalian dana.
       tolak → pesanan lanjut diproses (alasan wajib ditulis untuk pembeli).
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import AuditLog, CancelRequest, Order
from .returns import _public, phone_ok

SHIPPED_SHIPMENT = {"picked", "dropping_off", "delivered", "on_hold", "return_in_transit", "returned"}
OPEN = {"REQUESTED", "APPROVED"}


def eligibility(order: Order) -> dict:
    reason = ""
    existing = getattr(order, "cancel_request", None)
    if existing and existing.status != "WITHDRAWN":
        reason = "Pembatalan untuk pesanan ini sudah diajukan."
    elif order.payment_method == "SHOPEE":
        reason = "Pesanan Shopee dibatalkan lewat aplikasi Shopee."
    elif order.payment_status != "PAID":
        reason = ("Pesanan yang belum dibayar akan batal otomatis setelah batas waktu pembayaran."
                  if order.payment_status == "UNPAID" else "Pesanan ini tidak bisa diajukan pembatalan.")
    elif order.status not in ("PENDING", "PROCESSING") or order.shipment_status in SHIPPED_SHIPMENT:
        reason = "Paket sudah dikirim. Bila ada masalah dengan barang, ajukan pengembalian setelah paket diterima."
    return {"can_request": not reason, "reason": reason}


def serialize(req: CancelRequest, admin: bool = False) -> dict:
    order = req.order
    data = {
        "id": req.pk,
        "order_number": order.order_number,
        "status": req.status,
        "status_label": req.get_status_display(),
        "reason": req.reason,
        "reason_label": req.get_reason_display(),
        "note": req.note,
        "admin_note": req.admin_note,
        "refund_amount": str(req.refund_amount) if req.refund_amount is not None else None,
        "refund_method": req.refund_method,
        "refunded_at": req.refunded_at,
        "history": req.history,
        "created_at": req.created_at,
    }
    if admin:
        data.update({
            "billed_amount": str(order.billed_amount),
            "payment_method": order.payment_method,
            "has_shipment": bool(order.shipment_id) and order.shipment_status not in ("cancelled", ""),
        })
    return data


def _log(req: CancelRequest, code: str, note: str = "", by: str = ""):
    req.history = (req.history or []) + [{
        "status": code,
        "label": dict(CancelRequest.STATUSES).get(code, code),
        "note": note[:300],
        "by": by,
        "at": timezone.now().isoformat(),
    }]


# ---------------------------------------------------------------- pembeli
@api_view(["GET", "POST"])
@_public
@throttle_classes([ScopedRateThrottle])
def buyer_cancel(request, order_number):
    order = get_object_or_404(Order, order_number=order_number)
    req = getattr(order, "cancel_request", None)
    if request.method == "GET":
        return Response({
            "eligibility": eligibility(order),
            "reasons": [{"value": k, "label": v} for k, v in CancelRequest.REASONS],
            "cancel": serialize(req) if req else None,
        })

    d = request.data
    if not phone_ok(order, d.get("phone")):
        return Response({"error": "Nomor HP tidak sama dengan nomor saat memesan."}, status=status.HTTP_403_FORBIDDEN)

    if d.get("action") == "withdraw":
        if not req or req.status != "REQUESTED":
            return Response({"error": "Pengajuan tidak bisa ditarik pada tahap ini."}, status=400)
        req.status = "WITHDRAWN"
        _log(req, "WITHDRAWN", "", "Pembeli")
        req.save()
        AuditLog.objects.create(action="Pembatalan ditarik pembeli", details=order.order_number)
        return Response({"cancel": serialize(req)})

    elig = eligibility(order)
    if not elig["can_request"]:
        return Response({"error": elig["reason"]}, status=400)
    reason = d.get("reason")
    if reason not in dict(CancelRequest.REASONS):
        return Response({"error": "Pilih alasan pembatalan."}, status=400)
    note = str(d.get("note") or "").strip()[:1000]
    if reason == "OTHER" and len(note) < 10:
        return Response({"error": "Jelaskan alasannya minimal 10 karakter."}, status=400)

    if req:  # pengajuan lama yang ditarik → pakai ulang barisnya
        req.reason, req.note, req.status, req.admin_note = reason, note, "REQUESTED", ""
    else:
        req = CancelRequest(order=order, reason=reason, note=note)
    _log(req, "REQUESTED", req.get_reason_display(), "Pembeli")
    req.save()
    AuditLog.objects.create(action="Pembatalan diajukan", details=f"{order.order_number}: {req.get_reason_display()}")
    from .emails import notify_admin_cancel, notify_cancel_status

    notify_admin_cancel(order)
    notify_cancel_status(order)
    return Response({"cancel": serialize(req)}, status=status.HTTP_201_CREATED)


buyer_cancel.cls.throttle_scope = "retur"


# ---------------------------------------------------------------- admin (Seller Center)
def seller_cancel(request, number):
    """POST {action: approve|reject|refund|note, admin_note, refund_amount, refund_method}."""
    order = get_object_or_404(Order, order_number=number)
    req = getattr(order, "cancel_request", None)
    if not req:
        return Response({"error": "Pesanan ini tidak punya pengajuan pembatalan."}, status=404)
    d = request.data
    action = d.get("action")
    note = str(d.get("admin_note") or "").strip()[:1000]
    user = request.user
    by = user.get_full_name() or user.username

    if action == "note":
        req.admin_note = note
        req.save(update_fields=["admin_note", "updated_at"])
        return Response(serialize(req, admin=True))

    if action == "reject":
        if req.status != "REQUESTED":
            return Response({"error": "Hanya pengajuan yang menunggu persetujuan yang bisa ditolak."}, status=400)
        if len(note) < 10:
            return Response({"error": "Tulis alasan penolakan untuk pembeli (min. 10 karakter)."}, status=400)
        req.status, req.admin_note = "REJECTED", note
        _log(req, "REJECTED", note, by)
        req.save()
        AuditLog.objects.create(action="Pembatalan ditolak", details=f"{order.order_number}: {note[:200]}")

    elif action == "approve":
        if req.status != "REQUESTED":
            return Response({"error": "Pengajuan ini sudah diproses."}, status=400)
        if order.shipment_status in SHIPPED_SHIPMENT:
            return Response({"error": "Paket sudah diserahkan ke kurir; tolak pembatalan dan arahkan ke retur."}, status=400)
        # Resi Biteship yang masih aktif dibatalkan dulu supaya ongkir tidak terpotong.
        if order.shipment_id and order.shipment_status not in ("cancelled",):
            from . import shipments

            try:
                shipments.cancel(order, "Pesanan dibatalkan atas permintaan pembeli")
            except shipments.ShipmentError as exc:
                return Response({"error": f"Resi Biteship belum bisa dibatalkan: {exc}"}, status=400)
        from .checkout_service import release_stock

        with transaction.atomic():
            order.refresh_from_db()
            release_stock(order)
            order.status = "CANCELLED"
            order.save(update_fields=["status", "updated_at"])
            req.status = "APPROVED"
            if note:
                req.admin_note = note
            _log(req, "APPROVED", note, by)
            req.save()
        AuditLog.objects.create(action="Pembatalan disetujui", details=f"{order.order_number}: stok dikembalikan")

    elif action == "refund":
        if req.status != "APPROVED":
            return Response({"error": "Setujui pembatalan dulu sebelum mencatat pengembalian dana."}, status=400)
        try:
            amount = Decimal(str(d.get("refund_amount") or "").replace(".", "").replace(",", "."))
        except InvalidOperation:
            return Response({"error": "Isi jumlah dana yang dikembalikan."}, status=400)
        if amount <= 0 or amount > order.billed_amount:
            return Response({"error": "Jumlah dana tidak valid (maks. total yang dibayar)."}, status=400)
        method = str(d.get("refund_method") or "").strip()[:120]
        if len(method) < 3:
            return Response({"error": "Isi metode pengembalian (mis. Refund Midtrans / Transfer BCA)."}, status=400)
        req.status, req.refund_amount, req.refund_method, req.refunded_at = "REFUNDED", amount, method, timezone.now()
        if note:
            req.admin_note = note
        _log(req, "REFUNDED", f"{method}", by)
        req.save()
        order.payment_status = "REFUNDED"
        order.save(update_fields=["payment_status", "updated_at"])
        AuditLog.objects.create(action="Dana pembatalan dikembalikan", details=f"{order.order_number}: Rp{amount} via {method}")
    else:
        return Response({"error": "Aksi tidak dikenal."}, status=400)

    from .emails import notify_cancel_status

    notify_cancel_status(order)
    return Response(serialize(req, admin=True))
