from django.core.management.base import BaseCommand

from store.emails import send_payment_reminders, send_review_requests


class Command(BaseCommand):
    help = "Pengingat bayar, minta ulasan, dan batal otomatis pesanan belum lunas (WhatsApp & web) — cron tiap jam."

    def handle(self, *args, **options):
        sent = send_payment_reminders()
        self.stdout.write(f"Pengingat bayar terkirim: {sent}")
        asked = send_review_requests()
        self.stdout.write(f"Email minta ulasan terkirim: {asked}")
        from store.order_events import cancel_unpaid_whatsapp

        cancelled = cancel_unpaid_whatsapp()
        self.stdout.write(f"Pesanan WhatsApp belum lunas dibatalkan otomatis: {len(cancelled)}")
        from store.order_events import cancel_unpaid_web

        web = cancel_unpaid_web()
        self.stdout.write(f"Pesanan web dibatalkan: {len(web['cancelled'])}; lunas dari cek status: {len(web['paid'])}")
