"""Perbaikan data deskripsi produk (dipakai perintah `perbaiki_deskripsi`).

1. Kalimat garansi yang menyebut merek lain (sisa template supplier), mis. Amaran "bergaransi resmi Plaud".
2. Deskripsi berbahasa Inggris diterjemahkan ke Bahasa Indonesia dengan AI (rantai penyedia di news_ai);
   teks asli disimpan di Product.description_original.
"""
from __future__ import annotations

import re

# Sama dengan daftar merek di storefront (src/lib/seo.ts → BRANDS).
BRANDS = ['Sony', 'Canon', 'Nikon', 'Fujifilm', 'Panasonic', 'Lumix', 'DJI', 'GoPro', 'Insta360', 'Godox', 'RODE', 'Sigma', 'Tamron', 'Zhiyun', 'Leica', 'OM System', 'Olympus', 'Hasselblad', 'Ricoh', 'Pentax', 'Blackmagic', 'Saramonic', 'Boya', 'Ulanzi', 'SmallRig', 'Viltrox', 'Yongnuo', 'Samyang', 'Laowa', 'Aputure', 'Amaran', 'Nanlite', 'Hollyland', 'SanDisk', 'Lexar', 'Peak Design', 'K&F Concept', 'K&F', 'Feiyu', 'Hohem', 'Moza', 'Benro', 'Manfrotto', 'Joby', 'Synco', 'Comica', 'Deity', 'Shure', 'Elgato', 'Logitech', 'Anker', 'Ugreen', 'Baseus', 'Kingston', 'Samsung', 'Xiaomi', 'Ezviz', 'Imou', 'TP-Link', 'Instax', 'Kodak', 'Vanguard', 'Yashica', 'Timekettle', 'PX', 'Lowepro', 'Takara', '7Artisans', 'TTArtisan', 'Desview', 'Rokid', 'RayNeo', 'SBOX', 'CineTreak', 'Everbrait', 'Feelworld', 'Enabot', 'Neewer', 'Plaud', 'Mova', 'Accsoon', 'Fotopro', 'Lomography', 'Medeli', 'iSnap', 'Beike', 'Obsbot', 'Akaso', 'Avangarde', 'Escura', 'Tilta', 'Sirui', 'Nitecore', 'Maono', 'Fifine', 'Tascam', 'Jupio']


def detect_brand(name: str) -> str | None:
    """Merek = yang paling awal disebut di nama produk (mis. "Viltrox ... untuk Sony" -> Viltrox)."""
    text = " " + re.sub(r"^\s*URBANIX\s*-\s*", "", name or "", flags=re.I).lower() + " "
    best = None
    for brand in BRANDS:
        m = re.search(r"[^a-z0-9]" + re.escape(brand.lower()) + r"(?=[^a-z0-9])", text)
        if m and (best is None or m.start() < best[1] or (m.start() == best[1] and len(brand) > len(best[0]))):
            best = (brand, m.start())
    return best[0] if best else None


_WARRANTY = re.compile(r"(garansi\s+resmi\s+)([A-Za-z0-9&]+(?:\s?360)?)", re.I)


def fix_warranty_brand(text: str, name: str) -> str:
    own = detect_brand(name)
    if not own or not text:
        return text

    def repl(m):
        said = m.group(2)
        known = next((b for b in BRANDS if b.lower().replace(" ", "") == said.lower().replace(" ", "")), None)
        if not known or known.lower() == own.lower():
            return m.group(0)
        return m.group(1) + own

    return _WARRANTY.sub(repl, text)


_EN = {"the", "and", "with", "your", "for", "this", "is", "of", "to", "you", "are", "from", "that", "it"}
_ID = {"dan", "dengan", "untuk", "yang", "ini", "dari", "anda", "kamu", "tidak", "bisa", "dapat", "pada"}


def looks_english(text: str) -> bool:
    words = re.findall(r"[a-z]+", (text or "").lower())
    en = sum(w in _EN for w in words)
    idn = sum(w in _ID for w in words)
    return en > 8 and en > idn * 1.5


TRANSLATE_PROMPT = """Terjemahkan deskripsi produk toko kamera di bawah ini ke Bahasa Indonesia yang natural & rapi.

Aturan WAJIB:
- Pertahankan susunan baris persis: satu baris sumber = satu baris hasil, baris kosong tetap kosong, tanda bullet/nomor tetap.
- Baris judul bagian (mis. "Key Feature", "Spesifikasi", "Specification", "Isi dalam Paket", "In the Box",
  "Garansi Resmi", "Warranty") TIDAK diterjemahkan, tulis persis seperti aslinya.
- Nama produk, merek, model, angka, satuan (mm, f/2.8, 4K, mAh, W, g), dan istilah teknis umum (autofocus, gimbal,
  bitrate, codec) tetap seperti aslinya.
- Jangan menambah, mengurangi, atau mengarang informasi. Jangan menambah kalimat promosi.
- Balas HANYA teks terjemahannya, tanpa pengantar atau tanda kutip.

Deskripsi:
\"\"\"
{text}
\"\"\"
"""


def translate_description(text: str) -> str:
    from .news_ai import _call_ai

    out = _call_ai(TRANSLATE_PROMPT.replace("{text}", text[:9000])).strip()
    out = re.sub(r'^(\"\"\"|```)\s*|\s*(\"\"\"|```)$', "", out).strip()
    # Hasil terlalu pendek / berbeda jauh jumlah barisnya = kemungkinan gagal → jangan dipakai.
    if len(out) < len(text) * 0.5 or abs(out.count("\n") - text.count("\n")) > max(3, text.count("\n") * 0.3):
        raise ValueError("hasil terjemahan tidak utuh")
    return out
