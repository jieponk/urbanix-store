from django.core.management.base import BaseCommand

from store.emails import send_payment_reminders


class Command(BaseCommand):
    help = "Kirim email pengingat bayar untuk pesanan yang belum lunas (dijalankan cron tiap jam)."

    def handle(self, *args, **options):
        sent = send_payment_reminders()
        self.stdout.write(f"Pengingat bayar terkirim: {sent}")
