"""
Membuat ilustrasi sampul kategori (SVG) di public/categories/.
Gaya: lingkaran warna + bayangan diagonal panjang + objek gelap bergaris tebal.

Jalankan ulang bila ingin mengubah warna/bentuk:
    python scripts/make-category-art.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "categories"
OUT.mkdir(parents=True, exist_ok=True)

INK = "#1a1d26"      # garis tepi
BODY = "#2e3240"     # badan objek
MID = "#474d61"      # detail
LIGHT = "#d6dce8"    # bagian terang
LENS = "#6c63ff"     # kaca lensa
RED = "#ff5b5b"
GOLD = "#ffd23f"
S = f'stroke="{INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"'


def shadow(x1, y1, x2, y2):
    """Bayangan panjang ke kanan-bawah dari kotak (x1,y1)-(x2,y2), dipotong lingkaran."""
    d = 90
    return (
        f'<polygon points="{x2},{y1} {x2 + d},{y1 + d} {x1 + d},{y2 + d} {x1},{y2}" '
        f'fill="#000" fill-opacity="0.13" clip-path="url(#c)"/>'
    )


def lens(cx, cy, r):
    return (
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{BODY}" {S}/>'
        f'<circle cx="{cx}" cy="{cy}" r="{r * 0.66:.1f}" fill="{LENS}" {S}/>'
        f'<path d="M{cx - r * 0.38:.1f} {cy - r * 0.05:.1f} a{r * 0.38:.1f} {r * 0.38:.1f} 0 0 1 {r * 0.3:.1f} -{r * 0.33:.1f}" '
        f'fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'
    )


def svg(color, shadow_box, body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
<defs><clipPath id="c"><circle cx="60" cy="60" r="58"/></clipPath></defs>
<circle cx="60" cy="60" r="58" fill="{color}"/>
{shadow(*shadow_box)}
{body}
</svg>
'''


ART = {
    # Kamera mirrorless
    "kamera": svg("#5bb5f9", (26, 34, 94, 86), f'''
<rect x="48" y="33" width="24" height="12" rx="3" fill="{LIGHT}" {S}/>
<rect x="26" y="42" width="68" height="42" rx="8" fill="{BODY}" {S}/>
<rect x="32" y="37" width="10" height="6" rx="2" fill="{RED}" {S}/>
<rect x="80" y="49" width="8" height="5" rx="1.5" fill="{GOLD}"/>
{lens(60, 64, 16)}'''),

    # Action cam
    "action-cam": svg("#ff6b6b", (34, 34, 86, 88), f'''
<rect x="66" y="31" width="13" height="7" rx="2" fill="{RED}" {S}/>
<rect x="34" y="36" width="52" height="50" rx="10" fill="{BODY}" {S}/>
<rect x="40" y="42" width="16" height="8" rx="2" fill="{MID}"/>
{lens(62, 63, 14)}'''),

    # Drone
    "drone": svg("#4fd1c5", (22, 36, 98, 86), f'''
<path d="M30 46 L48 58 M90 46 L72 58" {S} fill="none"/>
<ellipse cx="30" cy="40" rx="14" ry="3.2" fill="{LIGHT}" {S}/>
<ellipse cx="90" cy="40" rx="14" ry="3.2" fill="{LIGHT}" {S}/>
<rect x="26" y="41" width="8" height="8" rx="2" fill="{RED}" {S}/>
<rect x="86" y="41" width="8" height="8" rx="2" fill="{RED}" {S}/>
<path d="M44 74 Q40 82 36 88 M76 74 Q80 82 84 88" fill="none" stroke="{LIGHT}" stroke-width="5" stroke-linecap="round"/>
<path d="M44 74 Q40 82 36 88 M76 74 Q80 82 84 88" fill="none" {S}/>
<rect x="40" y="52" width="40" height="20" rx="10" fill="#f4f6fb" {S}/>
<rect x="51" y="72" width="18" height="12" rx="3" fill="{BODY}" {S}/>
<circle cx="60" cy="78" r="3.6" fill="{LENS}" stroke="{INK}" stroke-width="2"/>'''),

    # Mikrofon studio
    "audio-mic": svg("#a78bfa", (40, 24, 80, 96), f'''
<path d="M60 82 V92" {S}/>
<ellipse cx="60" cy="94" rx="18" ry="4" fill="{BODY}" {S}/>
<path d="M40 46 V58 a20 20 0 0 0 40 0 V46" fill="none" {S}/>
<path d="M40 52 H47 M73 52 H80" {S}/>
<rect x="47" y="24" width="26" height="46" rx="13" fill="{BODY}" {S}/>
{"".join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="{LIGHT}"/>' for y in range(32, 52, 5) for x in range(53, 69, 5))}
<rect x="47" y="56" width="26" height="5" fill="{MID}"/>'''),

    # Ransel kamera
    "tas-case": svg("#f6893b", (34, 26, 86, 94), f'''
<path d="M50 34 V27 a4 4 0 0 1 4 -4 h12 a4 4 0 0 1 4 4 V34" fill="none" {S}/>
<path d="M82 46 q8 12 2 34" fill="none" {S}/>
<rect x="34" y="32" width="50" height="60" rx="14" fill="{BODY}" {S}/>
<rect x="41" y="60" width="36" height="26" rx="7" fill="{MID}" {S}/>
<rect x="45" y="56" width="6" height="10" rx="2" fill="{RED}" {S}/>
<rect x="67" y="56" width="6" height="10" rx="2" fill="{RED}" {S}/>
<path d="M50 44 H68" stroke="{LIGHT}" stroke-width="3" stroke-linecap="round"/>'''),

    # Lensa
    "lensa-filter": svg("#ffc93c", (32, 32, 88, 88), f'''
<circle cx="60" cy="60" r="28" fill="{BODY}" {S}/>
{"".join(f'<path d="M{60 + 24 * __import__("math").cos(a / 12 * 3.1416):.1f} {60 + 24 * __import__("math").sin(a / 12 * 3.1416):.1f} L{60 + 28 * __import__("math").cos(a / 12 * 3.1416):.1f} {60 + 28 * __import__("math").sin(a / 12 * 3.1416):.1f}" stroke="{MID}" stroke-width="2.4"/>' for a in range(24))}
<circle cx="60" cy="60" r="21" fill="{MID}" {S}/>
{lens(60, 60, 15)}'''),

    # Tripod
    "stabilizer-tripod": svg("#8bcb4a", (32, 26, 88, 96), f'''
<path d="M60 48 L36 94 M60 48 L84 94 M60 48 L60 96" stroke="{INK}" stroke-width="4.2" stroke-linecap="round" fill="none"/>
<path d="M60 48 L36 94 M60 48 L84 94" stroke="{LIGHT}" stroke-width="1.6" fill="none"/>
<rect x="44" y="28" width="32" height="12" rx="4" fill="{BODY}" {S}/>
<rect x="54" y="38" width="12" height="14" rx="3" fill="{MID}" {S}/>
<path d="M76 34 H90" {S}/>
<circle cx="60" cy="68" r="4" fill="{RED}" {S}/>'''),

    # Lampu LED panel
    "lighting-studio": svg("#ffb020", (30, 26, 90, 96), f'''
<path d="M60 74 V92 M48 96 H72" {S}/>
<path d="M60 92 L48 96 M60 92 L72 96" {S}/>
<rect x="30" y="28" width="60" height="44" rx="7" fill="{BODY}" {S}/>
<rect x="36" y="34" width="48" height="32" rx="4" fill="#fff6d6" stroke="{INK}" stroke-width="2"/>
{"".join(f'<circle cx="{x}" cy="{y}" r="2" fill="#ffd23f"/>' for y in range(40, 64, 7) for x in range(42, 84, 7))}'''),

    # Monitor siaran + sinyal
    "streaming-video": svg("#4f8ef7", (26, 24, 94, 94), f'''
<path d="M78 30 a10 10 0 0 1 10 -10 M74 30 a16 16 0 0 1 16 -16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
<path d="M72 36 V26" {S}/>
<circle cx="72" cy="25" r="3" fill="{RED}" {S}/>
<path d="M60 78 V88 M46 92 H74" {S}/>
<rect x="26" y="36" width="68" height="44" rx="6" fill="{BODY}" {S}/>
<rect x="32" y="42" width="56" height="32" rx="3" fill="{LENS}" stroke="{INK}" stroke-width="2"/>
<path d="M55 50 L69 58 L55 66 Z" fill="#fff"/>'''),

    # Kartu memori
    "memory-gadget": svg("#ffa94d", (36, 26, 84, 94), f'''
<path d="M42 26 H74 L84 36 V88 a4 4 0 0 1 -4 4 H40 a4 4 0 0 1 -4 -4 V32 a6 6 0 0 1 6 -6 Z" fill="{BODY}" {S}/>
{"".join(f'<rect x="{x}" y="30" width="5" height="12" rx="1" fill="{GOLD}" stroke="{INK}" stroke-width="1.6"/>' for x in range(44, 76, 7))}
<rect x="42" y="50" width="36" height="34" rx="4" fill="{MID}" {S}/>
<text x="60" y="73" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="15" fill="#fff">SD</text>'''),

    # Baterai (aksesori)
    "aksesori-kamera": svg("#f06eaa", (34, 26, 86, 94), f'''
<rect x="48" y="26" width="24" height="8" rx="2" fill="{MID}" {S}/>
<rect x="34" y="32" width="52" height="60" rx="9" fill="{BODY}" {S}/>
<rect x="42" y="40" width="36" height="44" rx="5" fill="{RED}" {S}/>
<path d="M63 46 L51 64 H60 L56 78 L70 58 H61 Z" fill="{GOLD}" stroke="{INK}" stroke-width="2.4" stroke-linejoin="round"/>'''),

    # Kamera CCTV
    "cctv-keamanan": svg("#34c38f", (24, 34, 96, 92), f'''
<path d="M34 86 H50 M42 86 V70 L56 62" {S} fill="none"/>
<rect x="30" y="80" width="24" height="10" rx="2" fill="{MID}" {S}/>
<g transform="rotate(-14 62 52)">
<rect x="36" y="38" width="56" height="26" rx="6" fill="{LIGHT}" {S}/>
<rect x="36" y="38" width="56" height="8" rx="4" fill="{BODY}" {S}/>
<rect x="86" y="44" width="10" height="16" rx="3" fill="{BODY}" {S}/>
<circle cx="90" cy="52" r="3.5" fill="{LENS}" stroke="{INK}" stroke-width="2"/>
<circle cx="44" cy="54" r="2.8" fill="{RED}"/>
</g>'''),

    # Webcam di atas layar
    "webcam-komputer": svg("#7c83fd", (24, 24, 96, 96), f'''
<rect x="24" y="58" width="72" height="36" rx="5" fill="{LIGHT}" {S}/>
<rect x="30" y="64" width="60" height="24" rx="3" fill="{MID}" stroke="{INK}" stroke-width="2"/>
<path d="M50 58 L54 50 H66 L70 58" fill="{BODY}" {S}/>
<rect x="38" y="26" width="44" height="26" rx="13" fill="{BODY}" {S}/>
{lens(60, 39, 9)}
<circle cx="74" cy="34" r="2" fill="{RED}"/>'''),

    # Kado (layanan tambahan / lainnya)
    "lainnya": svg("#94a3b8", (30, 28, 90, 92), f'''
<path d="M60 44 C48 26 34 34 44 44 M60 44 C72 26 86 34 76 44" fill="none" {S}/>
<rect x="34" y="54" width="52" height="38" rx="5" fill="{BODY}" {S}/>
<rect x="30" y="44" width="60" height="14" rx="4" fill="{MID}" {S}/>
<rect x="54" y="44" width="12" height="48" fill="{RED}" {S}/>'''),
}

for slug, content in ART.items():
    (OUT / f"{slug}.svg").write_text(content, encoding="utf-8")
print(f"{len(ART)} ilustrasi ditulis ke {OUT}")
