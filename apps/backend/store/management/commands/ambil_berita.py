from django.core.management.base import BaseCommand

from store import news


class Command(BaseCommand):
    help = "Ambil berita kamera & fotografi dari semua sumber aktif lalu terjemahkan ke Bahasa Indonesia."

    def add_arguments(self, parser):
        parser.add_argument("--semua", action="store_true", help="Ambil semua sumber walau belum 2 jam.")

    def handle(self, *args, **opts):
        report = news.refresh_all(force=opts["semua"])
        for name, count in report.items():
            self.stdout.write(f"{name}: {count} berita baru")
        if not report:
            self.stdout.write("Semua sumber masih baru (diambil < 2 jam lalu). Pakai --semua untuk paksa.")
        if not news.deepl_key():
            self.stdout.write(self.style.WARNING("DEEPL_API_KEY kosong: berita bahasa Inggris belum diterjemahkan."))
