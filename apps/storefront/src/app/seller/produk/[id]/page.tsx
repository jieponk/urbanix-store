'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, ErrorBox, Field, PageHeader, Spinner, Thumb, Toggle, btn, inputCls } from '@/components/seller/ui';
import { notify, rp, sellerApi, useSellerData } from '@/lib/seller';

export default function ProductEditPage({ params }: { params: { id: string } }) {
  const { data, setData, error, loading, reload } = useSellerData<any>(`products/${params.id}`);
  const [form, setForm] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    sellerApi<any[]>('categories').then(setCats).catch(() => null);
  }, []);

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name, sku: data.sku, category_id: data.category_id, description: data.description || '',
      price: String(data.base_price), stock: String(data.stock), shopee_url: data.shopee_url, image_url: data.image_url,
    });
  }, [data]);

  async function save(patch: Record<string, unknown>, message = 'Produk disimpan.') {
    setSaving(true);
    try {
      setData(await sellerApi(`products/${params.id}`, { method: 'PATCH', body: patch }));
      notify(message);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if ((loading && !data) || !form) return <Spinner />;
  const hasVariations = data.variation_list.length > 0;

  return (
    <div>
      <PageHeader
        back={{ href: '/seller/produk', label: 'Produk & SKU' }}
        title={data.name}
        subtitle={<>SKU {data.sku} · {data.category} {data.promo_name && <Badge tone="red">Promo: {data.promo_name}</Badge>}</>}
        actions={
          <>
            <Link href={`/produk/${data.id}`} target="_blank" className={btn.ghost}>Lihat di toko</Link>
            <label className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-bold text-ink ring-1 ring-slate-200">
              <Toggle checked={data.is_active} onChange={(v) => save({ is_active: v }, v ? 'Produk ditampilkan.' : 'Produk disembunyikan.')} label="Tampil di toko" />
              {data.is_active ? 'Tampil' : 'Disembunyikan'}
            </label>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Informasi produk">
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
              e.preventDefault();
              const patch: any = { name: form.name, sku: form.sku, category_id: form.category_id, description: form.description, shopee_url: form.shopee_url, image_url: form.image_url };
              if (!hasVariations) { patch.price = form.price; patch.stock = form.stock; }
              save(patch);
            }}>
              <Field label="Nama produk" className="sm:col-span-2"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
              <Field label="SKU induk"><input className={inputCls} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></Field>
              <Field label="Kategori">
                <select className={inputCls} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              {!hasVariations && (
                <>
                  <Field label="Harga normal (Rp)" hint={data.base_final_price !== null && data.base_final_price < data.base_price ? `Harga promo berjalan: ${rp(data.base_final_price)}` : undefined}>
                    <input className={inputCls} inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </Field>
                  <Field label="Stok"><input className={inputCls} inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
                </>
              )}
              <Field label="Link Shopee" className="sm:col-span-2" hint="Dipakai tombol Beli di Shopee di halaman produk.">
                <input className={inputCls} value={form.shopee_url} onChange={(e) => setForm({ ...form, shopee_url: e.target.value })} placeholder="https://shopee.co.id/..." />
              </Field>
              <Field label="Link foto utama" className="sm:col-span-2"><input className={inputCls} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
              <Field label="Deskripsi" className="sm:col-span-2"><textarea className={inputCls} rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <div className="sm:col-span-2"><button type="submit" disabled={saving} className={btn.primary}>{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>
            </form>
          </Card>

          {hasVariations && (
            <Card title={`Varian (${data.variation_list.length})`} padded={false}>
              <p className="border-b border-slate-200 px-4 py-2.5 text-xs text-slate-500 sm:px-5">Ubah harga/stok lalu klik Simpan di baris itu. Stok induk = total stok varian.</p>
              <ul className="divide-y divide-slate-200">
                {data.variation_list.map((v: any) => <VariationRow key={v.id} v={v} onSaved={setData} />)}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Foto">
            <div className="grid grid-cols-3 gap-2">
              {[data.image_url, ...(data.images || [])].filter(Boolean).slice(0, 9).map((src: string, i: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-square w-full rounded-lg bg-white object-contain ring-1 ring-slate-200" />
              ))}
            </div>
          </Card>
          <Card title="Promo produk ini" action={<Link href="/seller/promo" className="text-xs font-bold hover:underline">Kelola promo</Link>}>
            {data.promos.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada promo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.promos.map((p: any, i: number) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <Link href={`/seller/promo/${p.id}`} className="min-w-0 hover:underline">
                      <span className="block truncate font-semibold text-ink">{p.name}</span>
                      <span className="text-xs text-slate-500">{p.variation || 'Semua varian'} · {p.promo_price ? rp(p.promo_price) : `-${p.discount_percent}%`}</span>
                    </Link>
                    <Badge tone={p.running ? 'green' : 'gray'}>{p.running ? 'Berjalan' : 'Tidak aktif'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function VariationRow({ v, onSaved }: { v: any; onSaved: (d: any) => void }) {
  const [row, setRow] = useState({ name: v.name, sku: v.sku, price: String(v.price), stock: String(v.stock) });
  const [busy, setBusy] = useState(false);
  const dirty = row.name !== v.name || row.sku !== v.sku || row.price !== String(v.price) || row.stock !== String(v.stock);

  async function save() {
    setBusy(true);
    try {
      onSaved(await sellerApi(`variations/${v.id}`, { method: 'PATCH', body: row }));
      notify(`Varian ${row.name || row.sku} disimpan.`);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="grid grid-cols-2 items-end gap-2 px-4 py-3 sm:grid-cols-[44px_1.4fr_1fr_1fr_80px_auto] sm:px-5">
      <span className="hidden sm:block"><Thumb src={v.image_url} /></span>
      <Field label="Varian" className="col-span-2 sm:col-span-1"><input className={inputCls} value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} /></Field>
      <Field label="SKU"><input className={inputCls} value={row.sku} onChange={(e) => setRow({ ...row, sku: e.target.value })} /></Field>
      <Field label="Harga normal" hint={v.final_price < v.price ? `Promo: ${rp(v.final_price)}` : undefined}>
        <input className={inputCls} inputMode="numeric" value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })} />
      </Field>
      <Field label="Stok"><input className={inputCls} inputMode="numeric" value={row.stock} onChange={(e) => setRow({ ...row, stock: e.target.value })} /></Field>
      <button type="button" disabled={!dirty || busy} onClick={save} className={`${btn.primary} sm:mb-0`}>{busy ? '…' : 'Simpan'}</button>
    </li>
  );
}
