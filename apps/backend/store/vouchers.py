"""
Aturan voucher di checkout.

- Maksimal 1 voucher diskon (persen/nominal) + 1 voucher gratis ongkir per pesanan.
- Menggabung 2 voucher butuh min. belanja StoreSettings.voucher_combo_min_purchase,
  dan keduanya harus "boleh digabung".
- Diskon dihitung dari harga barang (belum termasuk ongkir); bila voucher
  "tidak berlaku untuk produk promo", produk yang sedang Potong harga tidak ikut dihitung.
- Gratis ongkir tidak mengurangi total barang; dicatat sebagai potongan ongkir maks. Rp...
  yang dipotong saat ongkir dikonfirmasi penjual.
"""
from dataclasses import dataclass, field
from decimal import ROUND_DOWN, Decimal

from .models import StoreSettings, Voucher

MAX_CODES = 2


def money(value) -> str:
    return "Rp" + f"{int(Decimal(value)):,}".replace(",", ".")


def normalize_codes(codes) -> list[str]:
    seen, result = set(), []
    for code in codes or []:
        clean = "".join(str(code).split()).upper()[:30]
        if clean and clean not in seen:
            seen.add(clean)
            result.append(clean)
    return result[:MAX_CODES]


def voucher_summary(v: Voucher) -> dict:
    """Data voucher untuk ditampilkan (kartu klaim, checkout)."""
    if v.voucher_type == "PERCENT":
        headline = f"Diskon {v.value.normalize():f}%"
        if v.max_discount:
            headline += f" s/d {money(v.max_discount)}"
    elif v.voucher_type == "FIXED":
        headline = f"Potongan {money(v.value)}"
    else:
        headline = f"Gratis ongkir s/d {money(v.value)}"

    methods = []
    if v.for_whatsapp:
        methods.append("pesan via WhatsApp")
    if v.for_midtrans:
        methods.append("bayar di web")
    auto_terms = []
    if v.min_purchase:
        auto_terms.append(f"Min. belanja {money(v.min_purchase)} (harga barang, belum termasuk ongkir)")
    else:
        auto_terms.append("Dihitung dari harga barang, belum termasuk ongkir")
    auto_terms.append("Berlaku untuk " + " & ".join(methods))
    if v.exclude_promo and not v.is_shipping:
        auto_terms.append("Tidak berlaku untuk produk yang sedang promo")
    if v.per_customer_limit:
        auto_terms.append(f"Maks. {v.per_customer_limit}x per pembeli (nomor WhatsApp)")
    extra = [line.strip() for line in v.terms.splitlines() if line.strip()]

    return {
        "code": v.code,
        "title": v.title,
        "type": v.voucher_type,
        "headline": headline,
        "value": str(v.value),
        "max_discount": str(v.max_discount) if v.max_discount else None,
        "min_purchase": str(v.min_purchase),
        "for_whatsapp": v.for_whatsapp,
        "for_midtrans": v.for_midtrans,
        "exclude_promo": v.exclude_promo,
        "ends_at": v.ends_at.isoformat() if v.ends_at else None,
        "terms": auto_terms + extra,
    }


def public_vouchers():
    return [v for v in Voucher.objects.filter(is_active=True, is_public=True) if v.is_running()]


@dataclass
class VoucherOutcome:
    discount_amount: Decimal = Decimal("0")
    shipping_discount_max: Decimal = Decimal("0")
    applied: list = field(default_factory=list)   # [{code, title, kind, amount, label}]
    rejected: list = field(default_factory=list)  # [{code, message}]

    @property
    def codes(self) -> list[str]:
        return [a["code"] for a in self.applied]

    @property
    def note(self) -> str:
        return "; ".join(a["label"] for a in self.applied)

    def as_dict(self) -> dict:
        return {
            "discount_amount": str(self.discount_amount),
            "shipping_discount_max": str(self.shipping_discount_max),
            "applied": self.applied,
            "rejected": self.rejected,
        }


def evaluate(codes, lines, payment_method=None, phone=None) -> VoucherOutcome:
    """Hitung potongan dari daftar kode untuk baris belanja (QuoteLine)."""
    outcome = VoucherOutcome()
    codes = normalize_codes(codes)
    if not codes:
        return outcome

    store = StoreSettings.load()
    subtotal = sum((l.subtotal for l in lines), Decimal("0"))
    vouchers = {v.code: v for v in Voucher.objects.filter(code__in=codes)}
    chosen: list[Voucher] = []

    for code in codes:
        v = vouchers.get(code)
        reason = _reject_reason(v, subtotal, payment_method, phone)
        if reason is None:
            same_kind = [c for c in chosen if c.is_shipping == v.is_shipping]
            if same_kind:
                reason = "Hanya 1 voucher " + ("gratis ongkir" if v.is_shipping else "diskon") + " per pesanan."
        if reason is None and chosen:
            other = chosen[0]
            if not (v.can_combine and other.can_combine):
                reason = f"Tidak bisa digabung dengan voucher {other.code}."
            elif subtotal < store.voucher_combo_min_purchase:
                reason = f"Gabung 2 voucher mulai belanja {money(store.voucher_combo_min_purchase)}."
        if reason:
            outcome.rejected.append({"code": code, "message": reason})
            continue
        chosen.append(v)

    for v in chosen:
        if v.is_shipping:
            outcome.shipping_discount_max = Decimal(v.value).quantize(Decimal("1"))
            outcome.applied.append({
                "code": v.code, "title": v.title, "kind": "shipping", "amount": str(outcome.shipping_discount_max),
                "label": f"Voucher {v.code}: potongan ongkir s/d {money(v.value)}",
            })
            continue
        base = sum(
            (l.subtotal for l in lines if not (v.exclude_promo and l.is_promo)), Decimal("0")
        )
        if base <= 0:
            outcome.rejected.append({"code": v.code, "message": "Tidak berlaku untuk produk yang sedang promo."})
            continue
        if v.voucher_type == "PERCENT":
            amount = (base * Decimal(v.value) / Decimal(100)).quantize(Decimal("1"), ROUND_DOWN)
            if v.max_discount:
                amount = min(amount, Decimal(v.max_discount))
        else:
            amount = min(Decimal(v.value), base)
        amount = min(amount, subtotal - outcome.discount_amount)
        outcome.discount_amount += amount
        outcome.applied.append({
            "code": v.code, "title": v.title, "kind": "discount", "amount": str(amount),
            "label": f"Voucher {v.code}: -{money(amount)}",
        })
    return outcome


def _reject_reason(v: Voucher | None, subtotal, payment_method, phone):
    if v is None or not v.is_active:
        return "Kode voucher tidak ditemukan."
    if not v.is_running():
        return "Voucher belum berlaku atau sudah berakhir."
    if payment_method == "WHATSAPP" and not v.for_whatsapp:
        return "Voucher ini tidak berlaku untuk pesan via WhatsApp."
    if payment_method == "MIDTRANS" and not v.for_midtrans:
        return "Voucher ini hanya berlaku untuk pesan via WhatsApp."
    if payment_method == "SHOPEE":
        return "Voucher toko tidak berlaku untuk pembelian lewat Shopee."
    if subtotal < v.min_purchase:
        return f"Min. belanja {money(v.min_purchase)} (kurang {money(v.min_purchase - subtotal)})."
    if v.usage_limit is not None and v.used_count() >= v.usage_limit:
        return "Kuota voucher sudah habis."
    if phone and v.per_customer_limit is not None and v.used_count(phone=phone) >= v.per_customer_limit:
        return "Voucher ini sudah pernah kamu pakai."
    return None
