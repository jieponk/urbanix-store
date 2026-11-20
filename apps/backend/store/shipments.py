"""Resi otomatis lewat Biteship Order API.

Alur: admin klik "Buat resi" di Seller Center → POST /v1/orders → nomor resi (waybill) tersimpan di pesanan.
Status paket diperbarui lewat webhook Biteship. Isi webhook TIDAK dipercaya begitu saja: server selalu
mengambil ulang data pesanan dari Biteship (GET /v1/orders/:id) dengan kunci API sendiri.
Biteship tidak menyediakan API label, jadi label dicetak dari halaman Seller Center.
"""
import logging
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from . import ongkir
from .models import AuditLog, Order, StoreSettings

logger = logging.getLogger(__name__)

# Status Biteship → label & status pesanan toko
STATUS_LABELS = {
    "confirmed": "Resi dibuat",
    "scheduled": "Dijadwalkan",
    "allocated": "Kurir ditugaskan",
    "picking_up": "Kurir menuju gudang",
    "picked": "Paket diterima kurir",
    "dropping_off": "Sedang diantar",
    "return_in_transit": "Dalam perjalanan kembali",
    "returned": "Dikembalikan ke toko",
    "rejected": "Ditolak",
    "disposed": "Paket dimusnahkan",
    "courier_not_found": "Kurir tidak ditemukan",
    "delivered": "Sudah sampai",
    "cancelled": "Dibatalkan",
    "on_hold": "Ditahan",
}
SHIPPED_STATUSES = {"picked", "dropping_off"}
CANCELLABLE = {"confirmed", "scheduled", "allocated", "picking_up", ""}
CATEGORY = "electronic"


class ShipmentError(Exception):
    """Pesan aman untuk admin."""


def is_enabled(store=None) -> bool:
    return ongkir.is_configured(store)


def sender(store) -> dict:
    phone = (store.ship_sender_phone or store.whatsapp_number or "").strip()
    return {
        "name": (store.ship_sender_name or "Urbanix Store").strip(),
        "phone": phone,
        "address": (store.ship_sender_address or "").strip(),
        "postal_code": (store.ship_sender_postal_code or "").strip(),
    }


def can_create(order: Order) -> str:
    """Alasan tidak bisa dibuat resi ("" = bisa)."""
    if order.shipment_id and order.shipment_status not in ("cancelled", "rejected", "courier_not_found"):
        return "Resi pesanan ini sudah dibuat."
    if order.status == "CANCELLED":
        return "Pesanan sudah dibatalkan."
    if order.payment_status != "PAID":
        return "Tandai pesanan Lunas dulu sebelum membuat resi."
    if not (order.shipping_auto and ":" in order.shipping_service and order.shipping_destination_id):
        return "Pesanan ini memakai kurir manual (ongkir dari admin). Buat resinya langsung di aplikasi kurir."
    return ""


def _payload(order: Order, store, method: str) -> dict:
    s = sender(store)
    if not (s["phone"] and s["address"] and store.ongkir_origin_id):
        raise ShipmentError("Lengkapi data pengirim & asal pengiriman di Seller Center → Pengaturan.")
    courier, service = order.shipping_service.split(":", 1)
    items = []
    for item in order.items.all():
        items.append({
            "name": (f"{item.product_name} - {item.variation_name}" if item.variation_name else item.product_name)[:100],
            "sku": (item.sku or "")[:50],
            "value": int(item.price_snapshot),
            "quantity": int(item.quantity),
            "weight": int(item.weight_grams or ongkir.FALLBACK_ITEM_WEIGHT),
            "category": CATEGORY,
        })
    address = ", ".join(p for p in [order.shipping_address, order.shipping_city, order.shipping_province] if p)
    attempt = Order.objects.filter(pk=order.pk).values_list("shipment_id", flat=True).first()
    reference = order.order_number if not attempt else f"{order.order_number}-{timezone.now():%H%M%S}"
    payload = {
        "shipper_contact_name": s["name"],
        "shipper_contact_phone": s["phone"],
        "shipper_organization": s["name"],
        "origin_contact_name": s["name"],
        "origin_contact_phone": s["phone"],
        "origin_address": s["address"],
        "origin_area_id": store.ongkir_origin_id,
        "origin_collection_method": method,
        "destination_contact_name": order.customer_name[:100],
        "destination_contact_phone": order.customer_phone,
        "destination_address": address[:500],
        "destination_area_id": order.shipping_destination_id,
        "destination_note": (order.notes or "")[:200],
        "courier_company": courier,
        "courier_type": service,
        "delivery_type": "now",
        "order_note": f"Pesanan {order.order_number}",
        "reference_id": reference,
        "metadata": {"order_number": order.order_number},
        "items": items,
    }
    if s["postal_code"].isdigit():
        payload["origin_postal_code"] = int(s["postal_code"])
    if (order.shipping_postal_code or "").isdigit():
        payload["destination_postal_code"] = int(order.shipping_postal_code)
    if order.customer_email:
        payload["destination_contact_email"] = order.customer_email
    return payload


def _apply(order: Order, data: dict) -> list[str]:
    """Salin data pesanan Biteship ke pesanan toko. Kembalikan nama field yang berubah."""
    courier = data.get("courier") or {}
    changes = {}
    status = str(data.get("status") or "")[:30]
    if status:
        changes["shipment_status"] = status
    waybill = str(courier.get("waybill_id") or "").strip()[:80]
    if waybill:
        changes["tracking_number"] = waybill
    if data.get("price") is not None:
        try:
            changes["shipment_price"] = Decimal(str(data["price"]))
        except Exception:
            pass
    company = str(courier.get("company") or "").strip()
    if company and not order.shipping_courier:
        changes["shipping_courier"] = company.upper()[:50]
    if status in SHIPPED_STATUSES and order.status in ("PENDING", "PROCESSING"):
        changes["status"] = "SHIPPED"
    if status == "delivered" and order.status in ("PENDING", "PROCESSING", "SHIPPED"):
        changes["status"] = "COMPLETED"
    fields = []
    for name, value in changes.items():
        if getattr(order, name) != value:
            setattr(order, name, value)
            fields.append(name)
    return fields


def create(order: Order, method: str | None = None) -> Order:
    store = StoreSettings.load()
    if not is_enabled(store):
        raise ShipmentError("Biteship belum aktif. Pasang kunci API & asal pengiriman dulu.")
    reason = can_create(order)
    if reason:
        raise ShipmentError(reason)
    method = method or store.ship_collection_method or "drop_off"
    if method not in ("drop_off", "pickup"):
        raise ShipmentError("Cara serah paket tidak dikenal.")
    payload = _payload(order, store, method)
    try:
        data = ongkir._request("POST", "orders", json=payload)
    except ongkir.OngkirError as exc:
        raise ShipmentError(f"Biteship menolak: {exc.detail or exc}")
    shipment_id = str(data.get("id") or "")
    if not shipment_id:
        raise ShipmentError("Biteship tidak mengembalikan ID pengiriman. Cek dashboard Biteship.")
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        order.shipment_id = shipment_id[:60]
        order.shipment_method = method
        order.shipment_created_at = timezone.now()
        fields = ["shipment_id", "shipment_method", "shipment_created_at"] + _apply(order, data)
        if order.status == "PENDING":
            order.status = "PROCESSING"
            fields.append("status")
        order.save(update_fields=list(dict.fromkeys(fields)) + ["updated_at"])
        AuditLog.objects.create(action="SHIPMENT_CREATED",
                                details=f"Resi Biteship {shipment_id} untuk {order.order_number} ({method}).")
    _after_change(order)
    return order


def refresh(order: Order) -> Order:
    if not order.shipment_id:
        raise ShipmentError("Pesanan ini belum punya resi Biteship.")
    try:
        data = ongkir._request("GET", f"orders/{order.shipment_id}")
    except ongkir.OngkirError as exc:
        raise ShipmentError(f"Gagal mengambil status dari Biteship: {exc.detail or exc}")
    with transaction.atomic():
        order = Order.objects.select_for_update().get(pk=order.pk)
        fields = _apply(order, data)
        if fields:
            order.save(update_fields=fields + ["updated_at"])
    _after_change(order)
    return order


def cancel(order: Order, reason: str = "") -> Order:
    if not order.shipment_id:
        raise ShipmentError("Pesanan ini belum punya resi Biteship.")
    if order.shipment_status not in CANCELLABLE:
        raise ShipmentError("Paket sudah diambil/diantar kurir, resi tidak bisa dibatalkan lagi.")
    body = {"cancellation_reason_code": "others", "cancellation_reason": (reason or "Dibatalkan oleh penjual")[:200]}
    try:
        ongkir._request("POST", f"orders/{order.shipment_id}/cancel", json=body)
    except ongkir.OngkirError as exc:
        raise ShipmentError(f"Biteship menolak pembatalan: {exc.detail or exc}")
    order.shipment_status = "cancelled"
    order.tracking_number = ""
    order.save(update_fields=["shipment_status", "tracking_number", "updated_at"])
    AuditLog.objects.create(action="SHIPMENT_CANCELLED", details=f"Resi Biteship {order.shipment_id} dibatalkan.")
    return order


def handle_webhook(payload: dict) -> str:
    """Webhook Biteship: hanya dipakai sebagai pemicu; data diambil ulang dari API."""
    shipment_id = str((payload or {}).get("order_id") or "")
    if not shipment_id:
        return "ok"  # uji koneksi dari dashboard Biteship
    order = Order.objects.filter(shipment_id=shipment_id).first()
    if not order:
        return "unknown"
    try:
        refresh(order)
    except ShipmentError:
        logger.warning("Webhook Biteship: gagal refresh %s", shipment_id)
        return "retry"
    return "ok"


def _after_change(order: Order):
    from .emails import notify_shipped  # email "paket dikirim" (sekali, butuh status Dikirim + resi)

    notify_shipped(order)


def summary(order: Order) -> dict:
    return {
        "enabled": is_enabled(),
        "id": order.shipment_id,
        "status": order.shipment_status,
        "status_label": STATUS_LABELS.get(order.shipment_status, order.shipment_status),
        "method": order.shipment_method,
        "price": str(order.shipment_price) if order.shipment_price is not None else None,
        "created_at": order.shipment_created_at,
        "can_create_reason": can_create(order),
        "can_cancel": bool(order.shipment_id) and order.shipment_status in CANCELLABLE,
    }
