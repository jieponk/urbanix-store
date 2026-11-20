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
    delete body.rajaongkir_key_configured;
    delete body.ongkir_auto;
    delete body.courier_choices;
    for (const k of ['rajaongkir_origin_id', 'shopee_rating', 'shopee_rating_count', 'shopee_store_url', 'shopee_reviews_url']) if (body[k] === '') body[k] = null;
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        <Card title="Ongkir otomatis (RajaOngkir)" action={data.ongkir_auto ? <Badge tone="green">aktif</Badge> : <Badge tone="amber">belum aktif</Badge>}>
          <div className="space-y-4">
            {!data.rajaongkir_key_configured && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Kunci API RajaOngkir belum dipasang di server. Jalankan <code>./deploy/set-rajaongkir.sh</code> dari laptop.
              </p>
            )}
            <Field label="Asal pengiriman (gudang)" hint="Ketik kelurahan, kecamatan, atau kode pos gudang lalu pilih.">
              <OriginPicker
                label={form.rajaongkir_origin_label}
                onPick={(o) => setForm({ ...form, rajaongkir_origin_id: o.id, rajaongkir_origin_label: o.label })}
              />
            </Field>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Kurir yang ditampilkan</p>
              <div className="flex flex-wrap gap-2">
                {(data.courier_choices ?? []).map((c: { code: string; name: string }) => {
                  const list = String(form.rajaongkir_couriers || '').split(':').filter(Boolean);
                  const on = list.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set('rajaongkir_couriers', (on ? list.filter((x) => x !== c.code) : [...list, c.code]).join(':'))}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${on ? 'bg-ink text-surface ring-ink' : 'bg-surface text-slate-600 ring-slate-300 hover:ring-slate-500'}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Bila aktif, pembeli melihat ongkir langsung saat checkout dan bisa bayar di web (Midtrans). Kurir instan (GoSend/Grab) tetap dikonfirmasi admin lewat WhatsApp.
            </p>
          </div>
        </Card>
        <Card title="Toko Shopee">
          <div className="space-y-4">
            <Field label="ID toko Shopee" hint="Dipakai untuk link produk otomatis: shopee.co.id/product/<ID toko>/<kode produk>/">
              <input className={inputCls} inputMode="numeric" value={form.shopee_shop_id} onChange={(e) => set('shopee_shop_id', e.target.value)} />
            </Field>
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

function OriginPicker({ label, onPick }: { label: string; onPick: (o: { id: number; label: string }) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: number; label: string }[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (q.trim().length < 3) {
      setResults([]);
      setMsg('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/ongkir/tujuan?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (cancelled) return;
        setResults(data.results ?? []);
        setMsg(!res.ok ? data.error || 'Gagal mencari.' : (data.results ?? []).length ? '' : 'Tidak ditemukan.');
      } catch {
        if (!cancelled) setMsg('Gagal mencari.');
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div>
      {label && <p className="mb-2 rounded-lg bg-mist px-3 py-2 text-sm font-semibold text-ink">{label}</p>}
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={label ? 'Ganti asal pengiriman…' : 'mis. Pasar Baru atau 10710'} />
      {msg && <p className="mt-1 text-xs text-slate-500">{msg}</p>}
      {results.length > 0 && (
        <ul className="mt-2 max-h-56 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-mist"
                onClick={() => {
                  onPick(r);
                  setQ('');
                  setResults([]);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
