'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, ConfirmButton, Drawer, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, Thumb, btn, inputCls } from '@/components/seller/ui';
import { fmtDate, notify, query, sellerApi, useSellerData } from '@/lib/seller';

export default function ArticlesPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [catsOpen, setCatsOpen] = useState(false);
  const { data, error, loading, reload } = useSellerData<any>(`articles${query({ status, q: search, page, size: 20 })}`);

  async function pin(a: any) {
    await sellerApi(`articles/${a.id}`, { method: 'PATCH', body: { is_pinned: !a.is_pinned } }).catch((e) => notify(e.message, 'error'));
    notify(a.is_pinned ? 'Artikel tidak lagi disematkan.' : 'Artikel disematkan di atas halaman Inspirasi.');
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Artikel Urbanix"
        subtitle="Tulisan di menu Inspirasi. Artikel yang disematkan tampil paling atas."
        actions={
          <>
            <button type="button" className={btn.ghost} onClick={() => setCatsOpen(true)}>Kategori</button>
            <Link href="/seller/artikel/baru" className={btn.brand}>+ Tulis artikel</Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          items={[{ value: '', label: 'Semua' }, { value: 'PUBLISHED', label: 'Terbit' }, { value: 'DRAFT', label: 'Draf' }]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q); setPage(1); }} className="ml-auto flex gap-2">
          <input className={`${inputCls} w-56`} placeholder="Cari judul" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className={btn.ghost}>Cari</button>
        </form>
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.results?.length ? (
        <Card><Empty title="Belum ada artikel">Klik “Tulis artikel” untuk membuat tulisan pertama.</Empty></Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-200">
            {data.results.map((a: any) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <Thumb src={a.cover || '/inspirasi/default-cover.webp'} />
                <div className="min-w-0 flex-1">
                  <Link href={`/seller/artikel/${a.id}`} className="line-clamp-1 font-bold text-ink hover:underline">{a.title}</Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <Badge tone={a.status === 'PUBLISHED' ? 'green' : 'gray'}>{a.status === 'PUBLISHED' ? 'Terbit' : 'Draf'}</Badge>
                    {a.is_pinned && <Badge tone="amber">📌 Disematkan</Badge>}
                    {a.category && <span>{a.category.name}</span>}
                    <span>· {a.status === 'PUBLISHED' ? fmtDate(a.published_at) : `diubah ${fmtDate(a.updated_at)}`}</span>
                    <span>· {a.views} dibaca</span>
                    {a.pending_comments > 0 && (
                      <Link href="/seller/komentar" className="font-bold text-amber-700">· {a.pending_comments} komentar menunggu</Link>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" className={btn.small} onClick={() => pin(a)}>{a.is_pinned ? 'Lepas sematan' : 'Sematkan'}</button>
                  {a.status === 'PUBLISHED' && (
                    <a href={`/inspirasi/${a.slug}`} target="_blank" rel="noopener noreferrer" className={btn.small}>Lihat</a>
                  )}
                  <Link href={`/seller/artikel/${a.id}`} className={btn.small}>Edit</Link>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
        </Card>
      )}

      <CategoryDrawer open={catsOpen} onClose={() => setCatsOpen(false)} />
    </div>
  );
}

function CategoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, reload } = useSellerData<any[]>(open ? 'article-categories' : null);
  const [name, setName] = useState('');
  const [edit, setEdit] = useState<Record<number, string>>({});

  async function add(e: { preventDefault(): void }) {
    e.preventDefault();
    try {
      await sellerApi('article-categories', { body: { name } });
      setName('');
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <Drawer open={open} title="Kategori artikel" onClose={onClose}>
      <form onSubmit={add} className="flex gap-2">
        <input className={inputCls} placeholder="Nama kategori baru" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={!name.trim()} className={btn.primary}>Tambah</button>
      </form>
      <ul className="mt-4 space-y-2">
        {(data ?? []).map((c) => (
          <li key={c.id} className="flex items-center gap-2 rounded-xl bg-surface p-2.5 ring-1 ring-slate-200">
            <input
              className={inputCls}
              value={edit[c.id] ?? c.name}
              onChange={(e) => setEdit({ ...edit, [c.id]: e.target.value })}
              aria-label={`Nama kategori ${c.name}`}
            />
            {edit[c.id] !== undefined && edit[c.id] !== c.name && (
              <button
                type="button"
                className={btn.small}
                onClick={async () => {
                  await sellerApi(`article-categories/${c.id}`, { method: 'PATCH', body: { name: edit[c.id] } }).catch((e) => notify(e.message, 'error'));
                  setEdit((s) => { const n = { ...s }; delete n[c.id]; return n; });
                  reload();
                }}
              >
                Simpan
              </button>
            )}
            <span className="shrink-0 text-xs text-slate-500">{c.count} artikel</span>
            <ConfirmButton
              className={btn.small}
              confirmText="Hapus?"
              onConfirm={async () => {
                await sellerApi(`article-categories/${c.id}`, { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
                reload();
              }}
            >
              Hapus
            </ConfirmButton>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-500">Menghapus kategori tidak menghapus artikelnya; artikel jadi tanpa kategori.</p>
    </Drawer>
  );
}
