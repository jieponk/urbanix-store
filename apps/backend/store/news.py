"""Berita kamera & fotografi dari RSS/Atom, diterjemahkan ke Bahasa Indonesia.

Yang disimpan hanya judul, cuplikan pendek (maks. ~220 huruf) dan link ke artikel asli —
isi lengkap tetap dibaca di situs sumber (hak cipta milik mereka).

Terjemahan memakai DeepL API (isi DEEPL_API_KEY di .env; paket gratis 500.000 huruf/bulan).
Tanpa kunci, berita bahasa Inggris tetap tampil dalam bahasa aslinya dan bisa diterjemahkan
manual di admin.
"""

from __future__ import annotations

import hashlib
import html
import json
import logging
import os
import re
import threading
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone as dt_timezone
from email.utils import parsedate_to_datetime

from django.core.cache import cache
from django.utils import timezone

log = logging.getLogger(__name__)

USER_AGENT = "UrbanixStoreNews/1.0 (+https://urbanix.store)"
MAX_BYTES = 3 * 1024 * 1024
SUMMARY_CHARS = 300
REFRESH_EVERY = timedelta(hours=2)
KEEP_DAYS = 45

ATOM = "{http://www.w3.org/2005/Atom}"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}"
DC = "{http://purl.org/dc/elements/1.1/}"
MEDIA = "{http://search.yahoo.com/mrss/}"


@dataclass
class FeedItem:
    guid: str
    url: str
    title: str
    summary: str
    published_at: datetime
    image: str = ""


# --------------------------------------------------------------------------- teks
_TAG = re.compile(r"<[^>]+>")
_SPACE = re.compile(r"\s+")
_BOILERPLATE = re.compile(r"\s*(The post .+ appeared first on .+|Read more.*|Continue reading.*)$", re.I)


def clean_text(raw: str | None) -> str:
    text = html.unescape(_TAG.sub(" ", raw or ""))
    text = _SPACE.sub(" ", text).strip()
    return _BOILERPLATE.sub("", text).strip()


def shorten(text: str, limit: int = SUMMARY_CHARS) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0].rstrip(",;:-–")
    return cut + "…"


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.strip()
    try:
        dt = parsedate_to_datetime(value)  # RSS: "Mon, 09 Nov 2026 06:00:00 +0000"
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))  # Atom: ISO 8601
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=dt_timezone.utc)
    return dt


_IMG = re.compile(r"""<img[^>]+src=["']([^"']+)["']""", re.I)


def _image_from(element, *html_bits: str | None) -> str:
    """Gambar sampul dari RSS: media:content / media:thumbnail / enclosure / <img> pertama di isi."""
    for tag in (f"{MEDIA}content", f"{MEDIA}thumbnail"):
        for el in element.iter(tag):
            url = el.get("url", "")
            kind = el.get("medium") or el.get("type") or "image"
            if url.startswith("http") and "image" in kind:
                return url
    for el in element.findall("enclosure"):
        if el.get("url", "").startswith("http") and el.get("type", "image").startswith("image"):
            return el.get("url")
    for bit in html_bits:
        match = _IMG.search(bit or "")
        if match and match.group(1).startswith("http"):
            return html.unescape(match.group(1))
    return ""


# --------------------------------------------------------------------------- feed
def parse_feed(data: bytes, google_news: bool = False) -> list[FeedItem]:
    """Baca RSS 2.0 atau Atom. Item tanpa judul/link dilewati."""
    root = ET.fromstring(data)
    items: list[FeedItem] = []
    now = timezone.now()

    if root.tag == f"{ATOM}feed":
        for entry in root.findall(f"{ATOM}entry"):
            link = ""
            for el in entry.findall(f"{ATOM}link"):
                if el.get("rel", "alternate") == "alternate" and el.get("href"):
                    link = el.get("href")
                    break
            title = clean_text(entry.findtext(f"{ATOM}title"))
            raw_summary = entry.findtext(f"{ATOM}summary")
            raw_content = entry.findtext(f"{ATOM}content")
            summary = clean_text(raw_summary or raw_content)
            image = _image_from(entry, raw_summary, raw_content)
            date = _parse_date(entry.findtext(f"{ATOM}published") or entry.findtext(f"{ATOM}updated"))
            guid = (entry.findtext(f"{ATOM}id") or link).strip()
            if title and link:
                items.append(FeedItem(guid, link, title, summary, date or now, image))
        return items

    channel = root.find("channel")
    for item in (channel.findall("item") if channel is not None else []):
        link = (item.findtext("link") or "").strip()
        title = clean_text(item.findtext("title"))
        raw_desc = item.findtext("description")
        raw_content = item.findtext(f"{CONTENT}encoded")
        summary = clean_text(raw_desc or raw_content)
        image = _image_from(item, raw_desc, raw_content)
        date = _parse_date(item.findtext("pubDate") or item.findtext(f"{DC}date"))
        guid = (item.findtext("guid") or link).strip()
        if google_news:
            # Judul Google News: "Judul berita - Nama Media"; cuplikannya hanya mengulang judul.
            title = re.sub(r"\s+-\s+[^-]+$", "", title)
            summary = ""
            image = ""
        if title and link:
            items.append(FeedItem(guid, link, title, summary, date or now, image))
    return items


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/xml, */*"})
    with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310 (URL dari admin)
        data = resp.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("Feed terlalu besar.")
    return data


# --------------------------------------------------------------------------- terjemahan
def deepl_key() -> str:
    return os.environ.get("DEEPL_API_KEY", "").strip()


def translate(texts: list[str], source_lang: str = "EN") -> list[str] | None:
    """Terjemahkan ke Bahasa Indonesia lewat DeepL. None kalau kunci belum diisi / gagal."""
    key = deepl_key()
    if not key or not texts:
        return None
    host = "api-free.deepl.com" if key.endswith(":fx") else "api.deepl.com"
    body = json.dumps({"text": texts, "source_lang": source_lang, "target_lang": "ID"}).encode()
    req = urllib.request.Request(
        f"https://{host}/v2/translate",
        data=body,
        headers={"Authorization": f"DeepL-Auth-Key {key}", "Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:  # noqa: S310
            result = json.loads(resp.read())
        out = [t["text"] for t in result["translations"]]
        return out if len(out) == len(texts) else None
    except Exception as exc:  # noqa: BLE001
        log.warning("Terjemahan DeepL gagal: %s", exc)
        return None


def translate_articles(articles) -> int:
    """Terjemahkan berita yang belum diterjemahkan (judul + cuplikan sekaligus satu permintaan)."""
    pending = [a for a in articles if not a.is_translated]
    if not pending:
        return 0
    texts: list[str] = []
    for a in pending:
        texts += [a.original_title, a.original_summary or "-"]
    done = 0
    for start in range(0, len(texts), 50):  # DeepL: maks. 50 teks per permintaan
        chunk = translate(texts[start:start + 50])
        if chunk is None:
            break
        for i in range(0, len(chunk), 2):
            article = pending[(start + i) // 2]
            article.title = chunk[i][:300]
            article.summary = "" if not article.original_summary else chunk[i + 1]
            article.is_translated = True
            article.save(update_fields=["title", "summary", "is_translated"])
            done += 1
    return done


# --------------------------------------------------------------------------- ambil & simpan
def fetch_source(source) -> int:
    """Ambil satu sumber. Mengembalikan jumlah berita baru."""
    from .models import NewsArticle

    try:
        items = parse_feed(download(source.feed_url), google_news="news.google." in source.feed_url)
    except Exception as exc:  # noqa: BLE001
        source.last_error = f"{type(exc).__name__}: {exc}"[:255]
        source.last_fetched_at = timezone.now()
        source.save(update_fields=["last_error", "last_fetched_at"])
        log.warning("Gagal ambil berita %s: %s", source.name, exc)
        return 0

    items.sort(key=lambda i: i.published_at, reverse=True)
    cutoff = timezone.now() - timedelta(days=KEEP_DAYS)
    created = []
    for item in items[: source.max_items]:
        if item.published_at < cutoff:
            continue
        guid = item.guid if len(item.guid) <= 500 else hashlib.sha256(item.guid.encode()).hexdigest()
        existing = NewsArticle.objects.filter(guid=guid).first()
        if existing:
            if item.image and not existing.image_url:  # lengkapi gambar berita lama
                existing.image_url = item.image[:1000]
                existing.save(update_fields=["image_url"])
            continue
        summary = shorten(item.summary)
        indonesian = source.language == "id"
        created.append(NewsArticle.objects.create(
            source=source, guid=guid, url=item.url[:1000],
            original_title=item.title[:300], original_summary=summary, image_url=item.image[:1000],
            title=item.title[:300], summary=summary,
            is_translated=indonesian, published_at=item.published_at,
        ))

    translate_articles(created)
    source.last_error = ""
    source.last_fetched_at = timezone.now()
    source.save(update_fields=["last_error", "last_fetched_at"])
    return len(created)


def refresh_all(force: bool = False) -> dict:
    """Ambil semua sumber aktif yang sudah waktunya diperbarui, lalu hapus berita lama."""
    from .models import NewsArticle, NewsSource

    now = timezone.now()
    report = {}
    for source in NewsSource.objects.filter(is_active=True):
        if force or not source.last_fetched_at or now - source.last_fetched_at >= REFRESH_EVERY:
            report[source.name] = fetch_source(source)
    # Coba lagi terjemahan yang dulu gagal (mis. kuota DeepL habis / kunci baru diisi).
    if deepl_key():
        translate_articles(list(NewsArticle.objects.filter(is_translated=False, source__language="en")[:40]))
    NewsArticle.objects.filter(published_at__lt=now - timedelta(days=KEEP_DAYS), is_pinned=False).delete()
    return report


def refresh_in_background() -> None:
    """Dipanggil saat halaman berita dibuka: perbarui di latar belakang, maks. sekali per 10 menit."""
    from .models import NewsSource

    stale_before = timezone.now() - REFRESH_EVERY
    has_stale = NewsSource.objects.filter(is_active=True).exclude(last_fetched_at__gte=stale_before).exists()
    if not has_stale or not cache.add("news-refresh-lock", 1, timeout=600):
        return

    def run():
        from django.db import connection

        try:
            refresh_all()
        except Exception:  # noqa: BLE001
            log.exception("Pembaruan berita gagal")
        finally:
            connection.close()

    threading.Thread(target=run, daemon=True).start()
