import Link from 'next/link';
import { UrbanixLogoStacked } from '@/components/BrandSvg';
import PrintButton from '@/components/PrintButton';
import { API, money } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invoice', robots: { index: false, follow: false } };

type Invoice = {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone_masked: string;
  shipping_city: string;
  shipping_province: string;
  shipping_courier: string;
  tracking_number: string;
  shipping_cost: string | null;
  payment_method: 'MIDTRANS' | 'WHATSAPP' | '';
  payment_status: 'UNPAID' | 'PAID' | 'FAILED' | 'EXPIRED';
  status: string;
  total_amount: string;
  discount_amount?: string;
  discount_note?: string;
  voucher_codes?: string;
  shipping_discount_max?: string;
  items: { name: string; variation_name: string; sku: string; unit_price: string; quantity: number; subtotal: string }[];
};

async function getInvoice(no: string): Promise<Invoice | null> {
  try {
    const res = await fetch(`${API}/checkout/orders/${encodeURIComponent(no)}/`, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as Invoice) : null;
  } catch {
    return null;
  }
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

function badge(o: Invoice) {
  if (o.status === 'CANCELLED' || o.payment_status === 'FAILED' || o.payment_status === 'EXPIRED')
    return { text: 'DIBATALKAN', cls: 'border-[#e5243b] text-[#c01a2f]' };
  if (o.payment_status === 'PAID') return { text: 'LUNAS', cls: 'border-[#047857] text-[#047857]' };
  return { text: 'BELUM DIBAYAR', cls: 'border-[#b45309] text-[#b45309]' };
}

const STATUS: Record<string, string> = {
  PENDING: 'Menunggu konfirmasi',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export default async function InvoicePage({ params }: { params: { orderNumber: string } }) {
  const o = await getInvoice(params.orderNumber);
  if (!o) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold text-ink">Invoice tidak ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500">Periksa kembali nomor pesanan di alamat halaman.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  const { legal, contact } = siteConfig;
  const subtotal = o.items.reduce((sum, i) => sum + Number(i.subtotal), 0);
  const discount = Number(o.discount_amount) || 0;
  const productTotal = Number(o.total_amount) || 0;
  const hasShipping = o.shipping_cost !== null && o.shipping_cost !== '';
  const shipping = hasShipping ? Number(o.shipping_cost) : 0;
  const shipDiscount = hasShipping ? Math.min(shipping, Number(o.shipping_discount_max) || 0) : 0;
  const grand = productTotal + shipping - shipDiscount;
  const b = badge(o);
  const region = [o.shipping_city, o.shipping_province].filter(Boolean).join(', ');

  return (
    <div className="bg-mist px-4 py-6 sm:py-10 print:bg-white print:p-0">
      {/* Tombol (tidak ikut tercetak) */}
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/pesanan/${o.order_number}`} className="text-sm font-bold text-ink hover:underline">
          ← Kembali ke status pesanan
        </Link>
        <PrintButton className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-surface hover:opacity-90">
          Cetak / Simpan PDF
        </PrintButton>
      </div>

      {/* Lembar invoice: selalu putih, juga di mode gelap */}
      <article className="invoice-sheet mx-auto max-w-3xl overflow-hidden rounded-2xl bg-white text-[#1c2030] shadow-xl shadow-slate-900/10 print:max-w-none print:rounded-none print:shadow-none">
        <div className="h-2 bg-[#ff5b14]" />
        <div className="p-6 sm:p-10">
          {/* Kepala */}
          <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <UrbanixLogoStacked className="h-16 w-auto shrink-0 text-[#111111]" />
              <div className="text-xs leading-5 text-[#4b5563]">
                <p className="text-sm font-extrabold text-[#1c2030]">{legal.company}</p>
                <p className="max-w-xs">{legal.address}</p>
                <p>
                  WA {contact.whatsappDisplay} · {contact.email}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-3xl font-extrabold tracking-tight">INVOICE</p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-[#4b5563]">{o.order_number}</p>
              <span className={`mt-3 inline-block rounded-md border-2 px-3 py-1 text-xs font-extrabold tracking-widest ${b.cls}`}>
                {b.text}
              </span>
            </div>
          </header>

          {/* Info */}
          <section className="mt-8 grid gap-6 border-y border-[#e5e7eb] py-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">Ditagihkan kepada</p>
              <p className="mt-1 font-bold">{o.customer_name || '-'}</p>
              {o.customer_phone_masked && <p className="text-[#4b5563]">{o.customer_phone_masked}</p>}
              {region && <p className="text-[#4b5563]">{region}</p>}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">Detail pesanan</p>
              <p className="mt-1 text-[#4b5563]">Tanggal: <b className="text-[#1c2030]">{fmtDate(o.created_at)}</b></p>
              <p className="text-[#4b5563]">
                Pembayaran: <b className="text-[#1c2030]">{o.payment_method === 'MIDTRANS' ? 'Bayar di web' : 'Transfer (via WhatsApp)'}</b>
              </p>
              <p className="text-[#4b5563]">Status: <b className="text-[#1c2030]">{STATUS[o.status] || o.status}</b></p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#6b7280]">Pengiriman</p>
              <p className="mt-1 text-[#4b5563]">Kurir: <b className="text-[#1c2030]">{o.shipping_courier || 'Dikonfirmasi admin'}</b></p>
              <p className="break-all text-[#4b5563]">No. resi: <b className="text-[#1c2030]">{o.tracking_number || '-'}</b></p>
            </div>
          </section>

          {/* Barang */}
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[#1c2030] text-left text-xs uppercase tracking-wider text-[#6b7280]">
                <th className="py-2 pr-3 font-bold">Produk</th>
                <th className="w-12 py-2 text-center font-bold">Qty</th>
                <th className="hidden w-32 py-2 text-right font-bold sm:table-cell print:table-cell">Harga</th>
                <th className="w-32 py-2 text-right font-bold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((it, i) => (
                <tr key={i} className="border-b border-[#e5e7eb] align-top">
                  <td className="py-3 pr-3">
                    <p className="font-semibold">{it.name}</p>
                    {(it.variation_name || it.sku) && (
                      <p className="text-xs text-[#6b7280]">
                        {it.variation_name}
                        {it.variation_name && it.sku && ' · '}
                        {it.sku && `SKU ${it.sku}`}
                      </p>
                    )}
                    <p className="text-xs text-[#6b7280] sm:hidden print:hidden">@ {money(it.unit_price)}</p>
                  </td>
                  <td className="py-3 text-center">{it.quantity}</td>
                  <td className="hidden py-3 text-right sm:table-cell print:table-cell">{money(it.unit_price)}</td>
                  <td className="py-3 text-right font-semibold">{money(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="mt-6 flex justify-end">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#4b5563]">Subtotal produk</dt>
                <dd>{money(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#047857]">
                  <dt>{o.discount_note || 'Potongan voucher'}</dt>
                  <dd>-{money(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#4b5563]">Ongkos kirim</dt>
                <dd>{hasShipping ? money(shipping) : <span className="text-[#6b7280]">menunggu konfirmasi</span>}</dd>
              </div>
              {shipDiscount > 0 && (
                <div className="flex justify-between text-[#047857]">
                  <dt>Potongan ongkir</dt>
                  <dd>-{money(shipDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-[#1c2030] pt-3 text-base">
                <dt className="font-extrabold">{hasShipping ? 'Total tagihan' : 'Total (belum termasuk ongkir)'}</dt>
                <dd className="font-extrabold">{money(hasShipping ? grand : productTotal)}</dd>
              </div>
              <p className="text-right text-xs text-[#6b7280]">Harga sudah termasuk PPN.</p>
              {o.voucher_codes && (
                <p className="text-right text-xs text-[#6b7280]">Voucher: {o.voucher_codes.split(',').join(', ')}</p>
              )}
            </dl>
          </div>

          {/* Catatan */}
          <footer className="mt-10 rounded-xl bg-[#f3f5fa] p-5 text-xs leading-5 text-[#4b5563]">
            <p className="font-bold text-[#1c2030]">Catatan pembayaran</p>
            <p className="mt-1">
              Pembayaran hanya ke rekening resmi atas nama <b>{legal.company}</b> yang diinformasikan lewat WhatsApp
              resmi {contact.whatsappDisplay}. Kami tidak pernah meminta transfer ke rekening pribadi.
            </p>
            <p className="mt-3">
              Invoice ini dibuat otomatis oleh sistem Urbanix Store dan bukan merupakan Faktur Pajak. Terima kasih
              sudah berbelanja di Urbanix Store.
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
