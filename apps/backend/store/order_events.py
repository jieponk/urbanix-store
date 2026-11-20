"""Kejadian penting pesanan: lunas, diterima, batal otomatis. Satu tempat supaya alur web & WhatsApp sama.

- mark_paid: dipanggil saat Midtrans melaporkan lunas ATAU admin menandai Lunas (pesanan WhatsApp).
  Pesanan WhatsApp: stok dipotong otomatis (Midtrans sudah memotong saat checkout).
  Email "pembayaran diterima" ke pembeli + notifikasi ke admin.
- mark_delivered: catat waktu paket diterima (awal hitungan batas retur).
- cancel_unpaid_whatsapp: batalkan pesanan WhatsApp yang belum lunas melewati batas jam (cron).
"""
import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import AuditLog, Order, Product, ProductVariation, StoreSettings

logger = logging.getLogger(__name__)


def deduct_stock(order: Order) -> bool:
    """Potong stok sesuai isi pesanan (sekali saja). True bila stok dipotong sekarang."""
    with transaction.atomic():
        locked = Order.objects.select_for_update().get(pk=order.pk)
        if locked.stock_reserved:
            return False
        for item in locked.items.select_related("product", "variation"):
            target_model, pk = (ProductVariation, item.variation_id) if item.variation_id else (Product, item.product_id)
            if not pk:
                continue
            target_model.objects.filter(pk=pk).update(stock=F("stock") - item.quantity)
            target_model.objects.filter(pk=pk, stock__lt=0).update(stock=0)
            if item.variation_id and item.product:
                item.product.sync_stock_from_variations()
        locked.stock_reserved = True
        locked.save(update_fields=["stock_reserved"])
    order.stock_reserved = True
    return True


def mark_paid(order: Order, source: str = "admin") -> None:
    """Panggil SETELAH payment_status disimpan sebagai PAID."""
    from . import emails

    fields = []
    if order.paid_at is None:
        order.paid_at = timezone.now()
        fields.append("paid_at")
    if fields:
        order.save(update_fields=fields)
    if order.payment_method != "MIDTRANS" and deduct_stock(order):
        AuditLog.objects.create(action="Stok dipotong otomatis",
                                details=f"{order.order_number} ditandai Lunas ({source}).")
    emails.notify_paid(order)
    emails.notify_admin_paid(order)


def mark_delivered(order: Order) -> list[str]:
    """Isi delivered_at bila belum ada. Kembalikan field yang berubah (belum disimpan)."""
    if order.delivered_at is None:
        order.delivered_at = timezone.now()
        return ["delivered_at"]
    return []


def cancel_unpaid_whatsapp(now=None) -> list[str]:
    store = StoreSettings.load()
    hours = store.wa_unpaid_cancel_hours or 0
    if hours <= 0:
        return []
    now = now or timezone.now()
    qs = Order.objects.filter(
        payment_method="WHATSAPP", payment_status="UNPAID", status__in=["PENDING", "PROCESSING"],
        created_at__lt=now - timedelta(hours=hours),
    ).exclude(shipment_id__gt="")
    cancelled = []
    for order in qs[:200]:
        from .checkout_service import release_stock

        if order.stock_reserved:
            release_stock(order)
        order.status, order.payment_status = "CANCELLED", "EXPIRED"
        order.save(update_fields=["status", "payment_status", "updated_at"])
        cancelled.append(order.order_number)
    if cancelled:
        AuditLog.objects.create(action="Batal otomatis (belum lunas)",
                                details=f"{len(cancelled)} pesanan WhatsApp > {hours} jam: {', '.join(cancelled[:30])}")
    return cancelled
