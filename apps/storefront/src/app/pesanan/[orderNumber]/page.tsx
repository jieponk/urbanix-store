import Link from 'next/link';
import GoogleReviewsOptIn from '@/components/GoogleReviewsOptIn';
import CopyText from '@/components/CopyText';
import { API, money } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Status Pesanan', robots: { index: false, follow: false } };

type OrderDetail = {
  order_number: string;
  created_at: string;
  customer_name: string;
  payment_method: 'MIDTRANS' | 'WHATSAPP' | '';
  payment_status: 'UNPAID' | 'PAID' | 'FAILED' | 'EXPIRED';
  status: string;
  total_amount: string;
  discount_amount?: string;
  discount_note?: string;
  voucher_codes?: string;
  shipping_discount_max?: string;
  tax_note?: string;
  shipping_note: string;
  shipping_courier?: string;
  shipping_service?: string;
  tracking_number?: string;
  shipping_cost?: string | null;
  customer_email_masked?: string;
  email_enabled?: boolean;
  payment_url: string;
  whatsapp_url: string;
  review_url?: string;
  items: {
    product_id: number | null;
    name: string;
    variation_name: string;
    sku: string;
    unit_price: string;
    quantity: number;
    subtotal: string;
  }[];
};

async function getOrder(orderNumber: string): Promise<OrderDetail | null> {
  try {
    const res = await fetch(`${API}/checkout/orders/${encodeURIComponent(orderNumber)}/`, {
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as OrderDetail) : null;
  } catch (error) {
    console.error('[Pesanan] Gagal mengambil pesanan:', error);
    return null;
  }
}

function statusInfo(order: OrderDetail, fromMidtrans: boolean) {
  if (order.status === 'CANCELLED' && order.payment_method === 'WHATSAPP')
    return { tone: 'red', title: 'Pesanan dibatalkan', text: 'Hubungi admin bila ini keliru.' };
  if (order.payment_method === 'WHATSAPP') {
    if (order.status === 'PENDING')
      return {
        tone: 'amber',
        title: 'Satu langkah lagi: kirim pesanan ke WhatsApp',
        text: 'Pesanan baru diproses setelah kamu mengirim chat ke admin. Admin akan membalas total dengan ongkir dan cara pembayaran.',
      };
    return { tone: 'green', title: 'Pesanan sedang diproses', text: 'Terima kasih! Admin akan mengabari lewat WhatsApp.' };
  }
  switch (order.payment_status) {
    case 'PAID':
      return { tone: 'green', title: 'Pembayaran diterima', text: 'Terima kasih! Pesananmu sedang kami siapkan.' };
    case 'EXPIRED':
      return { tone: 'red', title: 'Batas waktu pembayaran habis', text: 'Pesanan dibatalkan otomatis. Silakan belanja ulang.' };
    case 'FAILED':
      return { tone: 'red', title: 'Pembayaran gagal', text: 'Pesanan dibatalkan. Silakan coba belanja ulang.' };
    default:
      return fromMidtrans
        ? {
            tone: 'amber',
            title: 'Menunggu konfirmasi pembayaran',
            text: 'Kalau kamu sudah membayar, status akan berubah dalam beberapa menit. Muat ulang halaman ini untuk mengecek.',
          }
        : { tone: 'amber', title: 'Menunggu pembayaran', text: 'Selesaikan pembayaran sebelum batas waktunya habis.' };
  }
}

const STEPS = [
  { key: 'PENDING', label: 'Dipesan' },
  { key: 'PROCESSING', label: 'Diproses' },
  { key: 'SHIPPED', label: 'Dikirim' },
  { key: 'COMPLETED', label: 'Selesai' },
];

const TONES: Record<string, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-800',
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const order = await getOrder(params.orderNumber);

  if (!order) {
    return (
      <div className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-surface p-8 text-center">
          <h1 className="text-xl font-black text-slate-900">Pesanan tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">
            Periksa kembali nomor pesanan, atau server toko sedang tidak dapat diakses.
          </p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-slate-800">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  const info = statusInfo(order, Boolean(searchParams.transaction_status));
  const created = new Date(order.created_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  });

  return (
    <div className="px-4 py-6 sm:py-10">
      <GoogleReviewsOptIn orderNumber={order.order_number} />
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="rounded-2xl border border-dashed border-brand-500 bg-surface p-5">
          <p className="text-sm text-slate-500">Nomor pesanan</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="min-w-0 flex-1 break-all font-mono text-xl font-black text-ink sm:text-2xl">{order.order_number}</h1>
            <CopyText text={order.order_number} remember />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {created} · a.n. {order.customer_name}
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Simpan nomor ini untuk <Link href="/cek-pesanan" className="font-bold text-ink underline">cek pesanan</Link> dan
            invoice.
            {order.email_enabled && order.customer_email_masked
              ? ` Salinannya juga kami kirim ke email ${order.customer_email_masked}.`
              : ' Nomor ini juga tercantum di chat WhatsApp pesananmu.'}
          </p>
        </div>

        <div className={`rounded-2xl border p-5 ${TONES[info.tone]}`}>
          <p className="font-bold">{info.title}</p>
          <p className="mt-1 text-sm">{info.text}</p>

          {order.payment_method === 'WHATSAPP' && order.whatsapp_url && order.status === 'PENDING' && (
            <a
              href={order.whatsapp_url}
              className="mt-4 block rounded-xl bg-emerald-600 px-5 py-4 text-center font-bold text-white hover:bg-emerald-700"
            >
              Kirim Pesanan ke WhatsApp
            </a>
          )}
          {order.payment_method === 'MIDTRANS' && order.payment_url && order.payment_status === 'UNPAID' && (
            <a
              href={order.payment_url}
              className="mt-4 block rounded-xl bg-brand-600 px-5 py-4 text-center font-bold text-white hover:bg-brand-700"
            >
              Lanjutkan Pembayaran
            </a>
          )}
        </div>

        {order.review_url && (
          <a
            href={order.review_url}
            className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-600 to-sun-400 p-5 text-white shadow-sm transition hover:brightness-105"
          >
            <span>
              <span className="block font-extrabold">Barang sudah sampai? Beri ulasan ⭐</span>
              <span className="mt-0.5 block text-sm text-white/90">Bantu pembeli lain, hanya 1 menit.</span>
            </span>
            <span aria-hidden="true" className="text-2xl">→</span>
          </a>
        )}

        {order.status !== 'CANCELLED' && (
          <section className="rounded-2xl border border-slate-200 bg-surface p-5">
            <h2 className="font-black text-ink">Lacak pesanan</h2>
            <ol className="mt-4 grid grid-cols-4 gap-1 text-center text-[11px] font-semibold sm:text-xs">
              {STEPS.map((step, i) => {
                const current = Math.max(0, STEPS.findIndex((x) => x.key === order.status));
                const done = i <= current;
                return (
                  <li key={step.key} className="relative">
                    {i > 0 && (
                      <span aria-hidden="true" className={`absolute right-1/2 top-3.5 h-0.5 w-full ${i <= current ? 'bg-emerald-600' : 'bg-slate-200'}`} />
                    )}
                    <span
                      className={`relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${
                        done ? 'bg-emerald-700 text-white' : 'bg-mist text-slate-500 ring-1 ring-slate-200'
                      }`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span className={`mt-1.5 block ${done ? 'text-ink' : 'text-slate-500'}`}>{step.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-5 border-t border-slate-200 pt-4" />
            {order.tracking_number ? (
              <div className="space-y-3 text-sm">
                <p className="text-slate-600">
                  Kurir: <b className="text-ink">{order.shipping_courier || '-'}</b>
                </p>
                <div className="flex items-center gap-3 rounded-xl bg-mist p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">No. resi</p>
                    <p className="break-all font-mono font-bold text-ink">{order.tracking_number}</p>
                  </div>
                  <CopyText text={order.tracking_number} label="Salin resi" />
                </div>
                <a
                  href={`https://cekresi.com/?noresi=${encodeURIComponent(order.tracking_number)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-bold text-ink underline"
                >
                  Lacak paket di cekresi.com →
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {order.status === 'COMPLETED'
                  ? 'Pesanan sudah selesai.'
                  : `Nomor resi akan muncul di sini setelah paket dikirim admin.${order.shipping_service ? ` Pengiriman dipilih: ${order.shipping_service}.` : ''}`}
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-surface p-5">
          <h2 className="font-black text-slate-900">Rincian</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4 py-3 text-sm">
                <span className="min-w-0">
                  {item.product_id ? (
                    <Link href={`/produk/${item.product_id}`} className="text-slate-800 hover:text-slate-900">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                  {(item.variation_name || item.sku) && (
                    <span className="block text-xs text-slate-500">
                      {item.variation_name}
                      {item.variation_name && item.sku && ' · '}
                      {item.sku && `SKU ${item.sku}`}
                    </span>
                  )}
                  <span className="block text-xs text-slate-500">
                    {item.quantity} × {money(item.unit_price)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold">{money(item.subtotal)}</span>
              </li>
            ))}
          </ul>
          {Number(order.discount_amount) > 0 && (
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-sm text-emerald-700">
              <span>{order.discount_note || 'Potongan'}</span>
              <span className="font-semibold">-{money(order.discount_amount || 0)}</span>
            </div>
          )}
          {Number(order.shipping_discount_max) > 0 && (
            <div className="mt-2 flex justify-between text-sm text-emerald-700">
              <span>Potongan ongkir</span>
              <span className="font-semibold">s/d {money(order.shipping_discount_max || 0)}</span>
            </div>
          )}
          {order.voucher_codes && (
            <p className="mt-1 text-xs text-slate-500">Voucher: {order.voucher_codes.split(',').join(', ')}</p>
          )}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-3">
            <span className="font-bold">Total produk</span>
            <span className="font-black">{money(order.total_amount)}</span>
          </div>
          <p className="mt-1 text-right text-xs text-slate-500">
            {order.tax_note || 'Harga sudah termasuk PPN.'} {order.shipping_note}
            {Number(order.shipping_discount_max) > 0 && ' Potongan ongkir dikurangi saat admin mengonfirmasi ongkir.'}
          </p>
        </section>

        {order.status !== 'CANCELLED' && (
          <Link
            href={`/pesanan/${order.order_number}/invoice`}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-surface px-5 py-3.5 text-sm font-bold text-ink hover:border-ink"
          >
            Lihat / unduh invoice
          </Link>
        )}

        <Link href="/produk" className="block text-center text-sm font-semibold text-ink hover:underline">
          Lanjut belanja
        </Link>
      </div>
    </div>
  );
}
