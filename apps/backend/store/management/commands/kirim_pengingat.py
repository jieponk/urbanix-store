from django.core.management.base import BaseCommand

from store.emails import send_payment_reminders, send_review_requests


class Command(BaseCommand):
    help = "Kirim email pengingat bayar & email minta ulasan (dijalankan cron tiap jam)."

    def handle(self, *args, **options):
        sent = send_payment_reminders()
        self.stdout.write(f"Pengingat bayar terkirim: {sent}")
        asked = send_review_requests()
        self.stdout.write(f"Email minta ulasan terkirim: {asked}")
