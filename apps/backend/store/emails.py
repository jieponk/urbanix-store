"""Email konfirmasi pesanan untuk pembeli (berisi nomor pesanan + link status & invoice)."""
import logging
import threading
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .checkout_service import frontend_url, money_text
from .models import Order, StoreSettings

logger = logging.getLogger(__name__)


def _build(order: Order) -> EmailMultiAlternatives:
    store = StoreSettings.load()
    status_url = frontend_url(f"/pesanan/{order.order_number}")
    invoice_url = frontend_url(f"/pesanan/{order.order_number}/invoice")
    items = list(order.items.all())
    wa = "".join(ch for ch in (store.whatsapp_number or "") if ch.isdigit())
    unpaid = order.payment_status != "PAID"

    if order.payment_method == "WHATSAPP":
        next_step = (
            "Pesananmu diproses setelah chat pesanan terkirim ke WhatsApp admin. Admin akan membalas "
            "total dengan ongkir dan info rekening resmi."
        )
    else:
        next_step = "Selesaikan pembayaran lewat tautan pembayaran sebelum batas waktunya habis."

    text_lines = [
        f"Halo {order.customer_name},",
        "",
        "Terima kasih sudah berbelanja di Urbanix Store. Pesananmu sudah kami terima.",
        "",
        f"Nomor pesanan: {order.order_number}",
        "",
    ]
    for it in items:
        name = it.product_name + (f" ({it.variation_name})" if it.variation_name else "")
        text_lines.append(f"- {name}: {it.quantity} x {money_text(it.price_snapshot)}")
    if order.discount_amount:
        text_lines.append(f"Potongan: -{money_text(order.discount_amount)}")
    text_lines += [
        f"Total produk: {money_text(order.total_amount)} (sudah termasuk PPN, belum termasuk ongkir)",
        "",
        next_step if unpaid else "Pembayaran sudah kami terima.",
        "",
        f"Cek status pesanan: {status_url}",
        f"Lihat / unduh invoice: {invoice_url}",
        "",
        "PENTING: pembayaran hanya ke rekening atas nama PT Koolsnap Multi Retailindo yang diinfokan "
        "lewat WhatsApp resmi kami. Abaikan permintaan transfer dari nomor atau rekening lain.",
        "",
        "Salam,",
        "Urbanix Store",
    ]

    rows = "".join(
        f"<tr><td style='padding:8px 0;border-bottom:1px solid #e5e7eb'>{escape(it.product_name)}"
        + (f"<br><span style='color:#6b7280;font-size:12px'>{escape(it.variation_name)}</span>" if it.variation_name else "")
        + f"</td><td style='padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap'>"
        f"{it.quantity} × {money_text(it.price_snapshot)}</td></tr>"
        for it in items
    )
    discount = (
        f"<tr><td style='padding:6px 0;color:#047857'>Potongan</td><td style='padding:6px 0;text-align:right;color:#047857'>"
        f"-{money_text(order.discount_amount)}</td></tr>"
        if order.discount_amount else ""
    )
    btn = "display:inline-block;padding:12px 20px;border-radius:10px;font-weight:700;text-decoration:none;margin:4px 6px 4px 0"
    wa_btn = (
        f"<a href='https://wa.me/{wa}' style='{btn};background:#047857;color:#fff'>Chat admin</a>" if wa else ""
    )
    html = f"""<!doctype html><html><body style="margin:0;background:#f3f5fa;font-family:Arial,Helvetica,sans-serif;color:#1c2030">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5fa;padding:24px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#121a42;padding:24px;color:#fff">
<div style="font-size:12px;letter-spacing:3px;color:#ffc93c;font-weight:700">URBANIX STORE</div>
<div style="font-size:22px;font-weight:800;margin-top:6px">Pesananmu sudah kami terima</div></td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px">Halo {escape(order.customer_name)},</p>
<p style="margin:0 0 16px;color:#4b5563">Terima kasih sudah berbelanja. Simpan nomor pesanan di bawah untuk cek status dan mencetak invoice.</p>
<div style="background:#fff4ed;border:1px dashed #ff5b14;border-radius:12px;padding:14px;text-align:center">
<div style="font-size:12px;color:#6b7280">Nomor pesanan</div>
<div style="font-size:20px;font-weight:800;font-family:monospace;letter-spacing:1px">{escape(order.order_number)}</div></div>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px">{rows}{discount}
<tr><td style="padding:10px 0;font-weight:800">Total produk</td><td style="padding:10px 0;text-align:right;font-weight:800">{money_text(order.total_amount)}</td></tr></table>
<p style="font-size:12px;color:#6b7280;margin:0">Sudah termasuk PPN, belum termasuk ongkos kirim.</p>
<p style="margin:16px 0;color:#4b5563">{escape(next_step if unpaid else "Pembayaran sudah kami terima.")}</p>
<a href="{status_url}" style="{btn};background:#cf4309;color:#fff">Cek status pesanan</a>
<a href="{invoice_url}" style="{btn};background:#f3f5fa;color:#1c2030">Lihat invoice</a>{wa_btn}
<p style="margin:20px 0 0;padding:12px;background:#fffbeb;border-radius:10px;font-size:12px;color:#92400e">
<b>Waspada penipuan:</b> pembayaran hanya ke rekening atas nama PT Koolsnap Multi Retailindo yang diinfokan lewat WhatsApp resmi kami.</p>
</td></tr></table>
<p style="font-size:11px;color:#6b7280">Email ini dikirim otomatis karena ada pesanan dengan alamat email ini di urbanix.id.</p>
</td></tr></table></body></html>"""

    msg = EmailMultiAlternatives(
        subject=f"Pesanan {order.order_number} diterima - Urbanix Store",
        body="\n".join(text_lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.customer_email],
    )
    msg.attach_alternative(html, "text/html")
    return msg


def _send(order_pk: int) -> None:
    try:
        order = Order.objects.prefetch_related("items").get(pk=order_pk)
        _build(order).send()
    except Exception:
        logger.exception("Gagal mengirim email pesanan #%s", order_pk)


def notify_order_created(order: Order) -> None:
    """Kirim email konfirmasi bila pembeli mengisi email dan SMTP sudah diatur."""
    if not (settings.ORDER_EMAIL_ENABLED and order.customer_email):
        return
    if settings.ORDER_EMAIL_SYNC:
        _send(order.pk)
    else:
        threading.Thread(target=_send, args=(order.pk,), daemon=True).start()
