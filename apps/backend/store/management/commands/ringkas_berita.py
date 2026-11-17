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
        n = process_pending(opts["maks"])
        self.stdout.write(f"{n} berita selesai dirangkum.")
