'use client';

import { useState } from 'react';
import { Badge, Card, ConfirmButton, Drawer, Empty, ErrorBox, Field, PageHeader, STATUS_TONE, Spinner, Toggle, btn, inputCls } from '@/components/seller/ui';
import { fmtDateTime, fromLocalInput, notify, sellerApi, toLocalInput, useSellerData } from '@/lib/seller';

const LINKS = [
  { label: 'Semua produk', value: '/produk' },
  { label: 'Produk promo', value: '/produk?promo=1' },
  { label: 'Berita', value: '/berita' },
];

export default function BannersPage() {
  const { data, error, loading, reload } = useSellerData<any[]>('banners');
  const [editing, setEditing] = useState<any | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [mobile, setMobile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function open(b?: any) {
    setImage(null);
    setMobile(null);
    setEditing(b ? { ...b, starts_at: toLocalInput(b.starts_at), ends_at: toLocalInput(b.ends_at) }
      : { title: '', link_url: '/produk?promo=1', sort_order: String((data?.length ?? 0) + 1), starts_at: '', ends_at: '', is_active: true });
  }

  async function save() {
    const form = new FormData();
    form.append('title', editing.title);
    form.append('link_url', editing.link_url || '');
    form.append('sort_order', String(editing.sort_order || 0));
    form.append('is_active', editing.is_active ? 'true' : 'false');
    form.append('starts_at', fromLocalInput(editing.starts_at) || '');
    form.append('ends_at', fromLocalInput(editing.ends_at) || '');
    if (image) form.append('image', image);
    if (mobile) form.append('mobile_image', mobile);
    if (editing.removeMobile) form.append('mobile_image', '');
    setBusy(true);
    try {
      await sellerApi(editing.id ? `banners/${editing.id}` : 'banners', { method: editing.id ? 'PATCH' : 'POST', body: form });
      notify('Banner disimpan. Beranda diperbarui dalam ±1 menit.');
      setEditing(null);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(b: any, active: boolean) {
    const form = new FormData();
    form.append('is_active', active ? 'true' : 'false');
    await sellerApi(`banners/${b.id}`, { method: 'PATCH', body: form }).catch((e) => notify(e.message, 'error'));
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Banner & link promo"
        subtitle="Banner geser di beranda. Atur gambar, link tujuan, urutan, dan jadwal tayang."
        actions={<button type="button" className={btn.brand} onClick={() => open()}>+ Tambah banner</button>}
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data || data.length === 0 ? (
        <Card><Empty title="Belum ada banner dari Seller Center">Selama kosong, beranda memakai banner bawaan (folder public/banners).</Empty></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.title} className="aspect-[21/9] w-full bg-mist object-cover" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{b.title}</span>
                    <span className="block truncate text-xs text-slate-500">→ {b.link_url || 'tanpa link'}</span>
                  </span>
                  <Badge tone={STATUS_TONE[b.status]}>{b.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Urutan {b.sort_order} · {b.starts_at ? fmtDateTime(b.starts_at) : 'langsung'} – {b.ends_at ? fmtDateTime(b.ends_at) : 'tanpa batas'}
                  {b.mobile_image && ' · ada versi HP'}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-ink"><Toggle checked={b.is_active} onChange={(x) => toggle(b, x)} /> Aktif</label>
                  <button type="button" className={`${btn.small} ml-auto`} onClick={() => open(b)}>Edit</button>
                  <ConfirmButton confirmText="Ya, hapus" onConfirm={async () => { await sellerApi(`banners/${b.id}`, { method: 'DELETE' }); reload(); notify('Banner dihapus.'); }}>Hapus</ConfirmButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={editing !== null} title={editing?.id ? 'Edit banner' : 'Tambah banner'} onClose={() => setEditing(null)}
        footer={<button type="button" disabled={busy || !editing?.title || (!editing?.id && !image)} className={`${btn.primary} w-full`} onClick={save}>{busy ? 'Mengupload…' : 'Simpan banner'}</button>}>
        {editing && (
          <div className="space-y-4">
            <Field label="Judul" hint="Untuk admin & teks alternatif gambar."><input className={inputCls} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Gambar desktop" hint="Disarankan 2100×900 px (rasio 21:9), JPG/WebP maks. 5 MB.">
              <input type="file" accept="image/*" className={inputCls} onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </Field>
            {(image || editing.image) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image ? URL.createObjectURL(image) : editing.image} alt="" className="aspect-[21/9] w-full rounded-xl object-cover ring-1 ring-slate-200" />
            )}
            <Field label="Gambar HP (opsional)" hint="Disarankan 1600×900 px (16:9). Kosong = pakai gambar desktop.">
              <input type="file" accept="image/*" className={inputCls} onChange={(e) => setMobile(e.target.files?.[0] ?? null)} />
            </Field>
            {editing.mobile_image && !mobile && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input type="checkbox" checked={Boolean(editing.removeMobile)} onChange={(e) => setEditing({ ...editing, removeMobile: e.target.checked })} /> Hapus gambar HP
              </label>
            )}
            <Field label="Link tujuan saat diklik" hint="Halaman toko (/produk/12), promo, atau link luar (https://shopee.co.id/...).">
              <input className={inputCls} value={editing.link_url} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {LINKS.map((l) => <button key={l.value} type="button" className={btn.small} onClick={() => setEditing({ ...editing, link_url: l.value })}>{l.label}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mulai tayang"><input type="datetime-local" className={inputCls} value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} /></Field>
              <Field label="Selesai tayang"><input type="datetime-local" className={inputCls} value={editing.ends_at} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} /></Field>
              <Field label="Urutan"><input className={inputCls} inputMode="numeric" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })} /></Field>
              <label className="flex items-center gap-2 pt-6 text-sm font-bold text-ink"><Toggle checked={editing.is_active} onChange={(x) => setEditing({ ...editing, is_active: x })} /> Aktif</label>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
