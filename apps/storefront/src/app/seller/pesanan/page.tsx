'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, Empty, ErrorBox, ORDER_TONE, PageHeader, Pagination, Spinner, Tabs, btn, inputCls } from '@/components/seller/ui';
import { fmtDateTime, query, rp, useSellerData } from '@/lib/seller';

const STATUSES = [
  { value: '', label: 'Semua' },
  { value: 'PENDING', label: 'Baru' },
  { value: 'PROCESSING', label: 'Diproses' },
  { value: 'SHIPPED', label: 'Dikirim' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

export default function OrdersPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStatus(params.get('status') || '');
  }, []);

  const params = query({ status, q: search, range, method, page });
  const { data, error, loading, reload } = useSellerData<any>(`orders${params}`);
  const counts = data?.status_counts || {};
  const total = Object.values(counts).reduce((a: number, b: any) => a + Number(b), 0);

  return (
    <div>
      <PageHeader
        title="Pesanan"
        subtitle="Pesanan dari website (pesan via WhatsApp & bayar di web)."
        actions={<a className={btn.ghost} href={`/api/seller/orders/export${query({ status, q: search, range, method })}`}>Ekspor Excel</a>}
      />
      <Tabs
        items={STATUSES.map((s) => ({ ...s, count: s.value ? counts[s.value] || 0 : total }))}
        value={status}
        onChange={(v) => { setStatus(v); setPage(1); }}
      />
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }}
      >
        <input className={`${inputCls} min-w-[200px] flex-1`} placeholder="Cari no. pesanan, nama, no. HP, resi, SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} w-auto`} value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }} aria-label="Periode">
          <option value="">Semua tanggal</option>
          <option value="today">Hari ini</option>
          <option value="7d">7 hari</option>
          <option value="30d">30 hari</option>
          <option value="month">Bulan ini</option>
        </select>
        <select className={`${inputCls} w-auto`} value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} aria-label="Metode">
          <option value="">Semua metode</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="MIDTRANS">Bayar di web</option>
        </select>
        <button type="submit" className={btn.primary}>Cari</button>
      </form>

      <Card className="mt-4" padded={false}>
        {error ? (
          <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>
        ) : loading && !data ? (
          <Spinner />
        ) : !data || data.results.length === 0 ? (
          <Empty title="Belum ada pesanan">Pesanan dari checkout website akan muncul di sini.</Empty>
        ) : (
          <>
            {/* Tabel desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Pesanan</th>
                    <th className="px-3 py-3 font-bold">Pembeli</th>
                    <th className="px-3 py-3 font-bold">Total</th>
                    <th className="px-3 py-3 font-bold">Pembayaran</th>
                    <th className="px-3 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Resi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.results.map((o: any) => (
                    <tr key={o.order_number} className="hover:bg-mist">
                      <td className="px-5 py-3">
                        <Link href={`/seller/pesanan/${o.order_number}`} className="font-bold text-ink hover:underline">{o.order_number}</Link>
                        <span className="block text-xs text-slate-500">{fmtDateTime(o.created_at)} · {o.method_label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-semibold text-ink">{o.customer_name || '-'}</span>
                        <span className="text-xs text-slate-500">{o.customer_phone} · {o.city}</span>
                      </td>
                      <td className="px-3 py-3 font-bold text-ink">
                        {rp(o.total)}
                        {o.voucher_codes && <span className="block text-[11px] font-semibold text-violet-700">{o.voucher_codes}</span>}
                      </td>
                      <td className="px-3 py-3"><Badge tone={o.payment_status === 'PAID' ? 'green' : 'gray'}>{o.payment_label}</Badge></td>
                      <td className="px-3 py-3"><Badge tone={ORDER_TONE[o.status]}>{o.status_label}</Badge></td>
                      <td className="px-5 py-3 text-xs text-slate-600">{o.tracking_number || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Kartu HP */}
            <ul className="divide-y divide-slate-200 md:hidden">
              {data.results.map((o: any) => (
                <li key={o.order_number}>
                  <Link href={`/seller/pesanan/${o.order_number}`} className="block px-4 py-3 active:bg-mist">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-ink">{o.customer_name || '-'}</span>
                        <span className="text-xs text-slate-500">{o.order_number}</span>
                      </span>
                      <Badge tone={ORDER_TONE[o.status]}>{o.status_label}</Badge>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                      <span>{fmtDateTime(o.created_at)} · {o.payment_label}</span>
                      <b className="text-sm text-ink">{rp(o.total)}</b>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
