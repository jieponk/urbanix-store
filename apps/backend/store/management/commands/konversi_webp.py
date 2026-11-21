"""Ubah gambar yang SUDAH ter-upload (banner, sampul & foto artikel) menjadi WebP.

    python manage.py konversi_webp          # jalankan
    python manage.py konversi_webp --coba   # hanya tampilkan apa yang akan diubah
"""
from pathlib import PurePosixPath

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

from store.images import MAX_BANNER, MAX_BODY, MAX_COVER, ImageError, to_webp
from store.models import Article, Banner

IMAGE_EXT = (".jpg", ".jpeg", ".png", ".gif")


def _walk(folder: str):
    """Semua file di bawah folder storage (rekursif)."""
    try:
        dirs, files = default_storage.listdir(folder)
    except (FileNotFoundError, NotADirectoryError, OSError):
        return
    for f in files:
        yield f"{folder}/{f}"
    for d in dirs:
        yield from _walk(f"{folder}/{d}")


class Command(BaseCommand):
    help = "Ubah gambar yang sudah ter-upload menjadi WebP (banner, sampul artikel, foto di isi artikel)."

    def add_arguments(self, parser):
        parser.add_argument("--coba", action="store_true", help="Hanya tampilkan, tidak mengubah apa pun.")

    def handle(self, *args, **opts):
        dry = opts["coba"]
        self.saved = self.count = self.failed = 0

        for banner in Banner.objects.all():
            for field, limit in (("image", MAX_BANNER), ("mobile_image", MAX_BANNER)):
                self._field(banner, field, limit, dry)
        for article in Article.objects.exclude(cover=""):
            self._field(article, "cover", MAX_COVER, dry)
        self._body_images(dry)

        verb = "Akan diubah" if dry else "Diubah"
        self.stdout.write(self.style.SUCCESS(
            f"{verb}: {self.count} gambar, hemat ±{self.saved // 1024} KB. Gagal: {self.failed}."
        ))

    # ---------------------------------------------------------------- field FileField
    def _field(self, obj, name, limit, dry):
        f = getattr(obj, name)
        if not f or not f.name.lower().endswith(IMAGE_EXT):
            return
        old = f.name
        try:
            with default_storage.open(old, "rb") as fh:
                data = fh.read()
            webp = to_webp(_Named(data, old), limit)
        except (ImageError, OSError) as exc:
            self.failed += 1
            self.stderr.write(f"Lewati {old}: {exc}")
            return
        self.count += 1
        self.saved += max(0, len(data) - webp.size)
        self.stdout.write(f"{old} -> .webp ({len(data) // 1024} KB -> {webp.size // 1024} KB)")
        if dry:
            return
        f.save(PurePosixPath(old).stem + ".webp", webp, save=False)
        obj.save(update_fields=[name])
        default_storage.delete(old)

    # ---------------------------------------------------------------- foto di isi artikel
    def _body_images(self, dry):
        replacements = {}
        for path in _walk("articles/body"):
            if not path.lower().endswith(IMAGE_EXT):
                continue
            try:
                with default_storage.open(path, "rb") as fh:
                    data = fh.read()
                webp = to_webp(_Named(data, path), MAX_BODY)
            except (ImageError, OSError) as exc:
                self.failed += 1
                self.stderr.write(f"Lewati {path}: {exc}")
                continue
            new_path = str(PurePosixPath(path).with_suffix(".webp"))
            self.count += 1
            self.saved += max(0, len(data) - webp.size)
            self.stdout.write(f"{path} -> .webp ({len(data) // 1024} KB -> {webp.size // 1024} KB)")
            if dry:
                continue
            saved_as = default_storage.save(new_path, webp)
            replacements[default_storage.url(path)] = default_storage.url(saved_as)
            default_storage.delete(path)

        if replacements and not dry:
            for article in Article.objects.all():
                body = article.body
                for old_url, new_url in replacements.items():
                    body = body.replace(old_url, new_url)
                if body != article.body:
                    article.body = body
                    article.save(update_fields=["body"])


class _Named:
    """Bungkus bytes agar bisa dibaca Pillow dan punya nama file."""

    def __init__(self, data: bytes, name: str):
        import io

        self._buf = io.BytesIO(data)
        self.name = name

    def read(self, *a):
        return self._buf.read(*a)

    def seek(self, *a):
        return self._buf.seek(*a)

    def tell(self):
        return self._buf.tell()
