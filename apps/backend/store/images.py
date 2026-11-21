"""Ubah gambar upload (JPG/PNG/GIF/WebP) menjadi WebP yang lebih ringan.

- Orientasi foto HP (EXIF) dirapikan dulu.
- Gambar yang lebih besar dari `max_side` diperkecil (rasio tetap).
- Transparansi PNG tetap dipertahankan; GIF bergerak tetap bergerak (WebP animasi).
"""
from __future__ import annotations

import io
from pathlib import PurePath

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

QUALITY = 82
# Batas sisi terpanjang per jenis gambar (px).
MAX_BANNER = 2400
MAX_COVER = 1600
MAX_BODY = 1600

Image.MAX_IMAGE_PIXELS = 60_000_000  # tolak gambar raksasa yang mencurigakan


class ImageError(ValueError):
    pass


def _fit(im: Image.Image, max_side: int) -> Image.Image:
    if max(im.size) > max_side:
        im = im.copy()
        im.thumbnail((max_side, max_side), Image.LANCZOS)
    return im


def _mode(im: Image.Image) -> Image.Image:
    has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
    return im.convert("RGBA" if has_alpha else "RGB")


def to_webp(upload, max_side: int = MAX_COVER) -> ContentFile:
    """Mengembalikan ContentFile berformat .webp. Melempar ImageError bila file bukan gambar."""
    try:
        upload.seek(0)
    except (AttributeError, OSError):
        pass
    try:
        im = Image.open(upload)
        im.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ImageError("File bukan gambar yang valid.") from exc

    stem = PurePath(getattr(upload, "name", "") or "gambar").stem[:80] or "gambar"
    out = io.BytesIO()
    frames = getattr(im, "n_frames", 1)
    if frames > 1:  # GIF/WebP bergerak
        imgs, durations = [], []
        for i in range(frames):
            im.seek(i)
            imgs.append(_fit(_mode(im), max_side))
            durations.append(im.info.get("duration", 100))
        imgs[0].save(out, "WEBP", save_all=True, append_images=imgs[1:], duration=durations,
                     loop=im.info.get("loop", 0), quality=QUALITY, method=4)
    else:
        im = ImageOps.exif_transpose(im)
        _fit(_mode(im), max_side).save(out, "WEBP", quality=QUALITY, method=6)
    return ContentFile(out.getvalue(), name=f"{stem}.webp")
