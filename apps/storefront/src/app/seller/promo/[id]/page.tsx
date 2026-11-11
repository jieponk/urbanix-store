'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, ConfirmButton, Drawer, Empty, ErrorBox, Field, PageHeader, STATUS_TONE, Spinner, Thumb, Toggle, btn, inputCls } from '@/components/seller/ui';
import { fromLocalInput, notify, parseNumber, rp, sellerApi, toLocalInput, useSellerData } from '@/lib/seller';

export default function PromoDetailPage({ params }: { params: { id: string } }) {
  const { data, setData, error, loading, reload } = useSellerData<any>(`promos/${params.id}`);
  const [head, setHead] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (data) setHead({ name: data.name, starts_at: toLocalInput(data.starts_at), ends_at: toLocalInput(data.ends_at), is_active: data.is_active });
  }, [data]);

  async function saveHead(patch?: any) {
    try {
      const body = patch ?? { ...head, starts_at: fromLocalInput(head.starts_at), ends_at: fromLocalInput(head.ends_at) };
      setData(await sellerApi(`promos/${params.id}`, { method: 'PATCH', body }));
      notify('Promo disimpan.');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  async function saveItems(items: any[]) {
    try {
      const r = await sellerApi(`promos/${params.id}/items`, { body: { items } });
      setData({ ...data, items: r.items, items_count: r.items.length });
      if (r.errors.length) notify(r.errors[0], 'error');
      else notify(`${r.saved} SKU disimpan.`);
      return r;
    } catch (err) {
      notify((err as Error).message, 'error');
      return null;
    }
  }

  async function removeItem(id: number) {
    await sellerApi(`promo-items/${id}`, { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
    setData({ ...data, items: data.items.filter((i: any) => i.id !== id) });
  }

  async function removePromo() {
    await sellerApi(`promos/${params.id}`, { method: 'DELETE' });
    notify('Promo dihapus.');
    window.location.href = '/seller/promo';
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if ((loading && !data) || !head) return <Spinner />;

  return (
    <div>
      <PageHeader
        back={{ href: '/seller/promo', label: 'Promo harga' }}
        title={data.name}
        subtitle={<><Badge tone={STATUS_TONE[data.status]}>{data.status}</Badge> · {data.items.length} SKU</>}
        actions={<>
          <ConfirmButton onConfirm={removePromo} confirmText="Ya, hapus promo" className={btn.ghost}>Hapus promo</ConfirmButton>
          <button type="button" className={btn.brand} onClick={() => setAdding(true)}>+ Tambah produk</button>
        </>}
      />

      <Card title="Jadwal promo" className="mb-4">
        <form className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); saveHead(); }}>
          <Field label="Nama promo"><input className={inputCls} value={head.name} onChange={(e) => setHead({ ...head, name: e.target.value })} /></Field>
          <Field label="Mulai"><input type="datetime-local" className={inputCls} value={head.starts_at} onChange={(e) => setHead({ ...head, starts_at: e.target.value })} /></Field>
          <Field label="Selesai"><input type="datetime-local" className={inputCls} value={head.ends_at} onChange={(e) => setHead({ ...head, ends_at: e.target.value })} /></Field>
          <label className="flex items-center gap-2 pb-2.5 text-sm font-bold text-ink"><Toggle checked={head.is_active} onChange={(v) => setHead({ ...head, is_active: v })} /> Aktif</label>
          <button type="submit" className={btn.primary}>Simpan</button>
        </form>
      </Card>

      <Card title="SKU dalam promo" padded={false}>
        {data.items.length === 0 ? (
          <Empty title="Belum ada produk">Klik “Tambah produk” untuk memilih SKU dan harga promonya.</Empty>
        ) : (
          <ul className="divide-y divide-slate-200">
            {data.items.map((item: any) => <ItemRow key={item.id} item={item} onSave={saveItems} onRemove={removeItem} />)}
          </ul>
        )}
      </Card>

      <AddProducts open={adding} onClose={() => setAdding(false)} onSave={async (items) => { const r = await saveItems(items); if (r && r.saved) setAdding(false); }} />
    </div>
  );
}

function ItemRow({ item, onSave, onRemove }: { item: any; onSave: (items: any[]) => Promise<any>; onRemove: (id: number) => void }) {
  const [mode, setMode] = useState<'price' | 'percent'>(item.promo_price !== null ? 'price' : 'percent');
  const [value, setValue] = useState(String(item.promo_price ?? item.discount_percent ?? ''));
  const save = () => onSave([{ product_id: item.product_id, variation_id: item.variation_id, ...(mode === 'price' ? { promo_price: parseNumber(value) } : { discount_percent: value.replace(',', '.') }) }]);
  const pct = item.normal_price ? Math.round((1 - item.final_price / item.normal_price) * 100) : 0;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
      <Thumb src={item.image_url} />
      <span className="min-w-[160px] flex-1">
        <span className="block text-sm font-bold text-ink">{item.name}</span>
        <span className="text-xs text-slate-500">{[item.variation, item.sku, `stok ${item.stock}`].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="text-right text-sm">
        <s className="block text-xs text-slate-500">{rp(item.normal_price)}</s>
        <b className="text-sale-600">{rp(item.final_price)}</b> <span className="text-xs font-bold text-sale-600">-{pct}%</span>
      </span>
      <span className="flex items-center gap-1.5">
        <select className={`${inputCls} w-auto py-2`} value={mode} onChange={(e) => setMode(e.target.value as any)} aria-label="Jenis potongan">
          <option value="price">Harga Rp</option>
          <option value="percent">Persen %</option>
        </select>
        <input className={`${inputCls} w-28 py-2`} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Nilai promo" />
        <button type="button" className={btn.small} onClick={save}>Simpan</button>
        <ConfirmButton onConfirm={() => onRemove(item.id)} confirmText="Hapus">✕</ConfirmButton>
      </span>
    </li>
  );
}

function AddProducts({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (items: any[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<Record<string, { product_id: number; variation_id: number | null; label: string; normal: number }>>({});
  const [mode, setMode] = useState<'percent' | 'price'>('percent');
  const [value, setValue] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});

  async function search(e?: { preventDefault(): void }) {
    e?.preventDefault();
    const r = await sellerApi(`products?q=${encodeURIComponent(q)}&size=10`).catch(() => null);
    setResults(r?.results ?? []);
  }

  useEffect(() => { if (open) { setPicked({}); setPrices({}); search(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function expand(p: any) {
    if (p.variations === 0) {
      togglePick(`${p.id}-`, { product_id: p.id, variation_id: null, label: p.name, normal: p.price });
      return;
    }
    const d = await sellerApi(`products/${p.id}`);
    setResults((list) => list.map((x) => (x.id === p.id ? { ...x, variation_list: d.variation_list } : x)));
  }

  function togglePick(key: string, row: any) {
    setPicked((s) => {
      const next = { ...s };
      if (next[key]) delete next[key];
      else next[key] = row;
      return next;
    });
  }

  const items = Object.entries(picked).map(([key, row]) => ({
    product_id: row.product_id,
    variation_id: row.variation_id,
    ...(mode === 'percent' ? { discount_percent: value.replace(',', '.') } : { promo_price: prices[key] ? parseNumber(prices[key]) : '' }),
  }));

  return (
    <Drawer open={open} title="Tambah produk ke promo" onClose={onClose}
      footer={<button type="button" disabled={!items.length || (mode === 'percent' && !value)} className={`${btn.primary} w-full`} onClick={() => onSave(items)}>Simpan {items.length} SKU</button>}>
      <form onSubmit={search} className="flex gap-2">
        <input className={inputCls} placeholder="Cari nama / SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className={btn.ghost}>Cari</button>
      </form>
      <div className="mt-3 flex gap-2">
        <select className={`${inputCls} w-auto`} value={mode} onChange={(e) => setMode(e.target.value as any)} aria-label="Jenis potongan">
          <option value="percent">Potongan % (semua terpilih)</option>
          <option value="price">Harga promo per SKU</option>
        </select>
        {mode === 'percent' && <input className={`${inputCls} w-24`} inputMode="decimal" placeholder="%" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Persen" />}
      </div>
      <ul className="mt-4 space-y-2">
        {results.map((p) => (
          <li key={p.id} className="rounded-xl bg-surface p-3 ring-1 ring-slate-200">
            <div className="flex items-center gap-3">
              <Thumb src={p.image_url} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{p.name}</span>
                <span className="text-xs text-slate-500">{p.sku} · {rp(p.price)}{p.variations > 0 && ` · ${p.variations} varian`}</span>
              </span>
              {p.variations === 0 ? (
                <input type="checkbox" className="h-5 w-5 accent-[#1b2559]" checked={Boolean(picked[`${p.id}-`])} onChange={() => expand(p)} aria-label={`Pilih ${p.name}`} />
              ) : !p.variation_list ? (
                <button type="button" className={btn.small} onClick={() => expand(p)}>Pilih varian</button>
              ) : null}
            </div>
            {mode === 'price' && picked[`${p.id}-`] && (
              <input className={`${inputCls} mt-2`} inputMode="numeric" placeholder={`Harga promo (normal ${rp(p.price)})`} value={prices[`${p.id}-`] || ''} onChange={(e) => setPrices({ ...prices, [`${p.id}-`]: e.target.value })} />
            )}
            {p.variation_list && (
              <ul className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                {p.variation_list.map((v: any) => {
                  const key = `${p.id}-${v.id}`;
                  return (
                    <li key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="checkbox" className="h-4 w-4 accent-[#1b2559]" checked={Boolean(picked[key])}
                        onChange={() => togglePick(key, { product_id: p.id, variation_id: v.id, label: v.name, normal: v.price })} aria-label={`Pilih ${v.name}`} />
                      <span className="flex-1">{v.name} <span className="text-xs text-slate-500">· {rp(v.price)} · stok {v.stock}</span></span>
                      {mode === 'price' && picked[key] && (
                        <input className={`${inputCls} w-32 py-1.5`} inputMode="numeric" placeholder="Harga promo" value={prices[key] || ''} onChange={(e) => setPrices({ ...prices, [key]: e.target.value })} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
