"""Pemetaan kategori mentah (hasil salin Shopee) ke kategori toko yang bersih.

Contoh kategori mentah:
    "101094 - Cameras & Drones/Cameras/Action Cameras"

Dipakai oleh seed_shopee dan regroup_categories supaya menu kategori di
storefront ringkas (sekitar 10 kategori), bukan 44 kategori acak.
"""

DEFAULT_CATEGORY = "Lainnya"

import re

# Aturan berdasarkan NAMA produk, dicek lebih dulu karena kategori Shopee sering
# kurang tepat (mis. video switcher di "Amplifiers & Mixers", teleprompter di
# "Monitors", tripod di "Musical Instruments").
# Jalur kategori Shopee yang sudah pasti benar: dicek sebelum aturan nama.
PRIORITY_PATH_RULES = [
    ("Cameras & Drones/Drone", "Drone"),
]

NAME_RULES = [
    (r"note ?taker|voice recorder|perekam suara", "Audio & Mic"),
    (r"teleprompter", "Streaming & Video"),
    (r"video (switcher|mixer)|live (video )?switcher|mixer switcher|streaming switcher", "Streaming & Video"),
    (r"wireless video|video transmi|cineview|pyro s\b", "Streaming & Video"),
    (r"\btripod\b", "Stabilizer & Tripod"),
    (r"card reader", "Memory & Gadget"),
    (r"translator|smart ?glass|ai glasses|ar glasses|kacamata", "Memory & Gadget"),
    (r"kertas kado|gift wrap|bubble wrap", "Lainnya"),
]

# Urutan penting: aturan yang lebih spesifik ditaruh lebih dulu.
# Setiap aturan: (potongan teks pada path kategori mentah, nama kategori bersih)
RULES = [
    ("Action Cameras", "Action Cam"),
    ("/Drones", "Drone"),
    ("Drone Accessories", "Drone"),
    ("Lens Accessories", "Lensa & Filter"),
    ("/Lenses", "Lensa & Filter"),
    ("Cases & Bags", "Tas & Case"),
    ("Gimbals", "Stabilizer & Tripod"),
    ("Tripods", "Stabilizer & Tripod"),
    ("Flashes", "Lighting & Studio"),
    ("Lighting & Studio", "Lighting & Studio"),
    ("Security Cameras", "CCTV & Keamanan"),
    ("Webcams", "Webcam & Komputer"),
    ("Video Conference", "Webcam & Komputer"),
    ("Monitors", "Webcam & Komputer"),
    ("Desktop & Laptop Components", "Webcam & Komputer"),
    ("Memory Cards", "Memory & Gadget"),
    ("Wearable Devices", "Memory & Gadget"),
    ("VR Devices", "Memory & Gadget"),
    ("Audio/", "Audio & Mic"),
    ("Musical Instruments", "Audio & Mic"),
    ("Women Bags", "Tas & Case"),
    ("Cooler Bag", "Tas & Case"),
    ("Eyewear", "Memory & Gadget"),
    ("Cameras & Drones/Cameras/", "Kamera"),
    ("Camera Accessories", "Aksesori Kamera"),
    ("Camera Care", "Aksesori Kamera"),
]


CLEAN_NAMES = (
    {clean for _, clean in RULES} | {clean for _, clean in NAME_RULES} | {DEFAULT_CATEGORY}
)


def clean_category(raw_name, product_name=""):
    """Ubah nama kategori mentah menjadi nama kategori utama yang bersih.

    Nama yang sudah bersih (misalnya "Kamera") dikembalikan apa adanya, sehingga
    aman dijalankan berulang kali.
    """
    for needle, clean in PRIORITY_PATH_RULES:
        if needle in (raw_name or ""):
            return clean

    name = (product_name or "").lower()
    for pattern, clean in NAME_RULES:
        if name and re.search(pattern, name):
            return clean

    raw = (raw_name or "").strip()
    if not raw:
        return DEFAULT_CATEGORY
    if raw in CLEAN_NAMES:
        return raw

    for needle, clean in RULES:
        if needle in raw:
            return clean

    return DEFAULT_CATEGORY
