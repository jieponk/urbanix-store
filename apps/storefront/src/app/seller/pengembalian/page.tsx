'use client';

import { sellerHref } from '@/lib/sellerUrl';
import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs } from '@/components/seller/ui';
import { RETURN_TONE, fmtDateTime, query, rp, useSellerData } from '@/lib/seller';


export default function ReturnsPage() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useSellerData<any>(`pengembalian${query({ status, page })}`);
  const counts = data?.counts || {};
  const open = ['REQUESTED', 'APPROVED', 'RETURN_SHIPPED', 'RECEIVED'].reduce((n, k) => n + (counts[k] || 0), 0);

  return (
    <div>
      <PageHeader pretitle="Penjualan" title="Pengembalian" subtitle="Retur barang & pengembalian dana. Tinjau maksimal 1×24 jam, dana dikembalikan maksimal 7 hari kerja." />
      <Tabs
        value={status}
        onChange={(v: string) => { setStatus(v); setPage(1); }}
        items={[
          { value: 'open', label: 'Perlu diproses', count: open },
          { value: 'REQUESTED', label: 'Diajukan', count: counts.REQUESTED || 0 },
          { value: 'REFUNDED', label: 'Dana dikembalikan', count: counts.REFUNDED || 0 },
          { value: 'REPLACED', label: 'Tukar barang', count: counts.REPLACED || 0 },
          { value: 'REJECTED', label: 'Ditolak', count: counts.REJECTED || 0 },
          { value: '', label: 'Semua' },
        ]}
      />
      <div className="mt-4">
        {error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : loading && !data ? (
          <Spinner />
        ) : !data?.results?.length ? (
          <Card><Empty title="Belum ada pengembalian" /></Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-slate-200">
              {data.results.map((r: any) => (
                <li key={r.id}>
                  <Link href={sellerHref(`/seller/pengembalian/${r.id}`)} className="grid grid-cols-1 gap-1 px-4 py-3 hover:bg-mist sm:grid-cols-[1fr_auto] sm:items-center sm:px-5">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="text-sm text-ink">{r.order_number}</b>
                        <Badge tone={RETURN_TONE[r.status]}>{r.status_label}</Badge>
                        {r.video_via_whatsapp && <Badge tone="gray">video via WA</Badge>}
                      </span>
                      <span className="block truncate text-sm text-slate-600">{r.reason_label} · {r.resolution_label}</span>
                      <span className="block text-xs text-slate-500">{r.customer_name} · {fmtDateTime(r.created_at)}</span>
                    </span>
                    <span className="text-sm font-bold text-ink sm:text-right">{rp(r.billed_amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
          </Card>
        )}
      </div>
    </div>
  );
}
