'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, Drawer, Empty, ErrorBox, Field, PageHeader, Pagination, Spinner, Tabs, Thumb, btn, inputCls } from '@/components/seller/ui';
import { notify, query, rp, sellerApi, useSellerData } from '@/lib/seller';

const FILTERS = [
  { value: '', label: 'Aktif' },
  { value: 'promo', label: 'Sedang promo' },
  { value: 'low_stock', label: 'Stok menipis' },
  { value: 'out_of_stock', label: 'Stok habis' },
  { value: 'no_shopee', label: 'Tanpa link Shopee' },
  { value: 'no_image', label: 'Tanpa foto' },
  { value: 'inactive', label: 'Disembunyikan' },
  { value: 'all', label: 'Semua' },
];

type BulkAction = 'activate' | 'deactivate' | 'category' | 'price_percent' | 'set_stock' | 'add_promo' | 'remove_promo' | 'shopee_auto';

export default function ProductsPage() {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('name');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulk, setBulk] = useState<BulkAction | null>(null);

  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('filter');
    if (f) setFilter(f);
  }, []);

  const { data, error, loading, reload } = useSellerData<any>(`products${query({ filter, category, sort, q: search, page })}`);
  const ids: number[] = data?.results.map((p: any) => p.id) ?? [];
  const allOnPage = ids.length > 0 && ids.every((id) => selected.includes(id));
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function quick(action: BulkAction) {
    try {
      const r = await sellerApi('products/bulk', { body: { ids: selected, action } });
      notify(`${r.updated} produk diperbarui.`);
      setSelected([]);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Produk & SKU"
        subtitle="Edit harga, stok, link Shopee, dan tampil/sembunyikan produk."
        actions={<Link href="/seller/mass-update" className={btn.ghost}>Mass update via Excel</Link>}
      />
      <Tabs items={FILTERS} value={filter} onChange={(v) => { setFilter(v); setPage(1); setSelected([]); }} />
      <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }}>
        <input className={`${inputCls} min-w-[200px] flex-1`} placeholder="Cari nama atau SKU (termasuk SKU varian)…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inputCls} w-auto`} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Kategori">
          <option value="">Semua kategori</option>
          {(data?.categories ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan">
          <option value="name">Nama A–Z</option>
          <option value="-id">Terbaru</option>
          <option value="stock">Stok paling sedikit</option>
          <option value="-stock">Stok paling banyak</option>
          <option value="price">Harga termurah</option>
          <option value="-price">Harga termahal</option>
        </select>
        <button type="submit" className={btn.primary}>Cari</button>
      </form>

      {selected.length > 0 && (
        <div className="sticky top-16 z-30 mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-cobalt-900 px-4 py-3 text-white shadow-lg">
          <b className="mr-2 text-sm">{selected.length} dipilih</b>
          <button type="button" className={btn.small} onClick={() => quick('activate')}>Tampilkan</button>
          <button type="button" className={btn.small} onClick={() => quick('deactivate')}>Sembunyikan</button>
          <button type="button" className={btn.small} onClick={() => setBulk('price_percent')}>Ubah harga %</button>
          <button type="button" className={btn.small} onClick={() => setBulk('set_stock')}>Set stok</button>
          <button type="button" className={btn.small} onClick={() => setBulk('category')}>Pindah kategori</button>
          <button type="button" className={btn.small} onClick={() => setBulk('add_promo')}>Masukkan ke promo</button>
          <button type="button" className={btn.small} onClick={() => setBulk('remove_promo')}>Keluarkan dari promo</button>
          <button type="button" className={btn.small} onClick={() => quick('shopee_auto')}>Isi link Shopee otomatis</button>
          <button type="button" className="ml-auto text-xs font-bold underline" onClick={() => setSelected([])}>Batal pilih</button>
        </div>
      )}

      <Card className="mt-3" padded={false}>
        {error ? (
          <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>
        ) : loading && !data ? (
          <Spinner />
        ) : !data || data.results.length === 0 ? (
          <Empty title="Tidak ada produk">Coba ubah filter atau kata kunci.</Empty>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 sm:px-5">
              <input
                type="checkbox"
                aria-label="Pilih semua di halaman ini"
                checked={allOnPage}
                onChange={() => setSelected((s) => (allOnPage ? s.filter((id) => !ids.includes(id)) : Array.from(new Set([...s, ...ids]))))}
                className="h-4 w-4 accent-[#1b2559]"
              />
              <span className="flex-1">Produk</span>
              <span className="hidden w-32 text-right sm:block">Harga</span>
              <span className="hidden w-20 text-right sm:block">Stok</span>
              <span className="hidden w-24 text-right md:block">Status</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {data.results.map((p: any) => (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${selected.includes(p.id) ? 'bg-sky-50 dark:bg-sky-950/30' : ''}`}>
                  <input type="checkbox" aria-label={`Pilih ${p.name}`} checked={selected.includes(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-[#1b2559]" />
                  <Thumb src={p.image_url} />
                  <Link href={`/seller/produk/${p.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink hover:underline">{p.name}</span>
                    <span className="block text-xs text-slate-500">
                      {p.sku} · {p.category}{p.variations > 0 && ` · ${p.variations} varian`}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-1 sm:hidden">
                      <b className="text-xs text-ink">{rp(p.final_price)}</b>
                      <span className="text-xs text-slate-500">· stok {p.stock}</span>
                    </span>
                    {!p.shopee_url && <span className="mt-1 inline-block"><Badge tone="amber">Belum ada link Shopee</Badge></span>}
                  </Link>
                  <span className="hidden w-32 text-right text-sm sm:block">
                    <b className="text-ink">{p.variations > 0 && 'mulai '}{rp(p.final_price)}</b>
                    {p.discount_percent > 0 && (
                      <span className="block text-xs text-slate-500"><s>{rp(p.price)}</s> <span className="font-bold text-sale-600">-{p.discount_percent}%</span></span>
                    )}
                  </span>
                  <span className={`hidden w-20 text-right text-sm font-bold sm:block ${p.stock === 0 ? 'text-red-600' : p.stock <= 2 ? 'text-amber-700' : 'text-ink'}`}>{p.stock}</span>
                  <span className="hidden w-24 text-right md:block">
                    {p.is_active ? <Badge tone="green">Tampil</Badge> : <Badge tone="gray">Disembunyikan</Badge>}
                    {p.promo_name && <span className="mt-1 block"><Badge tone="red">Promo</Badge></span>}
                  </span>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
          </>
        )}
      </Card>

      <BulkDrawer
        action={bulk}
        ids={selected}
        categories={data?.categories ?? []}
        onClose={() => setBulk(null)}
        onDone={() => { setBulk(null); setSelected([]); reload(); }}
      />
    </div>
  );
}

function BulkDrawer({
  action,
  ids,
  categories,
  onClose,
  onDone,
}: {
  action: BulkAction | null;
  ids: number[];
  categories: { id: number; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState('');
  const [round, setRound] = useState('1000');
  const [promoId, setPromoId] = useState('');
  const [promos, setPromos] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue('');
    if (action === 'add_promo' || action === 'remove_promo') {
      sellerApi<any[]>('promos').then((list) => { setPromos(list); setPromoId(list[0] ? String(list[0].id) : ''); }).catch(() => null);
    }
  }, [action]);

  const titles: Record<string, string> = {
    price_percent: 'Ubah harga sekaligus',
    set_stock: 'Set stok sekaligus',
    category: 'Pindah kategori',
    add_promo: 'Masukkan ke promo',
    remove_promo: 'Keluarkan dari promo',
  };

  async function apply() {
    let body: any = { ids, action };
    if (action === 'price_percent') body = { ...body, value: Number(value), round: Number(round) };
    else if (action === 'set_stock' || action === 'category') body.value = value;
    else if (action === 'add_promo') body.value = { price_cut_id: promoId, discount_percent: value };
    else if (action === 'remove_promo') body.value = promoId;
    setBusy(true);
    try {
      const r = await sellerApi('products/bulk', { body });
      notify(`${r.updated} produk diperbarui.`);
      onDone();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={action !== null && !['activate', 'deactivate'].includes(action ?? '')}
      title={titles[action ?? ''] ?? ''}
      onClose={onClose}
      footer={<button type="button" disabled={busy} className={`${btn.primary} w-full`} onClick={apply}>{busy ? 'Memproses…' : `Terapkan ke ${ids.length} produk`}</button>}
    >
      <div className="space-y-4">
        {action === 'price_percent' && (
          <>
            <Field label="Perubahan harga (%)" hint="Contoh: 5 = naik 5%, -10 = turun 10%. Berlaku untuk harga normal produk & semua variannya.">
              <input className={inputCls} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="mis. 5 atau -10" />
            </Field>
            <Field label="Pembulatan harga">
              <select className={inputCls} value={round} onChange={(e) => setRound(e.target.value)}>
                <option value="1">Tanpa pembulatan</option>
                <option value="100">Ke Rp100 terdekat</option>
                <option value="1000">Ke Rp1.000 terdekat</option>
                <option value="10000">Ke Rp10.000 terdekat</option>
              </select>
            </Field>
          </>
        )}
        {action === 'set_stock' && (
          <Field label="Stok baru" hint="Produk bervarian: stok setiap varian diisi angka ini.">
            <input className={inputCls} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}
        {action === 'category' && (
          <Field label="Kategori tujuan">
            <select className={inputCls} value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="">Pilih kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {(action === 'add_promo' || action === 'remove_promo') && (
          promos.length === 0 ? (
            <p className="text-sm text-slate-600">Belum ada promo. Buat dulu di menu <b>Promo harga</b>.</p>
          ) : (
            <Field label="Promo">
              <select className={inputCls} value={promoId} onChange={(e) => setPromoId(e.target.value)}>
                {promos.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
              </select>
            </Field>
          )
        )}
        {action === 'add_promo' && (
          <Field label="Potongan (%)" hint="Berlaku untuk semua varian produk terpilih. Harga promo per SKU bisa diatur detail di menu Promo harga.">
            <input className={inputCls} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="mis. 10" />
          </Field>
        )}
      </div>
    </Drawer>
  );
}
