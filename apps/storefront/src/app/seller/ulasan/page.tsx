'use client';

import { useState } from 'react';
import { Badge, Card, ConfirmButton, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, Toggle } from '@/components/seller/ui';
import { fmtDate, notify, query, sellerApi, useSellerData } from '@/lib/seller';

export default function ReviewsAdminPage() {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const rating = /^\d$/.test(filter) ? filter : '';
  const { data, setData, error, loading, reload } = useSellerData<any>(`reviews${query({ filter: rating ? '' : filter, rating, page })}`);

  async function publish(id: number, value: boolean) {
    try {
      const row = await sellerApi(`reviews/${id}`, { method: 'PATCH', body: { is_published: value } });
      setData({ ...data, results: data.results.map((r: any) => (r.id === id ? row : r)) });
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHeader title="Ulasan" subtitle="Ulasan asli pembeli yang tampil di beranda & halaman produk." />
      <Tabs items={[{ value: '', label: 'Semua' }, { value: '5', label: '★5' }, { value: '4', label: '★4' }, { value: '3', label: '★3 ke bawah' }, { value: 'hidden', label: 'Disembunyikan' }]}
        value={filter} onChange={(v) => { setFilter(v); setPage(1); }} />
      <Card className="mt-3" padded={false}>
        {error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : loading && !data ? <Spinner /> : !data || data.results.length === 0 ? <Empty title="Tidak ada ulasan" /> : (
          <>
            <ul className="divide-y divide-slate-200">
              {data.results.map((r: any) => (
                <li key={r.id} className="flex gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <b className="text-ink">{r.customer_name}</b>
                      <span className="text-amber-500" aria-label={`${r.rating} bintang`}>{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></span>
                      <span className="text-xs text-slate-500">{fmtDate(r.date)} · {r.source}</span>
                      {!r.is_published && <Badge tone="gray">Disembunyikan</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink">{r.text || <i className="text-slate-500">(tanpa komentar)</i>}</p>
                    <p className="mt-1 text-xs text-slate-500">{r.product}{r.variation && ` · ${r.variation}`}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Toggle checked={r.is_published} onChange={(x) => publish(r.id, x)} label="Tampilkan" />
                    <ConfirmButton confirmText="Hapus?" onConfirm={async () => { await sellerApi(`reviews/${r.id}`, { method: 'DELETE' }); reload(); }}>Hapus</ConfirmButton>
                  </div>
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
