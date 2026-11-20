"""Pilihan jasa kirim yang bisa dipilih pembeli saat checkout (ongkir dikonfirmasi admin)."""

SHIPPING_OPTIONS = [
    # kode, grup, kurir, label lengkap
    ("jne_reg", "Reguler", "jne", "JNE Reguler"),
    ("jnt_reg", "Reguler", "jnt", "J&T Express Reguler"),
    ("jne_cargo", "Kargo", "jne", "JNE Cargo (JTR)"),
    ("jnt_cargo", "Kargo", "jnt", "J&T Cargo"),
    ("gosend_instant", "Instan", "gosend", "GoSend Instant"),
    ("gosend_sameday", "Instan", "gosend", "GoSend Same Day"),
    ("grab_instant", "Instan", "grab", "GrabExpress Instant"),
    ("grab_sameday", "Instan", "grab", "GrabExpress Same Day"),
]

SHIPPING_CHOICES = [(code, label) for code, _group, _courier, label in SHIPPING_OPTIONS]
SHIPPING_LABELS = dict(SHIPPING_CHOICES)


AUTO_COURIER_NAMES = {
    "jne": "JNE", "jnt": "J&T Express", "sicepat": "SiCepat", "anteraja": "AnterAja", "pos": "POS Indonesia",
    "tiki": "TIKI", "ninja": "Ninja Xpress", "lion": "Lion Parcel", "ide": "ID Express", "sap": "SAP Express",
    "wahana": "Wahana",
}


def shipping_label(code: str) -> str:
    code = code or ""
    if ":" in code:  # tarif otomatis RajaOngkir, mis. "jne:REG"
        courier, service = code.split(":", 1)
        return f"{AUTO_COURIER_NAMES.get(courier, courier.upper())} {service}"
    return SHIPPING_LABELS.get(code, "")


# ---------------------------------------------------------------- berat kirim
VOLUME_DIVISOR = 6000  # standar ekspedisi: (P × L × T dalam cm) / 6000 = kg


def package_info(product, variation=None) -> dict:
    """Berat & ukuran paket. Varian memakai isiannya sendiri; yang kosong ikut produk induk.

    Hasil (gram, None bila belum diisi):
      weight_grams        berat asli
      volume_weight_grams P×L×T/6000 (kg) → gram
      ship_weight_grams   yang dipakai ekspedisi = terbesar dari keduanya
    """

    def pick(field):
        value = getattr(variation, field, None) if variation is not None else None
        return value if value else getattr(product, field, None)

    weight = pick("weight_grams")
    length, width, height = pick("length_cm"), pick("width_cm"), pick("height_cm")
    volume = None
    if length and width and height:
        volume = int(round(length * width * height / VOLUME_DIVISOR * 1000))
    candidates = [v for v in (weight, volume) if v]
    return {
        "weight_grams": weight or None,
        "length_cm": length or None,
        "width_cm": width or None,
        "height_cm": height or None,
        "volume_weight_grams": volume,
        "ship_weight_grams": max(candidates) if candidates else None,
    }


def weight_text(grams) -> str:
    """1200 -> '1,2 kg', 350 -> '350 g'."""
    if not grams:
        return ""
    if grams < 1000:
        return f"{grams} g"
    kg = f"{grams / 1000:.2f}".rstrip("0").rstrip(".")
    return f"{kg.replace('.', ',')} kg"
