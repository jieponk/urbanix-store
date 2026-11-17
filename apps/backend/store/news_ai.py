"""Inti berita, kesimpulan, dan opini singkat buatan AI (Claude) untuk halaman /berita/<id>.

- Teks artikel sumber hanya dipakai sebagai BAHAN untuk AI; yang disimpan & ditampilkan adalah
  tulisan baru (poin-poin dengan kata sendiri), bukan salinan artikel.
- Sumber yang diberi izin "teks penuh" (siaran pers / ada izin tertulis) boleh ditampilkan lengkap.
- Kunci: ANTHROPIC_API_KEY di .env. Tanpa kunci, fitur ini diam saja (berita tetap tampil seperti biasa).
- Biaya dikendalikan dengan NEWS_AI_MAX_PER_RUN (default 8 berita per pembaruan).
"""

from __future__ import annotations

import html
import json
import logging
import os
import re
import urllib.error
import urllib.request

from django.utils import timezone

log = logging.getLogger(__name__)

API_URL = "https://api.anthropic.com/v1/messages"
DEFAULT_MODEL = "claude-haiku-5-5"
MAX_SOURCE_CHARS = 12000
FULL_TEXT_CHARS = 20000


def api_key() -> str:
    return os.environ.get("ANTHROPIC_API_KEY", "").strip()


def model_name() -> str:
    return os.environ.get("NEWS_AI_MODEL", "").strip() or DEFAULT_MODEL


def max_per_run() -> int:
    try:
        return max(0, min(50, int(os.environ.get("NEWS_AI_MAX_PER_RUN", "8"))))
    except ValueError:
        return 8


# --------------------------------------------------------------------------- ambil teks artikel
_DROP = re.compile(r"<(script|style|noscript|svg|nav|header|footer|aside|form|figure|iframe)\b.*?</\1>", re.S | re.I)
_PARA = re.compile(r"<(p|h2|h3|li)\b[^>]*>(.*?)</\1>", re.S | re.I)
_TAG = re.compile(r"<[^>]+>")
_NOISE = re.compile(r"(subscribe|newsletter|cookie|sign up|advertisement|all rights reserved|affiliate|commission)", re.I)


def extract_text(raw_html: str) -> str:
    """Ambil paragraf isi artikel dari HTML (sederhana, tanpa pustaka tambahan)."""
    doc = raw_html
    m = re.search(r"<article\b.*?</article>", doc, re.S | re.I)
    if m and len(m.group(0)) > 2000:
        doc = m.group(0)
    doc = _DROP.sub(" ", doc)
    parts = []
    for tag, inner in _PARA.findall(doc):
        text = html.unescape(_TAG.sub(" ", inner))
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) < 40 and tag.lower() == "p":
            continue
        if _NOISE.search(text) and len(text) < 220:
            continue
        parts.append(f"## {text}" if tag.lower() in ("h2", "h3") else text)
    # buang duplikat berurutan
    out = []
    for p in parts:
        if not out or out[-1] != p:
            out.append(p)
    return "\n\n".join(out).strip()


def fetch_article_text(url: str) -> str:
    from .news import download

    try:
        data = download(url)
    except Exception as exc:  # noqa: BLE001
        log.info("Gagal ambil isi berita %s: %s", url, exc)
        return ""
    return extract_text(data.decode("utf-8", errors="replace"))


# --------------------------------------------------------------------------- panggil Claude
PROMPT = """Kamu penulis berita untuk Urbanix Store, toko kamera & gear kreator di Indonesia.
Tulis rangkuman berita di bawah ini untuk pembaca Indonesia (gaya santai tapi rapi, bukan bahasa alay).

Aturan WAJIB:
- Tulis dengan kata-katamu sendiri. JANGAN menyalin kalimat dari teks sumber; kutipan langsung maksimal 10 kata dan paling banyak satu.
- Hanya pakai fakta yang ada di teks sumber. Jangan mengarang spesifikasi, harga Rupiah, tanggal rilis Indonesia, atau stok.
- Kalau teks sumber tidak lengkap, rangkum yang ada saja.
- "poin": 4-6 poin penting (apa yang diumumkan, fitur/spesifikasi kunci, harga & ketersediaan bila disebut, untuk siapa). Tiap poin 1 kalimat, maks 30 kata.
- "kesimpulan": 2 kalimat inti beritanya.
- "opini": 2-3 kalimat pendapat Urbanix sebagai toko gear: siapa yang cocok, apakah layak ditunggu/dibandingkan dengan alternatif. Jelas sebagai pendapat ("menurut kami ..."), tidak menjelekkan merek, tidak menjanjikan stok.
- Kalau berita BUKAN soal kamera, lensa, foto/video, drone, audio kreator, atau aksesorinya, isi "lewati": true.

Balas HANYA JSON valid tanpa teks lain, format:
{"lewati": false, "poin": ["..."], "kesimpulan": "...", "opini": "..."}

Judul: {title}
Sumber: {source}
Cuplikan RSS: {summary}

Teks sumber:
\"\"\"
{body}
\"\"\"
"""


def _call_claude(prompt: str) -> str:
    payload = json.dumps({
        "model": model_name(),
        "max_tokens": 900,
        "temperature": 0.4,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(API_URL, data=payload, method="POST", headers={
        "content-type": "application/json",
        "x-api-key": api_key(),
        "anthropic-version": "2023-06-01",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:  # noqa: S310 (alamat tetap)
        data = json.loads(resp.read().decode())
    return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")


def parse_reply(text: str) -> dict | None:
    """Ambil objek JSON dari balasan AI dan rapikan isinya."""
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except ValueError:
        return None
    if data.get("lewati"):
        return {"skip": True}
    points = [re.sub(r"\s+", " ", str(p)).strip()[:300] for p in data.get("poin") or [] if str(p).strip()][:6]
    conclusion = re.sub(r"\s+", " ", str(data.get("kesimpulan") or "")).strip()[:600]
    opinion = re.sub(r"\s+", " ", str(data.get("opini") or "")).strip()[:700]
    if len(points) < 2 or not conclusion:
        return None
    return {"skip": False, "points": points, "conclusion": conclusion, "opinion": opinion}


# --------------------------------------------------------------------------- proses berita
def process_article(article) -> str:
    """Buat inti berita untuk satu berita. Mengembalikan status akhir."""
    source = article.source
    body = fetch_article_text(article.url) if not article.url.startswith("https://news.google.") else ""
    if source.full_text_allowed and body and not article.body:
        article.body = body[:FULL_TEXT_CHARS]

    if not api_key():
        article.save(update_fields=["body"])
        return article.ai_status

    material = body or article.original_summary
    if len(material) < 80:
        article.ai_status = "skip"
        article.save(update_fields=["body", "ai_status"])
        return "skip"

    prompt = (PROMPT.replace("{title}", article.original_title)
              .replace("{source}", source.name)
              .replace("{summary}", article.original_summary or "-")
              .replace("{body}", material[:MAX_SOURCE_CHARS]))
    try:
        result = parse_reply(_call_claude(prompt))
    except urllib.error.HTTPError as exc:
        log.warning("AI berita ditolak (%s) untuk #%s", exc.code, article.pk)
        # 401/403 = kunci salah; 429/529 = sibuk → coba lagi nanti, jangan tandai gagal permanen
        if exc.code in (400, 404):
            article.ai_status = "failed"
            article.save(update_fields=["body", "ai_status"])
        return "failed"
    except Exception as exc:  # noqa: BLE001
        log.warning("AI berita gagal untuk #%s: %s", article.pk, exc)
        return "failed"

    if result is None:
        article.ai_status = "failed"
    elif result["skip"]:
        article.ai_status = "skip"
    else:
        article.ai_points = result["points"]
        article.ai_conclusion = result["conclusion"]
        article.ai_opinion = result["opinion"]
        article.ai_status = "done"
        article.ai_generated_at = timezone.now()
    article.save(update_fields=["body", "ai_points", "ai_conclusion", "ai_opinion", "ai_status", "ai_generated_at"])
    return article.ai_status


def process_pending(limit: int | None = None) -> int:
    """Proses berita terbaru yang belum punya inti berita (dibatasi supaya biaya terkendali)."""
    from .models import NewsArticle

    limit = max_per_run() if limit is None else limit
    if limit <= 0:
        return 0
    qs = NewsArticle.objects.filter(is_visible=True, source__is_active=True, ai_status="pending").select_related("source")
    if not api_key():
        # Tanpa kunci AI: tetap simpan teks penuh untuk sumber yang diizinkan.
        qs = qs.filter(source__full_text_allowed=True, body="")
    done = 0
    for article in qs.order_by("-published_at")[:limit]:
        if process_article(article) == "done":
            done += 1
    return done


def check_key() -> tuple[bool, str]:
    if not api_key():
        return False, "ANTHROPIC_API_KEY kosong."
    try:
        reply = _call_claude('Balas hanya JSON: {"ok": true}')
    except urllib.error.HTTPError as exc:
        return False, f"Ditolak API ({exc.code}). Cek kunci & saldo kredit di console.anthropic.com."
    except Exception as exc:  # noqa: BLE001
        return False, f"Tidak bisa menghubungi API: {exc}"
    return ("ok" in reply), f"Model {model_name()} merespons."
