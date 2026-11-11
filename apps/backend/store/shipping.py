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


def shipping_label(code: str) -> str:
    return SHIPPING_LABELS.get(code or "", "")
