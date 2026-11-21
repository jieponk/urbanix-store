"""Log aktivitas Seller Center: setiap aksi admin yang mengubah data dicatat ke AuditLog.

Dipanggil otomatis dari dekorator `staff` (seller_api) untuk POST/PATCH/PUT/DELETE yang berhasil.
Isi rahasia (password, token, kunci) dan file tidak pernah dicatat.
"""
import re

from .models import AuditLog

SECTIONS = {
    "orders": "Pesanan",
    "products": "Produk",
    "variations": "Varian",
    "categories": "Kategori",
    "promos": "Promo harga",
    "price-cuts": "Promo harga",
    "vouchers": "Voucher",
    "banners": "Banner",
    "videos": "Video belanja",
    "articles": "Artikel",
    "comments": "Komentar",
    "news": "Berita",
    "reviews": "Ulasan",
    "product-reviews": "Ulasan produk",
    "settings": "Pengaturan",
    "dekor": "Dekor toko",
    "mass-update": "Mass update",
    "bulk": "Mass update",
    "import": "Impor",
    "users": "Pengguna",
}
VERBS = {"POST": "Tambah/aksi", "PATCH": "Ubah", "PUT": "Ubah", "DELETE": "Hapus"}
SECRET = re.compile(r"pass|token|secret|key|otp", re.I)
SKIP_ACTIONS = {"refresh"}  # "Cek status" resi: tidak mengubah apa pun dari sisi admin


def _short(value, limit=60):
    text = str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _summary(data) -> str:
    if not hasattr(data, "items"):
        return ""
    parts = []
    for key, value in list(data.items())[:12]:
        if SECRET.search(str(key)):
            continue
        if hasattr(value, "read"):  # file unggahan
            parts.append(f"{key}=<file>")
            continue
        if isinstance(value, (list, dict)):
            parts.append(f"{key}=[{len(value)}]")
            continue
        parts.append(f"{key}={_short(value)}")
    return ", ".join(parts)


def describe(request) -> tuple[str, str]:
    """('Ubah Pesanan URX-1', 'status=SHIPPED') dari request Seller Center."""
    path = request.path.split("/seller/", 1)[-1].strip("/")
    segments = [s for s in path.split("/") if s]
    section = SECTIONS.get(segments[0], segments[0].replace("-", " ").capitalize()) if segments else "Seller Center"
    rest = " ".join(segments[1:])
    if segments[:2] == ["orders", "hapus-dibatalkan"]:
        return "Hapus semua pesanan Dibatalkan", ""
    verb = VERBS.get(request.method, request.method)
    data = getattr(request, "data", {}) or {}
    if hasattr(data, "get") and data.get("action"):
        verb = f"{verb} ({data.get('action')})"
    return f"{verb} {section} {rest}".strip()[:100], _summary(data)[:1000]


def record(request, response):
    if request.method not in VERBS or getattr(response, "status_code", 500) >= 400:
        return
    data = getattr(request, "data", {}) or {}
    if hasattr(data, "get") and data.get("action") in SKIP_ACTIONS:
        return
    if request.path.rstrip("/").endswith(("login", "logout")):
        return
    action, details = describe(request)
    try:
        AuditLog.objects.create(actor=request.user if request.user.is_authenticated else None,
                                action=action, details=details or "-")
    except Exception:  # log tidak boleh menggagalkan aksi admin
        pass


def system(action: str, details: str, actor=None):
    AuditLog.objects.create(actor=actor, action=action[:100], details=details[:1000] or "-")
