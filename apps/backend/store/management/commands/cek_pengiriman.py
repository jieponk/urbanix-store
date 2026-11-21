"""Perbarui status resi Biteship yang masih berjalan (pengganti webhook).

Akun Biteship dipakai bersama Aneka Foto dan webhook-nya sudah dipakai sistem Aneka Foto
(Biteship hanya mengizinkan satu webhook per event), jadi Urbanix menanyakan status sendiri.
Dijadwalkan cron tiap jam (deploy/remote-update.sh). Biaya: GET pesanan, bukan Tracking API.
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from store import shipments
from store.models import Order

FINAL = ["delivered", "cancelled", "rejected", "returned", "disposed", "courier_not_found"]


class Command(BaseCommand):
    help = "Ambil status terbaru resi Biteship yang belum selesai."

    def handle(self, *args, **opts):
        if not shipments.is_enabled():
            self.stdout.write("Biteship belum aktif, dilewati.")
            return
        since = timezone.now() - timedelta(days=30)
        orders = (Order.objects.exclude(shipment_id="").exclude(shipment_status__in=FINAL)
                  .filter(shipment_created_at__gte=since).order_by("shipment_created_at")[:200])
        changed = failed = 0
        for order in orders:
            before = (order.shipment_status, order.tracking_number, order.status)
            try:
                order = shipments.refresh(order)
            except shipments.ShipmentError as exc:
                failed += 1
                self.stderr.write(f"{order.order_number}: {exc}")
                continue
            if (order.shipment_status, order.tracking_number, order.status) != before:
                changed += 1
                self.stdout.write(f"{order.order_number}: {before[0] or '-'} -> {order.shipment_status}")
        self.stdout.write(f"Selesai: {len(orders)} resi dicek, {changed} berubah, {failed} gagal.")
