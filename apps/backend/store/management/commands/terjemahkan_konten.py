from django.core.management.base import BaseCommand, CommandError

from store.content_i18n import QuotaExceeded, translate_pending
from store.models import ContentTranslation
from store.news import deepl_key


class Command(BaseCommand):
    help = "Terjemahkan isi toko (produk, kategori, artikel, voucher) ke Bahasa Inggris lewat DeepL."

    def add_arguments(self, parser):
        parser.add_argument("--maks-huruf", type=int, default=None, help="Batas huruf sekali jalan (default CONTENT_I18N_MAX_CHARS)")

    def handle(self, *args, **opts):
        if not deepl_key():
            raise CommandError("DEEPL_API_KEY belum diisi di server.")
        try:
            items, chars = translate_pending(opts["maks_huruf"])
        except QuotaExceeded as exc:
            raise CommandError(str(exc)) from exc
        left = ContentTranslation.objects.filter(status="pending").count()
        self.stdout.write(f"{items} teks diterjemahkan ({chars} huruf). Sisa antrean: {left}.")
