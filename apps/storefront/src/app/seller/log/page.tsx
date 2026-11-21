'use client';

import { useEffect, useState } from 'react';
import { Card, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, inputCls } from '@/components/seller/ui';
import { fmtDateTime, query, useSellerData } from '@/lib/seller';

const KINDS = [
  { value: '', label: 'Semua' },
  { value: 'orders', label: 'Pesanan & resi' },
  { value: 'login', label: 'Login' },
  { value: 'system', label: 'Sistem' },
];

/** Nama aksi lama (kode) → kalimat yang mudah dibaca. */
const LABELS: Record<string, string> = {
  ORDER_CREATED: 'Pesanan baru masuk',
  SHIPMENT_CREATED: 'Resi Biteship dibuat',
  SHIPMENT_CANCELLED: 'Resi Biteship dibatalkan',
};

function tone(action: string) {
  if (action.startsWith('Login gagal') || action.startsWith('Login ditolak')) return 'text-red-700';
  if (action.startsWith('Hapus')) return 'text-red-700';
  return 'text-ink';
}

export default function ActivityLogPage() {
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, loading, reload } = useSellerData<any>(`log${query({ kind, q, page })}`);

  return (
    <div>
      <PageHeader pretitle="Toko" title="Log aktivitas" subtitle="Semua perubahan yang dilakukan admin di Seller Center, login, dan aksi otomatis sistem." />
      <Tabs
        value={kind}
        onChange={(v: string) => { setKind(v); setPage(1); }}
        items={KINDS}
      />
      <div className="mb-4 mt-4">
        <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari aksi, no. pesanan, atau nama admin…" />
      </div>
      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : !data?.results?.length ? (
        <Empty title="Belum ada aktivitas" />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-200">
            {data.results.map((row: any) => (
              <li key={row.id} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[150px_140px_1fr] sm:gap-4 sm:px-5">
                <span className="text-xs text-slate-500 tabular-nums">{fmtDateTime(row.time)}</span>
                <span className="truncate text-xs font-semibold text-slate-600">{row.actor}</span>
                <span className="min-w-0">
                  <span className={`block text-sm font-semibold ${tone(row.action)}`}>{LABELS[row.action] || row.action}</span>
                  {row.details && row.details !== '-' && <span className="block break-words text-xs text-slate-500">{row.details}</span>}
                </span>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
        </Card>
      )}
    </div>
  );
}
