#!/usr/bin/env python3
"""
Ambil logo merek otomatis untuk deretan merek di atas footer.

  1. Baca daftar merek dari feed toko (https://urbanix.id/feeds/google-merchant.xml).
  2. Cari logo tiap merek di Wikimedia Commons (utamakan SVG).
  3. Simpan ke apps/storefront/public/brands/<nama-merek>.svg|png.
  4. Buat laporan logo-merek.html untuk dicek sekilas.

Pakai (dari folder repo):
    python3 scripts/ambil-logo-merek.py            # hanya merek yang belum punya logo
    python3 scripts/ambil-logo-merek.py --ulang    # unduh ulang semua

Logo yang salah: hapus filenya, lalu taruh file yang benar dengan nama yang sama.
Hanya butuh Python 3 bawaan (tanpa install apa pun).
"""
from __future__ import annotations

import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEED = "https://urbanix.id/feeds/google-merchant.xml"
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "UrbanixStoreLogoFetcher/1.0 (https://urbanix.id; urbanixstore26@gmail.com)"}
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps" / "storefront" / "public" / "brands"
EXTS = (".svg", ".png", ".webp", ".jpg", ".jpeg")

# Nama sama tapi perusahaan lain (mis. Vanguard = perusahaan investasi): jangan dicari otomatis,
# logonya diisi manual. Tambahkan di sini kalau ketemu kasus serupa.
MANUAL = {"rode", "vanguard", "takara"}
# Judul file Commons yang pasti benar (hasil pencarian sering keliru).
EXACT = {"sony": "File:Sony logo.svg"}


def slug(brand: str) -> str:  # harus sama dengan slug() di components/BrandMarquee.tsx
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", brand.lower()))


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def get(url: str, params: dict | None = None) -> bytes:
    if params:
        url += "?" + urllib.parse.urlencode(params)
    tries = 6
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception as e:  # 502 = situs sedang restart (mis. baru deploy): tunggu lalu coba lagi
            if attempt == tries - 1:
                raise
            print(f"    ({e}; coba lagi dalam 10 detik...)")
            time.sleep(10)
    return b""


def brands_from_feed() -> list[tuple[str, int]]:
    root = ET.fromstring(get(FEED))
    count: dict[str, int] = {}
    for el in root.iter("{http://base.google.com/ns/1.0}brand"):
        name = (el.text or "").strip()
        if name and name.upper() != "URBANIX":
            count[name] = count.get(name, 0) + 1
    return sorted(count.items(), key=lambda x: (-x[1], x[0]))


def find_logo(brand: str) -> str | None:
    """Judul file Commons terbaik untuk logo merek, atau None."""
    data = json.loads(get(API, {
        "action": "query", "list": "search", "srnamespace": 6, "srlimit": 20, "format": "json",
        "srsearch": f'intitle:"{brand}" intitle:logo',
    }))
    best, best_score = None, -1
    for hit in data.get("query", {}).get("search", []):
        title = hit["title"]  # "File:Sony logo.svg"
        t = title.lower()
        name = norm(title[5:].rsplit(".", 1)[0])
        if norm(brand) not in name or "logo" not in t or not t.endswith((".svg", ".png")):
            continue
        if any(w in t for w in ("icon", "favicon", "old", "former", "historic", "1990", "200", "flag", "map")):
            continue
        score = 10 if t.endswith(".svg") else 0
        score += 5 if name.startswith(norm(brand)) else 0
        score -= len(name) - len(norm(brand) + "logo")  # judul pendek = lebih mungkin logo utama
        if score > best_score:
            best, best_score = title, score
    return best


def main() -> None:
    redo = "--ulang" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    print("Membaca daftar merek dari", FEED)
    brands = brands_from_feed()
    print(f"{len(brands)} merek ditemukan.\n")

    rows = []
    for brand, total in brands:
        s = slug(brand)
        existing = [p for p in OUT.glob(s + ".*") if p.suffix.lower() in EXTS]
        if existing and not redo:
            print(f"  = {brand:<20} sudah ada ({existing[0].name})")
            rows.append((brand, total, existing[0].name, "sudah ada"))
            continue
        if s in MANUAL:
            print(f"  · {brand:<20} isi manual: public/brands/{s}.svg|png")
            rows.append((brand, total, None, "isi manual"))
            continue
        try:
            title = EXACT.get(s) or find_logo(brand)
            if not title:
                print(f"  ✗ {brand:<20} tidak ketemu — taruh manual: public/brands/{s}.svg")
                rows.append((brand, total, None, "tidak ketemu"))
                continue
            ext = Path(title).suffix.lower()
            data = get("https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(title[5:]))
            if ext == ".svg" and b"<svg" not in data[:2000] and b"<svg" not in data:
                raise ValueError("bukan file SVG")
            for p in existing:
                p.unlink()
            (OUT / (s + ext)).write_bytes(data)
            print(f"  ✓ {brand:<20} {s + ext}  ({title})")
            rows.append((brand, total, s + ext, title))
            time.sleep(0.5)
        except Exception as e:  # noqa: BLE001
            print(f"  ! {brand:<20} gagal: {e}")
            rows.append((brand, total, None, f"gagal: {e}"))

    report = ROOT / "logo-merek.html"
    def card(b: str, t: int, f: str | None, n: str) -> str:
        img = '<img src="apps/storefront/public/brands/%s">' % html.escape(f) if f else "—"
        return ('<div class="c"><div class="l">%s</div><b>%s</b> <small>%d produk</small><br><small>%s</small></div>'
                % (img, html.escape(b), t, html.escape(n)))

    cards = "".join(card(*r) for r in rows)
    report.write_text(
        "<meta charset=utf-8><title>Cek logo merek</title><style>body{font:14px system-ui;margin:24px}"
        ".g{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}"
        ".c{border:1px solid #ddd;border-radius:12px;padding:12px}.l{height:70px;display:flex;align-items:center;"
        "justify-content:center;background:#f6f7f9;border-radius:8px;margin-bottom:8px}.l img{max-height:48px;max-width:160px}"
        "small{color:#666}</style><h1>Cek logo merek</h1><p>Logo salah → hapus filenya di "
        "apps/storefront/public/brands/ lalu ganti dengan file resmi bernama sama.</p>"
        f'<div class="g">{cards}</div>',
        encoding="utf-8",
    )
    ok = sum(1 for r in rows if r[2])
    print(f"\nSelesai: {ok}/{len(rows)} merek punya logo. Buka {report.name} di browser untuk mengecek.")
    print("Kalau sudah oke:  git add apps/storefront/public/brands && git commit -m 'Logo merek' && git push")


if __name__ == "__main__":
    main()
