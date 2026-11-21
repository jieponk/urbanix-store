"""Terjemahan isi toko ke Bahasa Inggris (tombol bahasa ID/EN di storefront).

Cara kerja:
- Storefront meminta API dengan ?lang=en.
- `ContentLanguageMiddleware` mengganti teks tertentu (nama & deskripsi produk, kategori, artikel, voucher)
  dengan terjemahan dari tabel ContentTranslation. Teks yang belum ada terjemahannya tetap tampil
  dalam Bahasa Indonesia dan dimasukkan ke antrean.
- Perintah `python manage.py terjemahkan_konten` mengisi antrean lewat DeepL (kunci DEEPL_API_KEY yang
  sama dengan berita), dibatasi CONTENT_I18N_MAX_CHARS huruf per jalan supaya kuota aman.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import urllib.error
import urllib.request

from django.utils import timezone

from .news import USER_AGENT, deepl_key

log = logging.getLogger(__name__)

LANGS = {"en": "EN-US"}

# Jalur API → kunci JSON yang diterjemahkan (berlaku di objek mana pun di dalam respons).
RULES: list[tuple[str, set[str]]] = [
    ("/api/v1/products/", {"name", "description", "category_name", "promo_name"}),
    ("/api/v1/categories/", {"name", "description"}),
    ("/api/v1/article-categories/", {"name"}),
    ("/api/v1/articles/", {"title", "excerpt", "body", "name", "category_name"}),
    ("/api/v1/vouchers/", {"title", "headline", "terms"}),
    ("/api/v1/store-settings/", {"headline", "terms"}),
]
# Bagian yang jangan diterjemahkan (nama varian seperti "2TX+2RX", komentar pembeli, dll.).
SKIP_KEYS = {"variations", "comments", "tags", "author_name", "source", "code", "slug", "sku"}

_URLISH = re.compile(r"^(https?://|/|[\w.-]+@)")


def text_key(lang: str, text: str) -> str:
    return hashlib.sha256(f"{lang}\n{text}".encode()).hexdigest()


def worth_translating(text) -> bool:
    if not isinstance(text, str):
        return False
    t = text.strip()
    if len(t) < 2 or _URLISH.match(t) or not re.search(r"[A-Za-z]{2}", t):
        return False
    return True


def keys_for(path: str) -> set[str] | None:
    for prefix, keys in RULES:
        if path.startswith(prefix):
            return keys
    return None


def _walk(node, keys: set[str], found: list, parent_key: str | None = None):
    """Kumpulkan (wadah, kunci/indeks, teks) untuk semua teks yang perlu diterjemahkan."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k in SKIP_KEYS:
                continue
            if k in keys and worth_translating(v):
                found.append((node, k, v))
            elif k in keys and isinstance(v, list):
                for i, item in enumerate(v):
                    if worth_translating(item):
                        found.append((v, i, item))
            else:
                _walk(v, keys, found, k)
    elif isinstance(node, list):
        for item in node:
            _walk(item, keys, found, parent_key)


def apply_translations(data, keys: set[str], lang: str):
    """Ganti teks dengan terjemahan yang sudah ada; antrekan yang belum. Mengubah `data` langsung."""
    from .models import ContentTranslation

    found: list = []
    _walk(data, keys, found)
    if not found:
        return data
    by_key = {text_key(lang, text): text for _, _, text in found}
    done = dict(
        ContentTranslation.objects.filter(key__in=list(by_key), status="done").values_list("key", "text")
    )
    missing = [k for k in by_key if k not in done]
    if missing:
        existing = set(ContentTranslation.objects.filter(key__in=missing).values_list("key", flat=True))
        ContentTranslation.objects.bulk_create(
            [ContentTranslation(key=k, lang=lang, source=by_key[k]) for k in missing if k not in existing],
            ignore_conflicts=True,
        )
    for container, k, text in found:
        translated = done.get(text_key(lang, text))
        if translated:
            container[k] = translated
    return data


class ContentLanguageMiddleware:
    """Terapkan terjemahan isi pada respons API GET bila diminta ?lang=en."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        lang = request.GET.get("lang", "")
        if lang not in LANGS or request.method != "GET" or response.status_code != 200:
            return response
        keys = keys_for(request.path)
        if not keys or "application/json" not in response.get("Content-Type", ""):
            return response
        try:
            data = json.loads(response.content)
            apply_translations(data, keys, lang)
            response.content = json.dumps(data, ensure_ascii=False).encode()
            response["Content-Length"] = str(len(response.content))
            response["Content-Language"] = lang
        except Exception:  # noqa: BLE001 - terjemahan tidak boleh membuat API gagal
            log.exception("Terjemahan isi gagal untuk %s", request.path)
        return response


# --------------------------------------------------------------------------- DeepL (ID → EN)
_PROTECT = re.compile(r"(\[\[[^\]]+\]\]|^:::[^\n]*$|\{[0-9]{4}\}|`[^`]+`|https?://\S+)", re.M)


def _protect(text: str) -> str:
    """Escape XML lalu bungkus token khusus (kartu produk, blok :::, kode, link) supaya tidak diterjemahkan."""
    out, last = [], 0
    for m in _PROTECT.finditer(text):
        out.append(_esc(text[last : m.start()]))
        out.append(f"<x>{_esc(m.group(0))}</x>")
        last = m.end()
    out.append(_esc(text[last:]))
    return "".join(out)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _unprotect(text: str) -> str:
    text = re.sub(r"</?x>", "", text)
    return text.replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&")


class QuotaExceeded(Exception):
    pass


def deepl_translate(texts: list[str], lang: str = "en") -> list[str]:
    key = deepl_key()
    if not key:
        raise RuntimeError("DEEPL_API_KEY kosong.")
    host = "api-free.deepl.com" if key.endswith(":fx") else "api.deepl.com"
    body = json.dumps({
        "text": [_protect(t) for t in texts],
        "source_lang": "ID",
        "target_lang": LANGS[lang],
        "tag_handling": "xml",
        "ignore_tags": ["x"],
        "preserve_formatting": True,
    }).encode()
    req = urllib.request.Request(
        f"https://{host}/v2/translate",
        data=body,
        headers={"Authorization": f"DeepL-Auth-Key {key}", "Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310
            result = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        if exc.code == 456:
            raise QuotaExceeded("Kuota DeepL bulan ini habis.") from exc
        raise
    out = [_unprotect(t["text"]) for t in result["translations"]]
    if len(out) != len(texts):
        raise RuntimeError("Jumlah hasil DeepL tidak cocok.")
    return out


def max_chars() -> int:
    try:
        return max(0, int(os.environ.get("CONTENT_I18N_MAX_CHARS", "60000")))
    except ValueError:
        return 60000


def translate_pending(limit_chars: int | None = None) -> tuple[int, int]:
    """Isi antrean terjemahan. Mengembalikan (jumlah teks, jumlah huruf)."""
    from .models import ContentTranslation

    budget = max_chars() if limit_chars is None else limit_chars
    done_items = done_chars = 0
    batch, batch_chars = [], 0

    def flush():
        nonlocal done_items, done_chars, batch, batch_chars
        if not batch:
            return
        results = deepl_translate([b.source for b in batch], batch[0].lang)
        now = timezone.now()
        for item, text in zip(batch, results):
            item.text, item.status, item.updated_at = text, "done", now
        ContentTranslation.objects.bulk_update(batch, ["text", "status", "updated_at"])
        done_items += len(batch)
        done_chars += batch_chars
        batch, batch_chars = [], 0

    for item in ContentTranslation.objects.filter(status="pending").order_by("created_at").iterator():
        size = len(item.source)
        if done_chars + batch_chars + size > budget:
            break
        if size > 60000:  # terlalu panjang untuk satu permintaan
            item.status = "failed"
            item.save()
            continue
        batch.append(item)
        batch_chars += size
        if len(batch) >= 40 or batch_chars >= 25000:
            flush()
    flush()
    return done_items, done_chars
