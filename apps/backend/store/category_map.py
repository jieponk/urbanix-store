"""Pemetaan kategori mentah (hasil salin Shopee) ke kategori toko yang bersih.

Contoh kategori mentah:
    "101094 - Cameras & Drones/Cameras/Action Cameras"

Dipakai oleh seed_shopee dan regroup_categories supaya menu kategori di
storefront ringkas (sekitar 10 kategori), bukan 44 kategori acak.
"""

DEFAULT_CATEGORY = "Lainnya"

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
    ("Cameras & Drones/Cameras/", "Kamera"),
    ("Camera Accessories", "Aksesori Kamera"),
    ("Camera Care", "Aksesori Kamera"),
]


CLEAN_NAMES = {clean for _, clean in RULES} | {DEFAULT_CATEGORY}


def clean_category(raw_name):
    """Ubah nama kategori mentah menjadi nama kategori utama yang bersih.

    Nama yang sudah bersih (misalnya "Kamera") dikembalikan apa adanya, sehingga
    aman dijalankan berulang kali.
    """
    raw = (raw_name or "").strip()
    if not raw:
        return DEFAULT_CATEGORY
    if raw in CLEAN_NAMES:
        return raw

    for needle, clean in RULES:
        if needle in raw:
            return clean

    return DEFAULT_CATEGORY
