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
from .shipping import shipping_label

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
    if order.shipping_auto and order.shipping_cost is not None:
        label = f"Ongkir {shipping_label(order.shipping_service)}"
        text.append(f"{label}: {money_text(order.shipping_cost)}")
        rows += (
            f"<tr><td style='padding:6px 0'>{escape(label)}</td>"
            f"<td style='padding:6px 0;text-align:right'>{money_text(order.shipping_cost)}</td></tr>"
        )
        if order.shipping_discount:
            text.append(f"Potongan ongkir: -{money_text(order.shipping_discount)}")
            rows += (
                "<tr><td style='padding:6px 0;color:#047857'>Potongan ongkir</td>"
                f"<td style='padding:6px 0;text-align:right;color:#047857'>-{money_text(order.shipping_discount)}</td></tr>"
            )
        text.append(f"Total tagihan: {money_text(order.billed_amount)} (sudah termasuk PPN & ongkir)")
        rows += (
            "<tr><td style='padding:10px 0;font-weight:800'>Total tagihan</td>"
            f"<td style='padding:10px 0;text-align:right;font-weight:800'>{money_text(order.billed_amount)}</td></tr>"
        )
        note = "Sudah termasuk PPN dan ongkos kirim."
    else:
        text.append(f"Total produk: {money_text(order.total_amount)} (sudah termasuk PPN, belum termasuk ongkir)")
        rows += (
            "<tr><td style='padding:10px 0;font-weight:800'>Total produk</td>"
            f"<td style='padding:10px 0;text-align:right;font-weight:800'>{money_text(order.total_amount)}</td></tr>"
        )
        note = "Sudah termasuk PPN, belum termasuk ongkos kirim."
    html = (
        f"<table width='100%' cellpadding='0' cellspacing='0' style='margin-top:16px;font-size:14px'>{rows}</table>"
        f"<p style='font-size:12px;color:#6b7280;margin:0'>{note}</p>"
    )
    return html, text


def _message(order: Order, subject: str, text_lines: list[str], html: str) -> EmailMultiAlternatives:
    footer = [""]
    if order.payment_method == "WHATSAPP":
        footer += [f"Info pembayaran hanya kami berikan lewat WhatsApp resmi Urbanix Store, atas nama {COMPANY}.", ""]
    footer += [
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
            + ("info rekening resmi." if order.shipping_auto else "total dengan ongkir dan info rekening resmi.")
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
    hours = store.wa_unpaid_cancel_hours or 0
    deadline = f"{hours // 24}×24 jam" if hours and hours % 24 == 0 else f"{hours} jam"

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
        (f"Pesanan yang belum dibayar dalam {deadline} sejak dibuat akan dibatalkan otomatis."
         if hours else "Segera selesaikan pembayaran supaya pesananmu bisa langsung kami proses."),
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
        + (f"Pesanan yang belum dibayar dalam <b>{deadline}</b> sejak dibuat akan dibatalkan otomatis, "
           "jadi stoknya bisa dilepas untuk pembeli lain.</p>" if hours else
           "Segera selesaikan pembayaran supaya pesananmu bisa langsung kami proses.</p>")
        + f"{_number_box(order)}{items_html}"
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


def build_review_request(order: Order) -> EmailMultiAlternatives:
    from .reviews_api import review_url

    store = StoreSettings.load()
    url = review_url(order)
    names = list(dict.fromkeys(i.product_name for i in order.items.all()))
    stars = "".join(
        f"<a href='{url}?bintang={n}' style='text-decoration:none;font-size:30px;color:#f5b301;padding:0 2px'>★</a>"
        for n in range(1, 6)
    )
    text = [
        f"Halo {order.customer_name},",
        "",
        "Terima kasih sudah berbelanja di Urbanix Store! Bagaimana barangnya?",
        "Bantu pembeli lain dengan memberi bintang & ulasan singkat (1 menit):",
        url,
        "",
        "Produk: " + ", ".join(names[:5]),
    ]
    inner = (
        f"<p style='margin:0 0 12px'>Halo {escape(order.customer_name)},</p>"
        "<p style='margin:0 0 16px;color:#4b5563'>Terima kasih sudah berbelanja di Urbanix Store! "
        "Bagaimana barangnya? Ulasanmu sangat membantu pembeli lain. 🙏</p>"
        f"<p style='margin:0 0 8px;font-size:13px;color:#6b7280'>{escape(', '.join(names[:5]))}</p>"
        f"<div style='margin:8px 0 16px'>{stars}</div>"
        f"<a href='{url}' style='{BTN};background:#cf4309;color:#fff'>Tulis ulasan</a>"
        "<p style='margin:16px 0 0;font-size:12px;color:#6b7280'>Hanya 1 menit. Boleh sertakan foto barangnya.</p>"
    )
    return _message(
        order,
        f"Bagaimana pesanan {order.order_number}? Beri ulasan - Urbanix Store",
        text,
        _layout("Bagaimana barangnya?", inner, _wa(store)),
    )


# ---------------------------------------------------------------- pengiriman
def _deliver(order_pk: int, kind: str) -> bool:
    builders = {
        "created": build_created,
        "reminder": build_reminder,
        "shipped": build_shipped,
        "review": build_review_request,
        "paid": build_paid,
        "return": build_return_status,
    }
    try:
        order = Order.objects.prefetch_related("items").get(pk=order_pk)
        builders[kind](order).send()
    except Exception:
        logger.exception("Gagal mengirim email %s untuk pesanan #%s", kind, order_pk)
        return False
    stamp = {
        "reminder": "reminder_sent_at",
        "shipped": "shipped_email_sent_at",
        "review": "review_email_sent_at",
        "paid": "paid_email_sent_at",
    }.get(kind)
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


# Email minta ulasan: sekali, 1 hari setelah pesanan ditandai Selesai (maks. 60 hari sejak pesan).
REVIEW_AFTER_COMPLETED = timedelta(days=1)
REVIEW_MAX_ORDER_AGE = timedelta(days=60)


def review_candidates(now=None):
    now = now or timezone.now()
    return Order.objects.filter(
        status="COMPLETED",
        review_email_sent_at__isnull=True,
        updated_at__lte=now - REVIEW_AFTER_COMPLETED,
        created_at__gte=now - REVIEW_MAX_ORDER_AGE,
    ).exclude(customer_email="")


def send_review_requests() -> int:
    """Dipanggil cron tiap jam (bersama pengingat bayar)."""
    if not settings.ORDER_EMAIL_ENABLED:
        return 0
    sent = 0
    for pk in list(review_candidates().values_list("pk", flat=True)):
        if _deliver(pk, "review"):
            sent += 1
    return sent



# ---------------------------------------------------------------- pembayaran diterima
def build_paid(order: Order) -> EmailMultiAlternatives:
    store = StoreSettings.load()
    status_url = frontend_url(f"/pesanan/{order.order_number}")
    items_html, items_text = _items_table(order)
    total = money_text(order.billed_amount)
    text = [
        f"Halo {order.customer_name},",
        "",
        f"Pembayaran pesanan {order.order_number} sebesar {total} sudah kami terima. Terima kasih!",
        "Pesananmu kami proses maksimal 2 hari kerja. Nomor resi akan dikirim lewat email begitu paket berangkat.",
        "",
        *items_text,
        "",
        f"Cek status pesanan: {status_url}",
    ]
    inner = (
        f"<p style='margin:0 0 12px'>Halo {escape(order.customer_name)},</p>"
        f"<p style='margin:0 0 16px;color:#4b5563'>Pembayaran sebesar <b>{total}</b> sudah kami terima. Terima kasih! "
        "Pesananmu kami proses maksimal <b>2 hari kerja</b>. Nomor resi akan dikirim lewat email begitu paket berangkat.</p>"
        f"{_number_box(order)}{items_html}"
        f"<p style='margin:16px 0 8px'></p><a href='{status_url}' style='{BTN};background:#cf4309;color:#fff'>Cek status pesanan</a>"
    )
    return _message(order, f"Pembayaran diterima - pesanan {order.order_number} - Urbanix Store", text,
                    _layout("Pembayaran diterima ✓", inner, _wa(store)))


def notify_paid(order: Order) -> None:
    if not order.paid_email_sent_at:
        _dispatch(order, "paid")


# ---------------------------------------------------------------- status retur (ke pembeli)
RETURN_MESSAGES = {
    "REQUESTED": "Pengajuan pengembalianmu sudah kami terima dan akan ditinjau maksimal 1×24 jam.",
    "APPROVED": "Pengajuan pengembalianmu DISETUJUI. Silakan kirim barang kembali ke alamat toko, lalu isi nomor resi pengiriman di halaman pesanan.",
    "RECEIVED": "Barang retur sudah kami terima dan sedang diperiksa.",
    "REFUNDED": "Dana pengembalian sudah kami proses.",
    "REPLACED": "Barang pengganti sudah kami kirim.",
    "REJECTED": "Mohon maaf, pengajuan pengembalianmu tidak dapat kami setujui.",
}


def build_return_status(order: Order) -> EmailMultiAlternatives:
    store = StoreSettings.load()
    ret = order.return_request
    url = frontend_url(f"/pesanan/{order.order_number}/retur")
    message = RETURN_MESSAGES.get(ret.status, "Status pengembalianmu diperbarui.")
    lines = [f"Halo {order.customer_name},", "", message]
    extra = []
    if ret.status == "REFUNDED" and ret.refund_amount is not None:
        extra.append(f"Jumlah: {money_text(ret.refund_amount)}" + (f" ({ret.refund_method})" if ret.refund_method else ""))
    if ret.status == "REPLACED" and ret.replacement_tracking_number:
        extra.append(f"Resi barang pengganti: {ret.replacement_tracking_number}")
    if ret.admin_note:
        extra.append(f"Catatan admin: {ret.admin_note}")
    lines += extra + ["", f"Lihat detail: {url}"]
    inner = (
        f"<p style='margin:0 0 12px'>Halo {escape(order.customer_name)},</p>"
        f"<p style='margin:0 0 16px;color:#4b5563'>{escape(message)}</p>{_number_box(order)}"
        + "".join(f"<p style='margin:12px 0 0;font-size:14px'>{escape(x)}</p>" for x in extra)
        + f"<p style='margin:16px 0 8px'></p><a href='{url}' style='{BTN};background:#cf4309;color:#fff'>Lihat pengembalian</a>"
    )
    return _message(order, f"Pengembalian pesanan {order.order_number}: {ret.get_status_display()} - Urbanix Store",
                    lines, _layout("Status pengembalian", inner, _wa(store)))


def notify_return_status(order: Order) -> None:
    _dispatch(order, "return")


# ---------------------------------------------------------------- notifikasi admin
def _admin_send(subject: str, lines: list[str], link_path: str) -> None:
    store = StoreSettings.load()
    to = (store.notify_email or "").strip()
    if not (settings.ORDER_EMAIL_ENABLED and to):
        return
    url = frontend_url(link_path)
    body = "\n".join(lines + ["", f"Buka di Seller Center: {url}"])
    html = _layout(subject, "".join(f"<p style='margin:0 0 8px'>{escape(x)}</p>" for x in lines)
                   + f"<a href='{url}' style='{BTN};background:#191919;color:#fff'>Buka Seller Center</a>", "")

    def send():
        try:
            msg = EmailMultiAlternatives(subject=f"[Urbanix] {subject}", body=body, from_email=settings.DEFAULT_FROM_EMAIL,
                                         to=[to], headers={"Auto-Submitted": "auto-generated"})
            msg.attach_alternative(html, "text/html")
            msg.send()
        except Exception:
            logger.exception("Gagal mengirim notifikasi admin: %s", subject)

    if settings.ORDER_EMAIL_SYNC:
        send()
    else:
        threading.Thread(target=send, daemon=True).start()


def _order_lines(order: Order) -> list[str]:
    lines = [f"No. pesanan: {order.order_number}", f"Pembeli: {order.customer_name} ({order.customer_phone})",
             f"Metode: {order.get_payment_method_display() if hasattr(order, 'get_payment_method_display') else order.payment_method}",
             f"Total: {money_text(order.billed_amount)}"]
    if order.shipping_service:
        lines.append(f"Kurir: {shipping_label(order.shipping_service) or order.shipping_service}")
    for item in order.items.all():
        lines.append(f"- {item.quantity}× {item.product_name}" + (f" ({item.variation_name})" if item.variation_name else ""))
    return lines


def notify_admin_new_order(order: Order) -> None:
    _admin_send(f"Pesanan baru {order.order_number}", ["Ada pesanan baru di urbanix.id."] + _order_lines(order),
                f"/seller/pesanan/{order.order_number}")


def notify_admin_paid(order: Order) -> None:
    _admin_send(f"LUNAS {order.order_number} — siap diproses", ["Pembayaran sudah lunas. Silakan buat resi & kirim."]
                + _order_lines(order), f"/seller/pesanan/{order.order_number}")


def notify_admin_return(order: Order) -> None:
    ret = order.return_request
    _admin_send(f"Pengajuan retur {order.order_number}",
                [f"Alasan: {ret.get_reason_display()}", f"Permintaan: {ret.get_resolution_display()}",
                 f"Penjelasan: {ret.description[:500]}",
                 "Video unboxing: " + ("dikirim lewat WhatsApp" if ret.video_via_whatsapp else "terlampir di Seller Center")],
                f"/seller/pengembalian/{ret.pk}")
