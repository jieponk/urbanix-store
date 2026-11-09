'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, ErrorBox, Field, PageHeader, Spinner, Toggle, btn, inputCls } from '@/components/seller/ui';
import { notify, sellerApi, useSellerData } from '@/lib/seller';

export default function SettingsPage() {
  const { data, setData, error, loading, reload } = useSellerData<any>('settings');
  const cats = useSellerData<any[]>('categories');
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])));
  }, [data]);

  async function save() {
    const body: any = { ...form };
    delete body.midtrans_configured;
    delete body.deepl_configured;
    for (const k of ['shopee_rating', 'shopee_rating_count', 'shopee_store_url', 'shopee_reviews_url']) if (body[k] === '') body[k] = null;
    setBusy(true);
    try {
      setData(await sellerApi('settings', { method: 'PATCH', body }));
      notify('Pengaturan disimpan.');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: number, name: string) {
    try {
      await sellerApi(`categories/${id}`, { method: 'PATCH', body: { name } });
      notify('Kategori diganti.');
      cats.reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if ((loading && !data) || !form) return <Spinner />;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div>
      <PageHeader title="Pengaturan toko" actions={<button type="button" disabled={busy} className={btn.primary} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan pengaturan'}</button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Kontak & metode pembelian">
          <div className="space-y-4">
            <Field label="Nomor WhatsApp toko" hint="Format 628xxx. Pesanan & tombol chat diarahkan ke nomor ini.">
              <input className={inputCls} inputMode="tel" value={form.whatsapp_number} onChange={(e) => set('whatsapp_number', e.target.value)} />
            </Field>
            <div className="space-y-2.5 rounded-xl bg-mist p-3 text-sm font-semibold text-ink">
              <label className="flex items-center justify-between">Pesan via WhatsApp <Toggle checked={form.enable_whatsapp} onChange={(x) => set('enable_whatsapp', x)} /></label>
              <label className="flex items-center justify-between">Beli via Shopee <Toggle checked={form.enable_shopee} onChange={(x) => set('enable_shopee', x)} /></label>
              <label className="flex items-center justify-between">
                <span>Bayar di web (Midtrans) {!data.midtrans_configured && <Badge tone="amber">kunci belum diisi</Badge>}</span>
                <Toggle checked={form.enable_midtrans} onChange={(x) => set('enable_midtrans', x)} />
              </label>
              <label className="flex items-center justify-between">Popup voucher di beranda <Toggle checked={form.show_whatsapp_popup} onChange={(x) => set('show_whatsapp_popup', x)} /></label>
            </div>
            <Field label="Min. belanja untuk gabung 2 voucher (Rp)" hint="0 = selalu bisa digabung.">
              <input className={inputCls} inputMode="numeric" value={form.voucher_combo_min_purchase} onChange={(e) => set('voucher_combo_min_purchase', e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="Toko Shopee">
          <div className="space-y-4">
            <Field label="Link toko Shopee"><input className={inputCls} value={form.shopee_store_url} onChange={(e) => set('shopee_store_url', e.target.value)} /></Field>
            <Field label="Link halaman penilaian Shopee"><input className={inputCls} value={form.shopee_reviews_url} onChange={(e) => set('shopee_reviews_url', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rating Shopee"><input className={inputCls} inputMode="decimal" value={form.shopee_rating} onChange={(e) => set('shopee_rating', e.target.value)} /></Field>
              <Field label="Jumlah penilaian"><input className={inputCls} inputMode="numeric" value={form.shopee_rating_count} onChange={(e) => set('shopee_rating_count', e.target.value)} /></Field>
            </div>
          </div>
        </Card>
        <Card title="Kategori" padded={false}>
          <ul className="divide-y divide-slate-200">
            {(cats.data ?? []).map((c) => <CategoryRow key={c.id} c={c} onRename={rename} />)}
          </ul>
        </Card>
        <Card title="Akun & sistem">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>Terjemahan berita (DeepL): {data.deepl_configured ? <Badge tone="green">aktif</Badge> : <Badge tone="amber">belum diisi</Badge>}</li>
            <li>Tambah admin, ganti password, dan pengaturan lanjutan ada di admin Django (<code>/admin</code> di alamat backend).</li>
            <li>Akun yang bisa masuk Seller Center: user dengan centang <b>Staff status</b>.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function CategoryRow({ c, onRename }: { c: any; onRename: (id: number, name: string) => void }) {
  const [name, setName] = useState(c.name);
  return (
    <li className="flex items-center gap-2 px-4 py-2.5">
      <input className={`${inputCls} py-1.5`} value={name} onChange={(e) => setName(e.target.value)} aria-label="Nama kategori" />
      <span className="w-20 shrink-0 text-right text-xs text-slate-500">{c.products} produk</span>
      <button type="button" disabled={name === c.name || !name.trim()} className={btn.small} onClick={() => onRename(c.id, name.trim())}>Simpan</button>
    </li>
  );
}
