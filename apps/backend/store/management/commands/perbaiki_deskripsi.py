"""Periksa & perbaiki deskripsi produk.

  python manage.py perbaiki_deskripsi                      # laporan saja (tidak mengubah apa pun)
  python manage.py perbaiki_deskripsi --simpan             # betulkan merek salah di kalimat garansi
  python manage.py perbaiki_deskripsi --terjemahkan --maks 10 --simpan
                                                           # terjemahkan deskripsi Inggris → Indonesia (AI gratis)
  python manage.py perbaiki_deskripsi --pulihkan --simpan  # kembalikan deskripsi asli yang sudah diterjemahkan
"""
import time

from django.core.management.base import BaseCommand

from store.models import Product
from store.product_fix import fix_warranty_brand, looks_english, translate_description


class Command(BaseCommand):
    help = "Laporan & perbaikan deskripsi produk: merek garansi yang salah, terjemahan Inggris → Indonesia."

    def add_arguments(self, parser):
        parser.add_argument("--simpan", action="store_true", help="Benar-benar menyimpan perubahan (tanpa ini: hanya laporan)")
        parser.add_argument("--terjemahkan", action="store_true", help="Terjemahkan deskripsi berbahasa Inggris dengan AI")
        parser.add_argument("--maks", type=int, default=10, help="Maks. produk yang diterjemahkan per jalan (default 10)")
        parser.add_argument("--pulihkan", action="store_true", help="Kembalikan deskripsi asli dari cadangan")

    def handle(self, *args, **o):
        save = o["simpan"]
        products = list(Product.objects.order_by("-id"))

        if o["pulihkan"]:
            backed = [p for p in products if p.description_original]
            for p in backed:
                if save:
                    p.description, p.description_original = p.description_original, ""
                    p.save(update_fields=["description", "description_original"])
            self.stdout.write(f"{len(backed)} deskripsi {'dipulihkan' if save else 'bisa dipulihkan (tambah --simpan)'}.")
            return

        # 1. Merek salah di kalimat garansi
        wrong = []
        for p in products:
            fixed = fix_warranty_brand(p.description or "", p.name)
            if fixed != (p.description or ""):
                wrong.append((p, fixed))
        self.stdout.write(f"Merek salah di kalimat garansi: {len(wrong)} produk")
        for p, fixed in wrong:
            self.stdout.write(f"  #{p.id} {p.name[:70]}")
            if save:
                p.description = fixed
                p.save(update_fields=["description"])
        if wrong and not save:
            self.stdout.write("  (belum disimpan; jalankan lagi dengan --simpan)")

        # 2. Deskripsi berbahasa Inggris
        english = [p for p in products if looks_english(p.description or "")]
        self.stdout.write(f"Deskripsi berbahasa Inggris: {len(english)} produk")
        if not o["terjemahkan"]:
            if english:
                self.stdout.write("  (terjemahkan dengan --terjemahkan --maks 10 --simpan, bertahap)")
            return

        from store.news_ai import chain, delay_seconds

        if not chain():
            self.stderr.write("Belum ada kunci AI (jalankan deploy/set-ai.sh dulu).")
            return
        done = 0
        pause = delay_seconds()
        for i, p in enumerate(english[: o["maks"]]):
            if i and pause:
                time.sleep(pause)
            started = time.monotonic()
            try:
                out = translate_description(p.description)
            except Exception as exc:  # noqa: BLE001 — lanjut ke produk berikutnya, laporkan alasannya
                self.stdout.write(f"  [gagal] #{p.id} {p.name[:60]} — {str(exc)[:120]}")
                continue
            done += 1
            self.stdout.write(f"  [ok] #{p.id} {p.name[:60]} ({time.monotonic() - started:.0f} dtk)")
            if save:
                p.description_original = p.description_original or p.description
                p.description = out
                p.save(update_fields=["description", "description_original"])
            elif done == 1:
                self.stdout.write("  Contoh hasil (belum disimpan):\n" + "\n".join("    " + line for line in out.splitlines()[:8]))
        sisa = max(0, len(english) - (done if save else 0))
        self.stdout.write(f"{done} deskripsi {'diterjemahkan & disimpan' if save else 'berhasil dicoba (tambah --simpan)'}. Sisa Inggris: {sisa}.")
