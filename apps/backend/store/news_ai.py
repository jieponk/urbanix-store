"""Artikel lengkap versi Urbanix, inti berita, kesimpulan, dan opini buatan AI (Claude) untuk /berita/<id>.

- Teks artikel sumber hanya dipakai sebagai BAHAN untuk AI; yang disimpan & ditampilkan adalah
  tulisan baru (poin-poin dengan kata sendiri), bukan salinan artikel.
- Sumber yang diberi izin "teks penuh" (siaran pers / ada izin tertulis) boleh ditampilkan lengkap.
- Penyedia AI (NEWS_AI_PROVIDER di .env):
    anthropic (berbayar)  : ANTHROPIC_API_KEY
    groq      (gratis)    : NEWS_AI_API_KEY dari console.groq.com
    gemini    (gratis)    : NEWS_AI_API_KEY dari aistudio.google.com
  Tanpa kunci, fitur ini diam saja (berita tetap tampil seperti biasa).
- Biaya/kuota dikendalikan dengan NEWS_AI_MAX_PER_RUN (default 8 berita per pembaruan) dan
  NEWS_AI_DELAY (jeda detik antar berita, supaya tidak melewati batas gratis per menit).
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

# Penyedia gratis memakai format "OpenAI-compatible" (chat/completions). Model bisa diganti lewat NEWS_AI_MODEL.
PROVIDERS = {
    "groq": {"url": "https://api.groq.com/openai/v1/chat/completions", "model": "openai/gpt-oss-120b", "delay": 45},
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "model": "gemini-flash-latest",
        "delay": 15,
    },
}
MAX_SOURCE_CHARS = 12000
FULL_TEXT_CHARS = 20000
MIN_MATERIAL = 200


def provider() -> str:
    p = os.environ.get("NEWS_AI_PROVIDER", "").strip().lower()
    return p if p in PROVIDERS else "anthropic"


def api_key() -> str:
    if provider() == "anthropic":
        return (os.environ.get("ANTHROPIC_API_KEY", "") or os.environ.get("NEWS_AI_API_KEY", "")).strip()
    return os.environ.get("NEWS_AI_API_KEY", "").strip()


def model_name() -> str:
    custom = os.environ.get("NEWS_AI_MODEL", "").strip()
    if custom:
        return custom
    return PROVIDERS[provider()]["model"] if provider() in PROVIDERS else DEFAULT_MODEL


def delay_seconds() -> float:
    try:
        return max(0.0, min(300.0, float(os.environ.get("NEWS_AI_DELAY", ""))))
    except ValueError:
        return float(PROVIDERS.get(provider(), {}).get("delay", 0))


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
- "artikel": artikel berita LENGKAP versi Urbanix, 4-6 paragraf (total 280-480 kata), dipisah baris kosong. Boleh 1-2 subjudul yang diawali "## ". Susunan: pembuka (apa & siapa), detail fitur/spesifikasi, harga & ketersediaan bila disebut, konteks untuk kreator Indonesia. Kalimat & susunan harus BARU, jangan mengikuti urutan paragraf sumber.
- "poin": 4-6 poin penting (apa yang diumumkan, fitur/spesifikasi kunci, harga & ketersediaan bila disebut, untuk siapa). Tiap poin 1 kalimat, maks 30 kata.
- "kesimpulan": 2 kalimat inti beritanya.
- "opini": 2-3 kalimat pendapat Urbanix sebagai toko gear: siapa yang cocok, apakah layak ditunggu/dibandingkan dengan alternatif. Jelas sebagai pendapat ("menurut kami ..."), tidak menjelekkan merek, tidak menjanjikan stok.
- Kalau berita BUKAN soal kamera, lensa, foto/video, drone, audio kreator, atau aksesorinya, isi "lewati": true.

Balas HANYA JSON valid tanpa teks lain, format:
{"lewati": false, "artikel": "...", "poin": ["..."], "kesimpulan": "...", "opini": "..."}

Judul: {title}
Sumber: {source}
Cuplikan RSS: {summary}

Teks sumber:
\"\"\"
{body}
\"\"\"
"""


def _call_ai(prompt: str) -> str:
    """Kirim prompt ke penyedia AI yang dipilih, kembalikan teks balasannya."""
    if provider() in PROVIDERS:
        return _call_openai_compatible(prompt)
    return _call_claude(prompt)


def _call_openai_compatible(prompt: str) -> str:
    conf = PROVIDERS[provider()]
    model = model_name()
    body = {
        "model": model,
        "max_tokens": 4096,  # model "berpikir" (gpt-oss, Gemini) ikut memakai jatah token ini
        "temperature": 0.4,
        "messages": [{"role": "user", "content": prompt}],
    }
    if "gpt-oss" in model or model.startswith("gemini"):
        body["reasoning_effort"] = "low"
    req = urllib.request.Request(conf["url"], data=json.dumps(body).encode(), method="POST", headers={
        "content-type": "application/json",
        "authorization": f"Bearer {api_key()}",
    })
    with urllib.request.urlopen(req, timeout=90) as resp:  # noqa: S310 (alamat tetap)
        data = json.loads(resp.read().decode())
    choices = data.get("choices") or [{}]
    return str((choices[0].get("message") or {}).get("content") or "")


def _call_claude(prompt: str) -> str:
    payload = json.dumps({
        "model": model_name(),
        "max_tokens": 2200,
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
    return {"skip": False, "points": points, "conclusion": conclusion, "opinion": opinion,
            "body": clean_article(data.get("artikel"))}


def clean_article(raw) -> str:
    """Rapikan artikel AI: paragraf dipisah baris kosong, subjudul "## ", maks. ±6.000 huruf. Terlalu pendek = kosong."""
    paras = []
    for block in re.split(r"\n\s*\n", str(raw or "")):
        text = re.sub(r"\s+", " ", block).strip()
        if not text:
            continue
        if text.startswith("#"):
            text = "## " + text.lstrip("# ").strip()[:120]
        paras.append(text[:1500])
    body = "\n\n".join(paras)[:6000].strip()
    return body if len(body) >= 400 else ""


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
    # Bahan terlalu sedikit (mis. link Google News yang hanya berisi judul) → jangan dipaksa jadi artikel;
    # status "skip" juga menyembunyikan berita ini dari daftar.
    if len(material) < MIN_MATERIAL:
        article.ai_status = "skip"
        article.save(update_fields=["body", "ai_status"])
        return "skip"

    prompt = (PROMPT.replace("{title}", article.original_title)
              .replace("{source}", source.name)
              .replace("{summary}", article.original_summary or "-")
              .replace("{body}", material[:MAX_SOURCE_CHARS]))
    try:
        result = parse_reply(_call_ai(prompt))
    except urllib.error.HTTPError as exc:
        log.warning("AI berita ditolak (%s) untuk #%s", exc.code, article.pk)
        # 401/403 = kunci salah; 429/529 = sibuk → coba lagi nanti, jangan tandai gagal permanen
        if exc.code in (400, 404):
            article.ai_status = "failed"
            article.save(update_fields=["body", "ai_status"])
            return "failed"
        return "limited" if exc.code in (401, 403, 429, 529) else "failed"
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
        article.ai_body = result.get("body", "")
        article.ai_status = "done"
        article.ai_generated_at = timezone.now()
    article.save(update_fields=["body", "ai_points", "ai_conclusion", "ai_opinion", "ai_body", "ai_status", "ai_generated_at"])
    return article.ai_status


def process_pending(limit: int | None = None) -> int:
    """Proses berita terbaru yang belum punya inti berita (dibatasi supaya biaya terkendali)."""
    from .models import NewsArticle

    limit = max_per_run() if limit is None else limit
    if limit <= 0:
        return 0
    from django.db.models import Q

    # Belum dirangkum, atau sudah dirangkum versi lama (belum punya artikel lengkap).
    qs = NewsArticle.objects.filter(is_visible=True, source__is_active=True).filter(
        Q(ai_status="pending") | Q(ai_status="done", ai_body="")
    ).select_related("source")
    if not api_key():
        # Tanpa kunci AI: tetap simpan teks penuh untuk sumber yang diizinkan.
        qs = qs.filter(source__full_text_allowed=True, body="", ai_status="pending")
    import time

    done = 0
    pause = delay_seconds() if api_key() else 0
    for i, article in enumerate(qs.order_by("-published_at")[:limit]):
        if i and pause:
            time.sleep(pause)  # jaga batas gratis per menit (Groq/Gemini)
        status = process_article(article)
        if status == "limited":
            log.warning("AI berita berhenti: kunci ditolak atau kuota habis (coba lagi di pembaruan berikutnya).")
            break
        if status == "done":
            done += 1
    return done


def check_key() -> tuple[bool, str]:
    where = {"groq": "console.groq.com", "gemini": "aistudio.google.com"}.get(provider(), "console.anthropic.com")
    if not api_key():
        name = "ANTHROPIC_API_KEY" if provider() == "anthropic" else "NEWS_AI_API_KEY"
        return False, f"{name} kosong (penyedia: {provider()})."
    try:
        reply = _call_ai('Balas hanya JSON: {"ok": true}')
    except urllib.error.HTTPError as exc:
        hint = "kuota gratis habis, tunggu sebentar" if exc.code == 429 else f"cek kunci di {where}"
        return False, f"Ditolak API ({exc.code}): {hint}."
    except Exception as exc:  # noqa: BLE001
        return False, f"Tidak bisa menghubungi API: {exc}"
    return ("ok" in reply), f"{provider()} · model {model_name()} merespons."
