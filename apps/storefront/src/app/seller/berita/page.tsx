'use client';

import { useState } from 'react';
import { Badge, Card, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, Toggle, btn, inputCls } from '@/components/seller/ui';
import { fmtDateTime, notify, query, sellerApi, useSellerData } from '@/lib/seller';

export default function NewsAdminPage() {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(false);
  const { data, setData, error, loading, reload } = useSellerData<any>(`news${query({ filter, page })}`);

  async function patch(id: number, body: any) {
    try {
      const row = await sellerApi(`news/${id}`, { method: 'PATCH', body });
      setData({ ...data, results: data.results.map((a: any) => (a.id === id ? row : a)) });
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function fetchNow() {
    setFetching(true);
    try {
      const r = await sellerApi('news/fetch', { body: {} });
      notify(`${r.new} berita baru diambil.`);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setFetching(false);
    }
  }

  async function toggleSource(id: number, active: boolean) {
    await sellerApi(`news-sources/${id}`, { method: 'PATCH', body: { is_active: active } }).catch((e) => notify(e.message, 'error'));
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Berita"
        subtitle="Berita kamera otomatis dari RSS (tiap 2 jam). Sembunyikan, sematkan, atau perbaiki judul terjemahan."
        actions={<button type="button" disabled={fetching} className={btn.primary} onClick={fetchNow}>{fetching ? 'Mengambil…' : 'Ambil berita sekarang'}</button>}
      />
      {data && !data.translation_ready && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">DEEPL_API_KEY belum diisi di .env backend: berita bahasa Inggris belum diterjemahkan.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div>
          <Tabs items={[{ value: '', label: 'Semua' }, { value: 'pinned', label: 'Disematkan' }, { value: 'hidden', label: 'Disembunyikan' }, { value: 'untranslated', label: 'Belum diterjemahkan' }]}
            value={filter} onChange={(v) => { setFilter(v); setPage(1); }} />
          <Card className="mt-3" padded={false}>
            {error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div> : loading && !data ? <Spinner /> : !data || data.results.length === 0 ? <Empty title="Tidak ada berita" /> : (
              <>
                <ul className="divide-y divide-slate-200">
                  {data.results.map((a: any) => <NewsRow key={a.id} a={a} onPatch={patch} />)}
                </ul>
                <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
              </>
            )}
          </Card>
        </div>
        <Card title="Sumber berita" padded={false}>
          <ul className="divide-y divide-slate-200">
            {(data?.sources ?? []).map((s: any) => (
              <li key={s.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{s.name}</span>
                    <span className="text-xs text-slate-500">{s.language === 'id' ? 'Indonesia' : 'Inggris'} · {s.articles} berita</span>
                  </span>
                  <Toggle checked={s.is_active} onChange={(x) => toggleSource(s.id, x)} label={`Aktifkan ${s.name}`} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{s.last_fetched_at ? `Diambil ${fmtDateTime(s.last_fetched_at)}` : 'Belum diambil'}</p>
                {s.last_error && <p className="mt-1 text-xs text-red-600">{s.last_error}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function NewsRow({ a, onPatch }: { a: any; onPatch: (id: number, body: any) => void }) {
  const [title, setTitle] = useState(a.title);
  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {a.image_url ? <img src={a.image_url} alt="" referrerPolicy="no-referrer" className="hidden h-16 w-24 shrink-0 rounded-lg object-cover sm:block" /> : <span className="hidden h-16 w-24 shrink-0 rounded-lg bg-mist sm:block" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <b className="text-ink">{a.source}</b> · {fmtDateTime(a.published_at)}
          {a.is_pinned && <Badge tone="amber">Disematkan</Badge>}
          {!a.is_visible && <Badge tone="gray">Disembunyikan</Badge>}
          {!a.is_translated && <Badge tone="blue">EN</Badge>}
        </div>
        <input className={`${inputCls} mt-1.5 py-1.5 font-semibold`} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Judul" />
        {a.original_title !== a.title && <p className="mt-1 truncate text-xs text-slate-500">Asli: {a.original_title}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-ink">
          {title !== a.title && <button type="button" className={btn.small} onClick={() => onPatch(a.id, { title })}>Simpan judul</button>}
          <label className="flex items-center gap-1.5"><Toggle checked={a.is_visible} onChange={(x) => onPatch(a.id, { is_visible: x })} /> Tampil</label>
          <label className="flex items-center gap-1.5"><Toggle checked={a.is_pinned} onChange={(x) => onPatch(a.id, { is_pinned: x })} /> Sematkan</label>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="ml-auto underline">Artikel asli</a>
        </div>
      </div>
    </li>
  );
}
