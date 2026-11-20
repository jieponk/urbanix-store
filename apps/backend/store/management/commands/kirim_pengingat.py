from django.core.management.base import BaseCommand

from store.emails import send_payment_reminders, send_review_requests


class Command(BaseCommand):
    help = "Pengingat bayar, minta ulasan, dan batal otomatis pesanan WhatsApp belum lunas (cron tiap jam)."

    def handle(self, *args, **options):
        sent = send_payment_reminders()
        self.stdout.write(f"Pengingat bayar terkirim: {sent}")
        asked = send_review_requests()
        self.stdout.write(f"Email minta ulasan terkirim: {asked}")
        from store.order_events import cancel_unpaid_whatsapp

        cancelled = cancel_unpaid_whatsapp()
        self.stdout.write(f"Pesanan WhatsApp belum lunas dibatalkan otomatis: {len(cancelled)}")
