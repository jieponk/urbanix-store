'use client';

import MapPicker from '@/components/MapPicker';
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
    delete body.ongkir_key_configured;
    delete body.ongkir_auto;
    delete body.courier_choices;
    for (const k of ['shopee_rating', 'shopee_rating_count', 'shopee_store_url', 'shopee_reviews_url']) if (body[k] === '') body[k] = null;
    // Kolom yang aslinya kosong (null) — mis. tanggal tema Dekor toko — dikirim balik sebagai null, bukan teks kosong.
    for (const k of Object.keys(body)) if (body[k] === '' && data[k] === null) body[k] = null;
    // Pengaturan Dekor toko diatur di halamannya sendiri; jangan ikut dikirim dari sini.
    for (const k of ['event_mode', 'event_theme', 'event_until', 'event_teaser_days', 'home_layout', 'event_title', 'event_subtitle', 'event_cta']) delete body[k];
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
        <Card title="Ongkir otomatis (Biteship)" action={data.ongkir_auto ? <Badge tone="green">aktif</Badge> : <Badge tone="amber">belum aktif</Badge>}>
          <div className="space-y-4">
            {!data.ongkir_key_configured && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Kunci API Biteship belum dipasang di server. Jalankan <code>./deploy/set-biteship.sh</code> dari laptop.
              </p>
            )}
            <Field label="Asal pengiriman (gudang)" hint="Ketik kecamatan atau kode pos gudang lalu pilih.">
              <OriginPicker
                label={form.ongkir_origin_label}
                onPick={(o) => setForm({ ...form, ongkir_origin_id: o.id, ongkir_origin_label: o.label })}
              />
            </Field>
            {/* Bukan <Field>/<label>: klik di peta jangan ikut menekan tombol "Pakai lokasi saya" */}
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Titik lokasi gudang (untuk GoSend/Grab)</p>
              <p className="mb-2 text-xs text-slate-500">Wajib bila kurir instan diaktifkan. Geser pin tepat di pintu gudang.</p>
              <MapPicker
                value={form.ongkir_origin_lat != null && form.ongkir_origin_lat !== '' ? { lat: Number(form.ongkir_origin_lat), lng: Number(form.ongkir_origin_lng) } : null}
                onChange={(p) => setForm({ ...form, ongkir_origin_lat: p.lat, ongkir_origin_lng: p.lng })}
                height={260}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Kurir yang ditampilkan</p>
              <div className="flex flex-wrap gap-2">
                {(data.courier_choices ?? []).map((c: { code: string; name: string }) => {
                  const list = String(form.ongkir_couriers || '').split(':').filter(Boolean);
                  const on = list.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set('ongkir_couriers', (on ? list.filter((x) => x !== c.code) : [...list, c.code]).join(':'))}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition ${on ? 'bg-ink text-surface ring-ink' : 'bg-surface text-slate-600 ring-slate-300 hover:ring-slate-500'}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Bila aktif, pembeli melihat ongkir langsung saat checkout dan bisa bayar di web (Midtrans). GoSend/Grab (instan) muncul setelah titik gudang diisi dan pembeli menandai lokasinya di peta.
            </p>
          </div>
        </Card>
        <Card title="Pesanan, notifikasi & retur">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email admin untuk notifikasi" hint="Pesanan baru, pembayaran lunas, dan pengajuan retur dikirim ke sini." className="sm:col-span-2">
              <input className={inputCls} type="email" value={form.notify_email} onChange={(e) => set('notify_email', e.target.value)} placeholder="mis. admin@urbanix.id" />
            </Field>
            <Field label="Batal otomatis pesanan WA belum lunas (jam)" hint="Samakan dengan batas bayar di S&K (sekarang 1×24 jam). 0 = tidak dibatalkan.">
              <input className={inputCls} inputMode="numeric" value={form.wa_unpaid_cancel_hours} onChange={(e) => set('wa_unpaid_cancel_hours', e.target.value)} />
            </Field>
            <Field label="Batas ajukan retur setelah paket diterima (jam)" hint="Samakan dengan S&K (sekarang 2×24 jam).">
              <input className={inputCls} inputMode="numeric" value={form.return_window_hours} onChange={(e) => set('return_window_hours', e.target.value)} />
            </Field>
            <Field label="Batas ukuran video unboxing (MB)" hint="Video lebih besar diminta dikirim lewat WhatsApp supaya server tidak penuh.">
              <input className={inputCls} inputMode="numeric" value={form.return_video_max_mb} onChange={(e) => set('return_video_max_mb', e.target.value)} />
            </Field>
          </div>
        </Card>
        <Card title="Pengirim di resi & label">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nama pengirim"><input className={inputCls} value={form.ship_sender_name} onChange={(e) => set('ship_sender_name', e.target.value)} /></Field>
              <Field label="No. HP pengirim" hint="Kosong = nomor WhatsApp toko."><input className={inputCls} inputMode="tel" value={form.ship_sender_phone} onChange={(e) => set('ship_sender_phone', e.target.value)} /></Field>
            </div>
            <Field label="Alamat gudang (untuk pickup & label)">
              <textarea className={inputCls} rows={2} value={form.ship_sender_address} onChange={(e) => set('ship_sender_address', e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Kode pos gudang"><input className={inputCls} inputMode="numeric" maxLength={5} value={form.ship_sender_postal_code} onChange={(e) => set('ship_sender_postal_code', e.target.value)} /></Field>
              <Field label="Cara serah paket (bawaan)">
                <select className={inputCls} value={form.ship_collection_method} onChange={(e) => set('ship_collection_method', e.target.value)}>
                  <option value="drop_off">Antar ke agen (drop off)</option>
                  <option value="pickup">Dijemput kurir (pickup)</option>
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Dipakai saat klik <b>Buat resi</b> di halaman pesanan. Ongkir resi dipotong dari saldo Biteship. Status paket dicek otomatis
              tiap jam (atau klik <b>Cek status</b> di pesanan). Webhook Biteship tidak dipakai karena sudah dipakai sistem Aneka Foto.
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

function OriginPicker({ label, onPick }: { label: string; onPick: (o: { id: string; label: string }) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ id: string; label: string }[]>([]);
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
      <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder={label ? 'Ganti asal pengiriman…' : 'mis. Sawah Besar atau 10710'} />
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
