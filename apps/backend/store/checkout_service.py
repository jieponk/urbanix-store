"""
Logika checkout tamu (tanpa login) dengan 3 metode:

- MIDTRANS : pesanan disimpan, stok langsung dikurangi, pembeli diarahkan ke Snap.
             Stok dikembalikan otomatis bila pembayaran gagal/kedaluwarsa (lihat webhook).
- WHATSAPP : pesanan disimpan, stok TIDAK dikurangi; pembeli diarahkan ke chat
             WhatsApp toko dengan rincian pesanan sudah terisi.
- SHOPEE   : tidak membuat pesanan; hanya mengembalikan link Shopee per produk.
"""
import base64
import hashlib
import hmac
import logging
import secrets
from dataclasses import dataclass
from decimal import Decimal
from urllib.parse import quote as url_quote

import requests
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from . import vouchers as voucher_engine
from .pricing import prefetch_running_promos, price_info
from .shipping import shipping_label
from .models import (
    AuditLog,
    Order,
    OrderItem,
    PaymentEvent,
    Product,
    ProductVariation,
    StoreSettings,
)

logger = logging.getLogger(__name__)

MAX_ITEMS = 50
MAX_QTY_PER_ITEM = 99
DEMO_SERVER_KEYS = {"", "SB-Mid-server-demo"}


class CheckoutError(Exception):
    """Kesalahan yang aman ditampilkan ke pembeli."""


# ---------------------------------------------------------------- utilitas
def money_text(value) -> str:
    return "Rp" + f"{int(Decimal(value)):,}".replace(",", ".")


def generate_order_number() -> str:
    # Contoh: URX-20261107-K3F9QZ7M (acak, sulit ditebak karena dipakai sebagai "kunci" halaman pesanan)
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    suffix = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"URX-{timezone.localdate():%Y%m%d}-{suffix}"


def midtrans_is_configured() -> bool:
    return settings.MIDTRANS_SERVER_KEY not in DEMO_SERVER_KEYS


def available_methods(store: StoreSettings | None = None) -> dict:
    store = store or StoreSettings.load()
    return {
        "midtrans": bool(store.enable_midtrans and midtrans_is_configured()),
        "whatsapp": bool(store.enable_whatsapp and store.whatsapp_number),
        "shopee": bool(store.enable_shopee),
    }


def frontend_url(path: str) -> str:
    return settings.FRONTEND_URL.rstrip("/") + path


# ---------------------------------------------------------------- penawaran harga
@dataclass
class QuoteLine:
    product: Product
    quantity: int
    variation: ProductVariation | None = None

    @property
    def unit_price(self) -> Decimal:
        # Termasuk promo "Potong harga" yang sedang berjalan.
        return price_info(self.product, self.variation).final

    @property
    def stock(self) -> int:
        return self.variation.stock if self.variation else self.product.stock

    @property
    def sku(self) -> str:
        if self.variation and self.variation.sku:
            return self.variation.sku
        return self.product.sku

    @property
    def variation_name(self) -> str:
        return self.variation.name.strip() if self.variation else ""

    @property
    def display_name(self) -> str:
        return f"{self.product.name} - {self.variation_name}" if self.variation_name else self.product.name

    @property
    def subtotal(self) -> Decimal:
        return self.unit_price * self.quantity

    @property
    def is_promo(self) -> bool:
        info = price_info(self.product, self.variation)
        return info.final < info.normal


def build_lines(raw_items) -> list[QuoteLine]:
    """Gabungkan item duplikat, validasi produk/varian dan jumlah. Harga SELALU dari database."""
    if not raw_items:
        raise CheckoutError("Keranjang kosong.")
    if len(raw_items) > MAX_ITEMS:
        raise CheckoutError(f"Maksimal {MAX_ITEMS} jenis produk per pesanan.")

    quantities: dict[tuple[int, str], int] = {}
    for item in raw_items:
        key = (int(item["product_id"]), str(item.get("variation_id") or ""))
        quantities[key] = quantities.get(key, 0) + int(item["quantity"])

    products = (
        Product.objects.filter(id__in={pid for pid, _ in quantities}, is_active=True)
        .prefetch_related("variations", prefetch_running_promos())
        .in_bulk()
    )
    if any(pid not in products for pid, _ in quantities):
        raise CheckoutError(
            "Ada produk di keranjang yang sudah tidak tersedia. Hapus produk itu lalu coba lagi."
        )

    lines = []
    for (pid, variation_id), qty in quantities.items():
        product = products[pid]
        if qty < 1 or qty > MAX_QTY_PER_ITEM:
            raise CheckoutError(f"Jumlah produk harus antara 1 dan {MAX_QTY_PER_ITEM}.")

        variation = None
        if variation_id:
            variation = next(
                (v for v in product.variations.all() if v.variation_id == variation_id), None
            )
            if variation is None:
                raise CheckoutError(
                    f"Varian {product.name} di keranjang sudah tidak tersedia. "
                    "Hapus produk itu lalu pilih ulang variannya."
                )
        elif product.buyable_variations():
            raise CheckoutError(
                f"Pilih varian untuk {product.name} dulu. Hapus produk itu dari keranjang, "
                "lalu tambahkan lagi dari halaman produk."
            )
        lines.append(QuoteLine(product=product, quantity=qty, variation=variation))
    return lines


def quote(raw_items, voucher_codes=None, payment_method=None, phone=None) -> dict:
    store = StoreSettings.load()
    lines = build_lines(raw_items)
    vouchers = voucher_engine.evaluate(voucher_codes, lines, payment_method, phone)
    subtotal = sum((l.subtotal for l in lines), Decimal("0"))
    return {
        "items": [
            {
                "product_id": line.product.id,
                "variation_id": line.variation.variation_id if line.variation else "",
                "variation_name": line.variation_name,
                "sku": line.sku,
                "name": line.product.name,
                "image_url": line.product.image_url,
                "unit_price": str(line.unit_price),
                "quantity": line.quantity,
                "subtotal": str(line.subtotal),
                "stock": line.stock,
                "in_stock": line.stock >= line.quantity,
                "is_promo": line.is_promo,
                "shopee_url": line.product.shopee_url or store.shopee_store_url,
            }
            for line in lines
        ],
        "subtotal": str(subtotal),
        "vouchers": vouchers.as_dict(),
        "total": str(subtotal - vouchers.discount_amount),
        "shipping_note": "Ongkos kirim dikonfirmasi penjual.",
        "tax_note": "Harga sudah termasuk PPN.",
        "methods": available_methods(store),
        "available_vouchers": [voucher_engine.voucher_summary(v) for v in voucher_engine.public_vouchers()],
    }


# ---------------------------------------------------------------- stok
def reserve_stock(lines: list[QuoteLine]) -> None:
    """Kurangi stok secara atomik; gagal bila stok tidak cukup (aman dari pesanan bersamaan)."""
    for line in lines:
        if line.variation:
            updated = ProductVariation.objects.filter(
                pk=line.variation.pk, stock__gte=line.quantity
            ).update(stock=F("stock") - line.quantity)
        else:
            updated = Product.objects.filter(
                id=line.product.id, stock__gte=line.quantity
            ).update(stock=F("stock") - line.quantity)
        if not updated:
            current = (
                ProductVariation.objects.get(pk=line.variation.pk).stock
                if line.variation
                else Product.objects.get(id=line.product.id).stock
            )
            raise CheckoutError(
                f"Stok {line.display_name} tidak mencukupi (tersedia: {current})."
            )
        if line.variation:
            line.product.sync_stock_from_variations()


def release_stock(order: Order) -> None:
    """Kembalikan stok pesanan. Hanya berjalan sekali per pesanan."""
    if not order.stock_reserved:
        return
    for item in order.items.select_related("product", "variation"):
        if item.variation_id:
            ProductVariation.objects.filter(pk=item.variation_id).update(
                stock=F("stock") + item.quantity
            )
            if item.product:
                item.product.sync_stock_from_variations()
        elif item.product_id:
            Product.objects.filter(id=item.product_id).update(
                stock=F("stock") + item.quantity
            )
    order.stock_reserved = False
    order.save(update_fields=["stock_reserved"])


# ---------------------------------------------------------------- WhatsApp
def whatsapp_message(order: Order) -> str:
    lines = [
        f"Halo, saya mau pesan (No. pesanan {order.order_number}):",
        "",
    ]
    for i, item in enumerate(order.items.all(), 1):
        lines.append(f"{i}. {item.product_name}")
        if item.variation_name:
            lines.append(f"   Varian: {item.variation_name}")
        if item.sku:
            lines.append(f"   SKU: {item.sku}")
        lines.append(
            f"   {item.quantity} x {money_text(item.price_snapshot)} = "
            f"{money_text(item.price_snapshot * item.quantity)}"
        )
    lines.append("")
    if order.discount_amount or order.voucher_codes:
        lines.append(f"Subtotal: {money_text(order.total_amount + order.discount_amount)}")
        for part in order.discount_note.split("; "):
            if part:
                lines.append(part)
    lines += [
        f"Total: {money_text(order.total_amount)} (sudah termasuk PPN, belum termasuk ongkir)",
        "",
        f"Nama: {order.customer_name}",
        f"No. HP: {order.customer_phone}",
    ]
    if order.customer_email:
        lines.append(f"Email: {order.customer_email}")
    lines.append(
        "Alamat: "
        + ", ".join(
            p
            for p in [
                order.shipping_address,
                order.shipping_city,
                order.shipping_province,
                order.shipping_postal_code,
            ]
            if p
        )
    )
    if order.shipping_service:
        lines.append(f"Pengiriman: {shipping_label(order.shipping_service)} (mohon info ongkirnya)")
    if order.notes:
        lines.append(f"Catatan: {order.notes}")
    lines.append(f"Cek status & invoice: {frontend_url('/pesanan/' + order.order_number)}")
    if order.shipping_discount_max:
        lines.append(f"(Mohon potong ongkir s/d {money_text(order.shipping_discount_max)} sesuai voucher.)")
    lines += ["", "Mohon info total dengan ongkir dan cara pembayarannya. Terima kasih!"]
    return "\n".join(lines)


def whatsapp_url(order: Order, store: StoreSettings | None = None) -> str:
    store = store or StoreSettings.load()
    if not store.whatsapp_number:
        return ""
    return f"https://wa.me/{store.whatsapp_number}?text={url_quote(whatsapp_message(order))}"


# ---------------------------------------------------------------- Midtrans
def midtrans_base_url() -> str:
    if settings.MIDTRANS_IS_PRODUCTION:
        return "https://app.midtrans.com/snap/v1/transactions"
    return "https://app.sandbox.midtrans.com/snap/v1/transactions"


def create_snap_transaction(order: Order) -> dict:
    item_details = [
        {
            "id": (item.sku or str(item.product_id or item.id))[:50],
            "price": int(item.price_snapshot),
            "quantity": item.quantity,
            # batas Midtrans 50 karakter
            "name": (
                f"{item.product_name[:30]} - {item.variation_name}"
                if item.variation_name
                else item.product_name
            )[:50],
        }
        for item in order.items.all()
    ]
    if order.discount_amount:
        item_details.append({
            "id": "VOUCHER",
            "price": -int(order.discount_amount),
            "quantity": 1,
            "name": f"Voucher {order.voucher_codes}"[:50],
        })
    payload = {
        "transaction_details": {
            "order_id": order.order_number,
            "gross_amount": sum(i["price"] * i["quantity"] for i in item_details),
        },
        "item_details": item_details,
        "customer_details": {
            "first_name": order.customer_name[:50],
            "email": order.customer_email or None,
            "phone": order.customer_phone,
            "shipping_address": {
                "first_name": order.customer_name[:50],
                "phone": order.customer_phone,
                "address": order.shipping_address[:200],
                "city": order.shipping_city,
                "postal_code": order.shipping_postal_code,
                "country_code": "IDN",
            },
        },
        "callbacks": {"finish": frontend_url(f"/pesanan/{order.order_number}")},
    }
    auth = base64.b64encode(f"{settings.MIDTRANS_SERVER_KEY}:".encode()).decode()
    response = requests.post(
        midtrans_base_url(),
        json=payload,
        headers={
            "Authorization": f"Basic {auth}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        timeout=15,
    )
    if response.status_code not in (200, 201):
        raise RuntimeError(f"Midtrans HTTP {response.status_code}: {response.text[:300]}")
    return response.json()


def midtrans_signature(order_id, status_code, gross_amount) -> str:
    raw = f"{order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
    return hashlib.sha512(raw.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------- buat pesanan
def place_order(data: dict) -> dict:
    method = data["payment_method"]
    store = StoreSettings.load()
    methods = available_methods(store)
    key = {"MIDTRANS": "midtrans", "WHATSAPP": "whatsapp", "SHOPEE": "shopee"}[method]
    if not methods[key]:
        raise CheckoutError("Metode pembayaran ini sedang tidak tersedia.")

    if method == "SHOPEE":
        result = quote(data["items"])
        return {
            "payment_method": "SHOPEE",
            "shopee_links": [
                {
                    "name": i["name"],
                    "variation_name": i["variation_name"],
                    "quantity": i["quantity"],
                    "url": i["shopee_url"],
                }
                for i in result["items"]
            ],
        }

    idem = data.get("idempotency_key") or None
    if idem:
        existing = Order.objects.filter(idempotency_key=idem).first()
        if existing:
            return order_result(existing, store)

    lines = build_lines(data["items"])
    vouchers = voucher_engine.evaluate(
        data.get("voucher_codes"), lines, method, data.get("customer", {}).get("phone")
    )
    if vouchers.rejected:
        first = vouchers.rejected[0]
        raise CheckoutError(f"Voucher {first['code']}: {first['message']}")

    try:
        order = _create_order(method, lines, data, idem, vouchers)
    except IntegrityError:
        # Klik ganda: permintaan lain dengan kunci yang sama sudah lebih dulu tersimpan.
        existing = Order.objects.filter(idempotency_key=idem).first() if idem else None
        if not existing:
            raise
        return order_result(existing, store)

    if method == "MIDTRANS":
        # Panggil Midtrans DI LUAR transaksi agar database tidak terkunci selama menunggu.
        try:
            snap = create_snap_transaction(order)
        except Exception:
            logger.exception("Gagal membuat transaksi Midtrans untuk %s", order.order_number)
            with transaction.atomic():
                order = Order.objects.select_for_update().get(pk=order.pk)
                release_stock(order)
                order.status, order.payment_status = "CANCELLED", "FAILED"
                order.save(update_fields=["status", "payment_status"])
            raise CheckoutError(
                "Gagal menghubungi layanan pembayaran. Coba lagi beberapa saat, "
                "atau pilih metode lain."
            )
        order.snap_token = snap.get("token", "")
        order.payment_url = snap.get("redirect_url", "")
        order.save(update_fields=["snap_token", "payment_url"])

    from .emails import notify_order_created  # impor di sini: emails.py mengimpor modul ini

    notify_order_created(order)
    return order_result(order, store)


@transaction.atomic
def _create_order(method: str, lines: list[QuoteLine], data: dict, idem, vouchers) -> Order:
    subtotal = sum((l.subtotal for l in lines), Decimal("0"))
    customer, shipping = data["customer"], data["shipping"]
    if method == "MIDTRANS":
        reserve_stock(lines)
    else:
        for line in lines:
            if line.stock < line.quantity:
                raise CheckoutError(
                    f"Stok {line.display_name} tidak mencukupi (tersedia: {line.stock})."
                )
    order = Order.objects.create(
        order_number=generate_order_number(),
        customer_name=customer["name"],
        customer_phone=customer["phone"],
        customer_email=customer.get("email", ""),
        shipping_address=shipping["address"],
        shipping_city=shipping["city"],
        shipping_province=shipping.get("province", ""),
        shipping_postal_code=shipping.get("postal_code", ""),
        shipping_service=shipping.get("service", ""),
        notes=data.get("notes", ""),
        payment_method=method,
        stock_reserved=(method == "MIDTRANS"),
        total_amount=subtotal - vouchers.discount_amount,
        discount_amount=vouchers.discount_amount,
        discount_note=vouchers.note[:255],
        voucher_codes=",".join(vouchers.codes),
        shipping_discount_max=vouchers.shipping_discount_max,
        idempotency_key=idem,
    )
    OrderItem.objects.bulk_create(
        OrderItem(
            order=order,
            product=line.product,
            variation=line.variation,
            product_name=line.product.name,
            variation_name=line.variation_name,
            sku=line.sku,
            price_snapshot=line.unit_price,
            quantity=line.quantity,
        )
        for line in lines
    )
    AuditLog.objects.create(
        action="ORDER_CREATED",
        details=f"Order {order.order_number} via {method} dibuat (tamu).",
    )
    return order


def order_result(order: Order, store: StoreSettings | None = None) -> dict:
    return {
        "order_number": order.order_number,
        "payment_method": order.payment_method,
        "payment_url": order.payment_url,
        "whatsapp_url": whatsapp_url(order, store) if order.payment_method == "WHATSAPP" else "",
    }


# ---------------------------------------------------------------- webhook
PAID_STATUSES = {"settlement"}
FAILED_STATUSES = {"deny", "cancel", "failure"}


@transaction.atomic
def handle_midtrans_notification(payload: dict) -> tuple[int, str]:
    """Kembalikan (kode HTTP, pesan). Tanda tangan WAJIB valid."""
    order_id = str(payload.get("order_id", ""))
    status_code = str(payload.get("status_code", ""))
    gross_amount = str(payload.get("gross_amount", ""))
    signature = str(payload.get("signature_key", ""))

    if not signature or not hmac.compare_digest(
        signature, midtrans_signature(order_id, status_code, gross_amount)
    ):
        return 403, "invalid signature"

    order = Order.objects.select_for_update().filter(order_number=order_id).first()
    if not order:
        return 404, "order not found"

    try:
        amount_ok = Decimal(gross_amount) == order.total_amount
    except Exception:
        amount_ok = False
    if not amount_ok:
        logger.warning("Nominal Midtrans tidak cocok untuk %s: %s", order_id, gross_amount)
        return 400, "amount mismatch"

    tx_status = payload.get("transaction_status", "")
    fraud = payload.get("fraud_status", "accept")

    PaymentEvent.objects.create(
        order=order,
        transaction_id=payload.get("transaction_id", "N/A"),
        event_type=tx_status,
        raw_payload=payload,
    )

    if order.payment_status == "PAID":
        return 200, "already paid"  # abaikan notifikasi lama/duplikat

    if tx_status in PAID_STATUSES or (tx_status == "capture" and fraud == "accept"):
        order.payment_status, order.status = "PAID", "PROCESSING"
    elif tx_status in FAILED_STATUSES or (tx_status == "capture" and fraud == "deny"):
        release_stock(order)
        order.payment_status, order.status = "FAILED", "CANCELLED"
    elif tx_status == "expire":
        release_stock(order)
        order.payment_status, order.status = "EXPIRED", "CANCELLED"
    else:
        return 200, "ignored"  # pending, challenge, refund, dll.

    order.save(update_fields=["payment_status", "status"])
    return 200, "ok"
