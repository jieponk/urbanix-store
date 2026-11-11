"""Email pesanan untuk pembeli: konfirmasi pesanan, pengingat bayar, dan paket dikirim.

Hanya terkirim bila SMTP diatur (EMAIL_HOST) dan pembeli mengisi email saat checkout.
"""
import logging
import threading
from datetime import timedelta
from html import escape
from urllib.parse import quote

from django.conf import settings
from email.utils import make_msgid, parseaddr
from urllib.parse import urlparse

from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

from .checkout_service import frontend_url, money_text
from .models import Order, StoreSettings

logger = logging.getLogger(__name__)

COMPANY = "PT Koolsnap Multi Retailindo"
BTN = "display:inline-block;padding:12px 20px;border-radius:10px;font-weight:700;text-decoration:none;margin:4px 6px 4px 0"

# Pengingat bayar: dikirim sekali, untuk pesanan belum lunas berumur 12 jam s/d 3 hari.
REMINDER_AFTER = timedelta(hours=12)
REMINDER_MAX_AGE = timedelta(days=3)


# ---------------------------------------------------------------- kerangka email
def _site_domain() -> str:
    return urlparse(frontend_url("/")).hostname or "urbanix.id"


def _reply_to() -> str:
    return getattr(settings, "EMAIL_REPLY_TO", "") or parseaddr(settings.DEFAULT_FROM_EMAIL)[1]


def _wa(store: StoreSettings) -> str:
    return "".join(ch for ch in (store.whatsapp_number or "") if ch.isdigit())


def _layout(title: str, inner_html: str, wa: str) -> str:
    wa_btn = f"<a href='https://wa.me/{wa}' style='{BTN};background:#047857;color:#fff'>Chat admin</a>" if wa else ""
    return f"""<!doctype html><html><body style="margin:0;background:#f3f5fa;font-family:Arial,Helvetica,sans-serif;color:#1c2030">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5fa;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#121a42;padding:24px;color:#fff">
<div style="font-size:12px;letter-spacing:3px;color:#ffc93c;font-weight:700">URBANIX STORE</div>
<div style="font-size:22px;font-weight:800;margin-top:6px">{escape(title)}</div></td></tr>
<tr><td style="padding:24px">{inner_html}{wa_btn}
<p style="margin:20px 0 0;padding:12px;background:#f3f5fa;border-radius:10px;font-size:12px;color:#4b5563">
Info pembayaran hanya kami berikan lewat WhatsApp resmi Urbanix Store, atas nama {COMPANY}.</p>
</td></tr></table>
<p style="font-size:11px;color:#6b7280">Email ini dikirim otomatis karena ada pesanan dengan alamat email ini di urbanix.id.</p>
</td></tr></table></body></html>"""


def _number_box(order: Order) -> str:
    return (
        "<div style='background:#fff4ed;border:1px dashed #ff5b14;border-radius:12px;padding:14px;text-align:center'>"
        "<div style='font-size:12px;color:#6b7280'>Nomor pesanan</div>"
        f"<div style='font-size:20px;font-weight:800;font-family:monospace;letter-spacing:1px'>{escape(order.order_number)}</div></div>"
    )


def _items_table(order: Order) -> tuple[str, list[str]]:
    rows, text = "", []
    for it in order.items.all():
        name = it.product_name + (f" ({it.variation_name})" if it.variation_name else "")
        text.append(f"- {name}: {it.quantity} x {money_text(it.price_snapshot)}")
        rows += (
            f"<tr><td style='padding:8px 0;border-bottom:1px solid #e5e7eb'>{escape(it.product_name)}"
            + (f"<br><span style='color:#6b7280;font-size:12px'>{escape(it.variation_name)}</span>" if it.variation_name else "")
            + "</td><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap'>"
            f"{it.quantity} × {money_text(it.price_snapshot)}</td></tr>"
        )
    if order.discount_amount:
        text.append(f"Potongan: -{money_text(order.discount_amount)}")
        rows += (
            "<tr><td style='padding:6px 0;color:#047857'>Potongan</td>"
            f"<td style='padding:6px 0;text-align:right;color:#047857'>-{money_text(order.discount_amount)}</td></tr>"
        )
    text.append(f"Total produk: {money_text(order.total_amount)} (sudah termasuk PPN, belum termasuk ongkir)")
    rows += (
        "<tr><td style='padding:10px 0;font-weight:800'>Total produk</td>"
        f"<td style='padding:10px 0;text-align:right;font-weight:800'>{money_text(order.total_amount)}</td></tr>"
    )
    html = (
        f"<table width='100%' cellpadding='0' cellspacing='0' style='margin-top:16px;font-size:14px'>{rows}</table>"
        "<p style='font-size:12px;color:#6b7280;margin:0'>Sudah termasuk PPN, belum termasuk ongkos kirim.</p>"
    )
    return html, text


def _message(order: Order, subject: str, text_lines: list[str], html: str) -> EmailMultiAlternatives:
    footer = [
        "",
        f"Info pembayaran hanya kami berikan lewat WhatsApp resmi Urbanix Store, atas nama {COMPANY}.",
        "",
        "Salam,",
        "Urbanix Store",
    ]
    msg = EmailMultiAlternatives(
        subject=subject,
        body="\n".join(text_lines + footer),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.customer_email],
        reply_to=[_reply_to()],
        headers={
            # Message-ID memakai domain toko (bukan nama host server) agar email terlihat wajar bagi filter spam.
            "Message-ID": make_msgid(domain=_site_domain()),
            "Auto-Submitted": "auto-generated",
        },
    )
    msg.attach_alternative(html, "text/html")
    return msg


# ---------------------------------------------------------------- 1. konfirmasi pesanan
def build_created(order: Order) -> EmailMultiAlternatives:
    store = StoreSettings.load()
    status_url = frontend_url(f"/pesanan/{order.order_number}")
    invoice_url = frontend_url(f"/pesanan/{order.order_number}/invoice")
    unpaid = order.payment_status != "PAID"
    if order.payment_method == "WHATSAPP":
        next_step = (
            "Pesananmu diproses setelah chat pesanan terkirim ke WhatsApp admin. Admin akan membalas "
            "total dengan ongkir dan info rekening resmi."
        )
    else:
        next_step = "Selesaikan pembayaran lewat tautan pembayaran sebelum batas waktunya habis."
    step = next_step if unpaid else "Pembayaran sudah kami terima."
    items_html, items_text = _items_table(order)

    text = [
        f"Halo {order.customer_name},",
        "",
        "Terima kasih sudah berbelanja di Urbanix Store. Pesananmu sudah kami terima.",
        "",
        f"Nomor pesanan: {order.order_number}",
        "",
        *items_text,
        "",
        step,
        "",
        f"Cek status pesanan: {status_url}",
        f"Lihat / unduh invoice: {invoice_url}",
    ]
    inner = (
        f"<p style='margin:0 0 12px'>Halo {escape(order.customer_name)},</p>"
        "<p style='margin:0 0 16px;color:#4b5563'>Terima kasih sudah berbelanja. Simpan nomor pesanan di bawah "
        "untuk cek status dan mencetak invoice.</p>"
        f"{_number_box(order)}{items_html}"
        f"<p style='margin:16px 0;color:#4b5563'>{escape(step)}</p>"
        f"<a href='{status_url}' style='{BTN};background:#cf4309;color:#fff'>Cek status pesanan</a>"
        f"<a href='{invoice_url}' style='{BTN};background:#f3f5fa;color:#1c2030'>Lihat invoice</a>"
    )
    return _message(
        order,
        f"Pesanan {order.order_number} diterima - Urbanix Store",
        text,
        _layout("Pesananmu sudah kami terima", inner, _wa(store)),
    )


# ---------------------------------------------------------------- 2. pengingat bayar
def build_reminder(order: Order) -> EmailMultiAlternatives:
    store = StoreSettings.load()
    wa = _wa(store)
    status_url = frontend_url(f"/pesanan/{order.order_number}")
    items_html, items_text = _items_table(order)
    deadline = "1×24 jam"

    if order.payment_method == "MIDTRANS" and order.payment_url:
        action_text = f"Selesaikan pembayaran di sini: {order.payment_url}"
        action_btn = f"<a href='{order.payment_url}' style='{BTN};background:#cf4309;color:#fff'>Bayar sekarang</a>"
    else:
        chat = f"https://wa.me/{wa}?text={quote(f'Halo admin, saya mau lanjutkan pembayaran pesanan {order.order_number}')}" if wa else status_url
        action_text = f"Konfirmasi ke admin lewat WhatsApp untuk info total & rekening resmi: {chat}"
        action_btn = f"<a href='{chat}' style='{BTN};background:#cf4309;color:#fff'>Lanjutkan via WhatsApp</a>"

    text = [
        f"Halo {order.customer_name},",
        "",
        "Pesananmu di Urbanix Store belum kami terima pembayarannya.",
        f"Pesanan yang belum dibayar dalam {deadline} sejak dikonfirmasi admin dapat dibatalkan otomatis.",
        "",
        f"Nomor pesanan: {order.order_number}",
        "",
        *items_text,
        "",
        action_text,
        f"Cek status pesanan: {status_url}",
        "",
        "Sudah bayar? Abaikan email ini, admin akan segera memperbarui status pesananmu.",
    ]
    inner = (
        f"<p style='margin:0 0 12px'>Halo {escape(order.customer_name)},</p>"
        "<p style='margin:0 0 16px;color:#4b5563'>Pesananmu belum kami terima pembayarannya. "
        f"Pesanan yang belum dibayar dalam <b>{deadline}</b> sejak dikonfirmasi admin dapat dibatalkan otomatis, "
        "jadi stoknya bisa dilepas untuk pembeli lain.</p>"
        f"{_number_box(order)}{items_html}"
        "<p style='margin:16px 0 8px'></p>"
        f"{action_btn}"
        f"<a href='{status_url}' style='{BTN};background:#f3f5fa;color:#1c2030'>Cek status</a>"
        "<p style='margin:12px 0 0;font-size:13px;color:#6b7280'>Sudah bayar? Abaikan email ini, admin akan segera "
        "memperbarui status pesananmu.</p>"
    )
    return _message(
        order,
        f"Pengingat: pesanan {order.order_number} belum dibayar - Urbanix Store",
        text,
        _layout("Jangan sampai kehabisan!", inner, ""),  # tombol WA sudah ada di isi email
    )


# ---------------------------------------------------------------- 3. paket dikirim
def build_shipped(order: Order) -> EmailMultiAlternatives:
    store = StoreSettings.load()
    status_url = frontend_url(f"/pesanan/{order.order_number}")
    track_url = f"https://cekresi.com/?noresi={quote(order.tracking_number)}"
    courier = order.shipping_courier or "-"

    text = [
        f"Halo {order.customer_name},",
        "",
        "Kabar baik! Pesananmu sudah kami kirim.",
        "",
        f"Nomor pesanan: {order.order_number}",
        f"Kurir: {courier}",
        f"No. resi: {order.tracking_number}",
        "",
        f"Lacak paket: {track_url}",
        f"Cek status pesanan: {status_url}",
        "",
        "Saat paket tiba, mohon rekam video unboxing tanpa jeda. Video ini dibutuhkan bila ada kendala "
        "barang (salah kirim, kurang, atau cacat).",
    ]
    inner = (
        f"<p style='margin:0 0 12px'>Halo {escape(order.customer_name)},</p>"
        "<p style='margin:0 0 16px;color:#4b5563'>Kabar baik! Pesananmu sudah kami kirim. 📦</p>"
        f"{_number_box(order)}"
        "<table width='100%' cellpadding='0' cellspacing='0' style='margin-top:16px;font-size:14px'>"
        f"<tr><td style='padding:8px 0;color:#6b7280'>Kurir</td><td style='padding:8px 0;text-align:right;font-weight:700'>{escape(courier)}</td></tr>"
        f"<tr><td style='padding:8px 0;color:#6b7280'>No. resi</td><td style='padding:8px 0;text-align:right;font-weight:800;font-family:monospace'>{escape(order.tracking_number)}</td></tr>"
        "</table>"
        "<p style='margin:16px 0 8px'></p>"
        f"<a href='{track_url}' style='{BTN};background:#cf4309;color:#fff'>Lacak paket</a>"
        f"<a href='{status_url}' style='{BTN};background:#f3f5fa;color:#1c2030'>Status pesanan</a>"
        "<p style='margin:16px 0 0;padding:12px;background:#f3f5fa;border-radius:10px;font-size:13px;color:#4b5563'>"
        "<b>Saat paket tiba:</b> rekam <b>video unboxing</b> tanpa jeda. Video ini dibutuhkan bila ada kendala "
        "barang (salah kirim, kurang, atau cacat).</p>"
    )
    return _message(
        order,
        f"Pesanan {order.order_number} sudah dikirim - Urbanix Store",
        text,
        _layout("Pesananmu sedang dalam perjalanan", inner, _wa(store)),
    )


# ---------------------------------------------------------------- pengiriman
def _deliver(order_pk: int, kind: str) -> bool:
    builders = {"created": build_created, "reminder": build_reminder, "shipped": build_shipped}
    try:
        order = Order.objects.prefetch_related("items").get(pk=order_pk)
        builders[kind](order).send()
    except Exception:
        logger.exception("Gagal mengirim email %s untuk pesanan #%s", kind, order_pk)
        return False
    stamp = {"reminder": "reminder_sent_at", "shipped": "shipped_email_sent_at"}.get(kind)
    if stamp:
        Order.objects.filter(pk=order_pk).update(**{stamp: timezone.now()})
    return True


def _dispatch(order: Order, kind: str) -> None:
    if not (settings.ORDER_EMAIL_ENABLED and order.customer_email):
        return
    if settings.ORDER_EMAIL_SYNC:
        _deliver(order.pk, kind)
    else:
        threading.Thread(target=_deliver, args=(order.pk, kind), daemon=True).start()


def notify_order_created(order: Order) -> None:
    """Email konfirmasi setelah checkout."""
    _dispatch(order, "created")


def notify_shipped(order: Order) -> None:
    """Email 'paket dikirim' sekali saja, saat status Dikirim dan nomor resi sudah diisi."""
    if order.status == "SHIPPED" and order.tracking_number and not order.shipped_email_sent_at:
        _dispatch(order, "shipped")


def reminder_candidates(now=None):
    """Pesanan belum lunas, berumur 12 jam s/d 3 hari, belum pernah diingatkan, ada emailnya."""
    now = now or timezone.now()
    return Order.objects.filter(
        payment_status="UNPAID",
        status__in=["PENDING", "PROCESSING"],
        reminder_sent_at__isnull=True,
        created_at__lte=now - REMINDER_AFTER,
        created_at__gte=now - REMINDER_MAX_AGE,
    ).exclude(customer_email="")


def send_payment_reminders() -> int:
    """Dipanggil cron tiap jam. Mengembalikan jumlah email yang terkirim."""
    if not settings.ORDER_EMAIL_ENABLED:
        return 0
    sent = 0
    for pk in list(reminder_candidates().values_list("pk", flat=True)):
        if _deliver(pk, "reminder"):
            sent += 1
    return sent
