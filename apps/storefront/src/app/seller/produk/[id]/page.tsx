'use client';

import { sellerHref, shopHref } from '@/lib/sellerUrl';
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
        back={{ href: sellerHref('/seller/produk'), label: 'Produk & SKU' }}
        title={data.name}
        subtitle={<>SKU {data.sku} · {data.category} {data.promo_name && <Badge tone="red">Promo: {data.promo_name}</Badge>}</>}
        actions={
          <>
            <Link href={shopHref(`/produk/${data.id}`)} target="_blank" className={btn.ghost}>Lihat di toko</Link>
            <label className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-bold text-ink ring-1 ring-slate-200">
              <Toggle checked={data.is_active} onChange={(v) => save({ is_active: v }, v ? 'Produk ditampilkan.' : 'Produk disembunyikan.')} label="Tampil di toko" />
              {data.is_active ? 'Tampil' : 'Disembunyikan'}
            </label>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Informasi produk">
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={(e) => {
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
              <Field label="Link Shopee" className="sm:col-span-2" hint="Format: https://shopee.co.id/product/<ID toko>/<kode produk>/ — kode produk = ID produk ini.">
                <div className="flex gap-2">
                  <input className={inputCls} value={form.shopee_url} onChange={(e) => setForm({ ...form, shopee_url: e.target.value })} placeholder="https://shopee.co.id/product/..." />
                  <button type="button" className={btn.ghost} onClick={async () => {
                    const s = await sellerApi('settings').catch(() => null);
                    if (s?.shopee_shop_id) setForm({ ...form, shopee_url: `https://shopee.co.id/product/${s.shopee_shop_id}/${data.id}/` });
                    else notify('Isi ID toko Shopee di Pengaturan dulu.', 'error');
                  }}>Isi otomatis</button>
                  {form.shopee_url && <a href={form.shopee_url} target="_blank" rel="noopener noreferrer" className={btn.ghost}>Cek</a>}
                </div>
              </Field>
              <Field label="Link foto utama" className="sm:col-span-2"><input className={inputCls} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
              <Field label="Deskripsi" className="sm:col-span-2"><textarea className={inputCls} rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <div className="sm:col-span-2"><button type="submit" disabled={saving} className={btn.primary}>{saving ? 'Menyimpan…' : 'Simpan perubahan'}</button></div>
            </form>
          </Card>

          <Card title="Berat & ukuran paket">
            <PackageForm
              key={`p-${data.id}-${data.weight_grams}-${data.length_cm}-${data.width_cm}-${data.height_cm}`}
              initial={data}
              info={data.package}
              busy={saving}
              onSave={(pkg) => save(pkg, 'Berat & ukuran disimpan.')}
              hint="Ukuran paket setelah dikemas. Ekspedisi memakai yang lebih besar: berat asli atau berat volume (P×L×T/6000)."
            />
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
          <Card title="Promo produk ini" action={<Link href={sellerHref('/seller/promo')} className="text-xs font-bold hover:underline">Kelola promo</Link>}>
            {data.promos.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada promo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.promos.map((p: any, i: number) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <Link href={sellerHref(`/seller/promo/${p.id}`)} className="min-w-0 hover:underline">
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
      <details className="col-span-2 sm:col-span-6">
        <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-ink">
          Berat & ukuran khusus varian {v.weight_grams || v.length_cm ? '(diisi)' : '(ikut produk)'}
        </summary>
        <div className="mt-2">
          <PackageForm
            key={`v-${v.id}-${v.weight_grams}-${v.length_cm}-${v.width_cm}-${v.height_cm}`}
            initial={v}
            info={v.package}
            busy={busy}
            compact
            hint="Kosongkan = ikut berat & ukuran produk."
            onSave={async (pkg) => {
              setBusy(true);
              try {
                onSaved(await sellerApi(`variations/${v.id}`, { method: 'PATCH', body: pkg }));
                notify('Berat & ukuran varian disimpan.');
              } catch (err) {
                notify((err as Error).message, 'error');
              } finally {
                setBusy(false);
              }
            }}
          />
        </div>
      </details>
    </li>
  );
}

const PKG_FIELDS = [
  { key: 'weight_grams', label: 'Berat', unit: 'gram' },
  { key: 'length_cm', label: 'Panjang', unit: 'cm' },
  { key: 'width_cm', label: 'Lebar', unit: 'cm' },
  { key: 'height_cm', label: 'Tinggi', unit: 'cm' },
] as const;

function kg(grams: number | null | undefined) {
  if (!grams) return '-';
  return grams < 1000 ? `${grams} g` : `${(grams / 1000).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')} kg`;
}

/** Isian berat (gram) & P×L×T (cm) + hitungan berat volume langsung saat diketik. */
function PackageForm({ initial, info, onSave, busy, hint, compact = false }: {
  initial: any; info: any; onSave: (pkg: Record<string, string>) => void; busy: boolean; hint: string; compact?: boolean;
}) {
  const [f, setF] = useState<Record<string, string>>(() =>
    Object.fromEntries(PKG_FIELDS.map(({ key }) => [key, initial[key] ? String(initial[key]) : '']))
  );
  const num = (k: string) => Number(f[k]) || 0;
  const volume = num('length_cm') && num('width_cm') && num('height_cm')
    ? Math.round((num('length_cm') * num('width_cm') * num('height_cm')) / 6000 * 1000)
    : 0;
  const actual = num('weight_grams');
  const charge = Math.max(actual, volume);
  const dirty = PKG_FIELDS.some(({ key }) => f[key] !== (initial[key] ? String(initial[key]) : ''));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <div className={`grid grid-cols-2 gap-3 ${compact ? 'sm:grid-cols-4' : 'sm:grid-cols-4'}`}>
        {PKG_FIELDS.map(({ key, label, unit }) => (
          <Field key={key} label={`${label} (${unit})`}>
            <input
              className={inputCls}
              inputMode="numeric"
              value={f[key]}
              placeholder={!compact ? undefined : info?.[key] ? String(info[key]) : ''}
              onChange={(e) => setF({ ...f, [key]: e.target.value.replace(/[^0-9]/g, '') })}
            />
          </Field>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-mist px-3 py-2.5 text-xs text-slate-600">
        <span>Berat asli: <b className="text-ink">{kg(actual)}</b></span>
        <span>Berat volume: <b className="text-ink">{kg(volume)}</b></span>
        <span>Dipakai ekspedisi: <b className="text-sale-600">{kg(charge)}</b>{volume > actual && actual > 0 ? ' (volume)' : ''}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
      <button type="submit" disabled={!dirty || busy} className={`${btn.primary} mt-3`}>{busy ? 'Menyimpan…' : 'Simpan berat & ukuran'}</button>
    </form>
  );
}
