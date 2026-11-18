from django.core.management.base import BaseCommand, CommandError

from store.news_ai import check_key, process_pending


class Command(BaseCommand):
    help = "Buat inti berita + opini AI untuk berita yang belum dirangkum. --cek untuk menguji kunci API."

    def add_arguments(self, parser):
        parser.add_argument("--cek", action="store_true", help="Hanya uji ANTHROPIC_API_KEY")
        parser.add_argument("--maks", type=int, default=None, help="Jumlah berita maksimal (default NEWS_AI_MAX_PER_RUN)")

    def handle(self, *args, **opts):
        ok, msg = check_key()
        if not ok:
            raise CommandError(msg)
        self.stdout.write("OK: " + msg)
        if opts["cek"]:
            return
        from store.models import NewsArticle
        from django.db.models import Count

        counts = dict(NewsArticle.objects.values_list("ai_status").annotate(n=Count("id")))
        self.stdout.write(f"Status berita sebelum: {counts}")
        self.stdout.write("Memproses berita (yang bahannya kurang langsung dilewati & disembunyikan)...")
        n = process_pending(opts["maks"], report=lambda line: (self.stdout.write(line), self.stdout.flush()))
        self.stdout.write(f"{n} berita selesai dibuat artikelnya.")
