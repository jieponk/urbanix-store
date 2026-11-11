from django.core.management.base import BaseCommand, CommandError

from store import news


class Command(BaseCommand):
    help = "Uji kunci DeepL, lalu (dengan --terjemahkan) terjemahkan semua berita yang belum diterjemahkan."

    def add_arguments(self, parser):
        parser.add_argument("--terjemahkan", action="store_true", help="Terjemahkan semua berita yang tertunda.")

    def handle(self, *args, **opts):
        ok, message = news.check_key()
        if not ok:
            raise CommandError(message)
        self.stdout.write(self.style.SUCCESS(message))
        if opts["terjemahkan"]:
            count = news.translate_all_pending()
            self.stdout.write(f"Berita yang baru diterjemahkan: {count}")
