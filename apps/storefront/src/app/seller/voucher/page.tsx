'use client';

import { useState } from 'react';
import { Badge, Card, ConfirmButton, Drawer, Empty, ErrorBox, Field, PageHeader, STATUS_TONE, Spinner, Toggle, btn, inputCls } from '@/components/seller/ui';
import { fromLocalInput, notify, rp, sellerApi, toLocalInput, useSellerData } from '@/lib/seller';

const EMPTY = {
  code: '', title: '', terms: '', voucher_type: 'PERCENT', value: '', max_discount: '', min_purchase: '0',
  for_whatsapp: true, for_midtrans: true, exclude_promo: false, can_combine: true, usage_limit: '', per_customer_limit: '',
  starts_at: '', ends_at: '', is_active: true, is_public: true, show_in_popup: false, sort_order: '0',
};

const TYPE_LABEL: Record<string, string> = { PERCENT: 'Diskon %', FIXED: 'Potongan Rp', FREE_SHIPPING: 'Gratis ongkir' };

function headline(v: any) {
  if (v.voucher_type === 'PERCENT') return `Diskon ${Number(v.value)}%${v.max_discount ? ` s/d ${rp(v.max_discount)}` : ''}`;
  if (v.voucher_type === 'FIXED') return `Potongan ${rp(v.value)}`;
  return `Gratis ongkir s/d ${rp(v.value)}`;
}

export default function VouchersPage() {
  const { data, error, loading, reload } = useSellerData<any[]>('vouchers');
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  function open(v?: any) {
    setEditing(v ? { ...EMPTY, ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? ''])), starts_at: toLocalInput(v.starts_at), ends_at: toLocalInput(v.ends_at) } : { ...EMPTY });
  }

  async function save() {
    const body: any = { ...editing, starts_at: fromLocalInput(editing.starts_at), ends_at: fromLocalInput(editing.ends_at) };
    for (const key of ['max_discount', 'usage_limit', 'per_customer_limit']) if (body[key] === '') body[key] = null;
    delete body.status; delete body.used; delete body.id;
    setBusy(true);
    try {
      await sellerApi(editing.id ? `vouchers/${editing.id}` : 'vouchers', { method: editing.id ? 'PATCH' : 'POST', body });
      notify('Voucher disimpan.');
      setEditing(null);
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function quick(v: any, patch: any) {
    try {
      await sellerApi(`vouchers/${v.id}`, { method: 'PATCH', body: patch });
      reload();
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  const set = (k: string, val: any) => setEditing({ ...editing, [k]: val });

  return (
    <div>
      <PageHeader
        title="Voucher"
        subtitle="Voucher yang bisa diklaim pembeli di beranda & detail produk, lalu dipakai saat checkout."
        actions={<button type="button" className={btn.brand} onClick={() => open()}>+ Buat voucher</button>}
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data || data.length === 0 ? (
        <Card><Empty title="Belum ada voucher" /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((v) => (
            <div key={v.id} className="flex overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200">
              <div className={`flex w-24 shrink-0 flex-col items-center justify-center px-2 text-center text-white ${v.voucher_type === 'FREE_SHIPPING' ? 'bg-emerald-600' : 'bg-sale-600'}`}>
                <span className="text-[11px] font-bold uppercase">{TYPE_LABEL[v.voucher_type]}</span>
                <span className="mt-1 break-all font-mono text-xs font-bold">{v.code}</span>
              </div>
              <div className="min-w-0 flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{headline(v)}</span>
                    <span className="block truncate text-xs text-slate-500">{v.title}</span>
                  </span>
                  <Badge tone={STATUS_TONE[v.status]}>{v.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Min. belanja {rp(v.min_purchase)} · {[v.for_whatsapp && 'WhatsApp', v.for_midtrans && 'bayar di web'].filter(Boolean).join(' & ')}
                  {v.exclude_promo && ' · tidak untuk produk promo'}
                </p>
                <p className="mt-1 text-xs text-slate-500">Terpakai {v.used}x{v.usage_limit ? ` dari ${v.usage_limit}` : ''}{v.per_customer_limit ? ` · maks ${v.per_customer_limit}x/pembeli` : ''}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-ink">
                  <label className="flex items-center gap-1.5"><Toggle checked={v.is_active} onChange={(x) => quick(v, { is_active: x })} /> Aktif</label>
                  <label className="flex items-center gap-1.5"><Toggle checked={v.is_public} onChange={(x) => quick(v, { is_public: x })} /> Bisa diklaim</label>
                  <label className="flex items-center gap-1.5"><Toggle checked={v.show_in_popup} onChange={(x) => quick(v, { show_in_popup: x })} /> Popup</label>
                  <button type="button" className={`${btn.small} ml-auto`} onClick={() => open(v)}>Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Drawer open={editing !== null} title={editing?.id ? `Edit ${editing.code}` : 'Buat voucher'} onClose={() => setEditing(null)}
        footer={<div className="flex gap-2">
          {editing?.id && <ConfirmButton className={btn.ghost} confirmText="Ya, hapus" onConfirm={async () => { await sellerApi(`vouchers/${editing.id}`, { method: 'DELETE' }); setEditing(null); reload(); notify('Voucher dihapus.'); }}>Hapus</ConfirmButton>}
          <button type="button" disabled={busy} className={`${btn.primary} flex-1`} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan voucher'}</button>
        </div>}>
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kode" hint="Huruf besar, tanpa spasi."><input className={`${inputCls} uppercase`} value={editing.code} onChange={(e) => set('code', e.target.value)} /></Field>
              <Field label="Jenis">
                <select className={inputCls} value={editing.voucher_type} onChange={(e) => set('voucher_type', e.target.value)}>
                  <option value="PERCENT">Diskon %</option>
                  <option value="FIXED">Potongan Rp</option>
                  <option value="FREE_SHIPPING">Gratis ongkir</option>
                </select>
              </Field>
            </div>
            <Field label="Judul" hint="Contoh: Diskon 5% pesan via WhatsApp"><input className={inputCls} value={editing.title} onChange={(e) => set('title', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={editing.voucher_type === 'PERCENT' ? 'Diskon (%)' : editing.voucher_type === 'FIXED' ? 'Potongan (Rp)' : 'Maks. potongan ongkir (Rp)'}>
                <input className={inputCls} inputMode="decimal" value={editing.value} onChange={(e) => set('value', e.target.value)} />
              </Field>
              {editing.voucher_type === 'PERCENT' && (
                <Field label="Maks. potongan (Rp)" hint="Kosong = tanpa batas"><input className={inputCls} inputMode="numeric" value={editing.max_discount} onChange={(e) => set('max_discount', e.target.value)} /></Field>
              )}
              <Field label="Min. belanja (Rp)"><input className={inputCls} inputMode="numeric" value={editing.min_purchase} onChange={(e) => set('min_purchase', e.target.value)} /></Field>
              <Field label="Kuota total" hint="Kosong = tanpa batas"><input className={inputCls} inputMode="numeric" value={editing.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} /></Field>
              <Field label="Maks. per pembeli" hint="Dicek dari nomor WA"><input className={inputCls} inputMode="numeric" value={editing.per_customer_limit} onChange={(e) => set('per_customer_limit', e.target.value)} /></Field>
              <Field label="Urutan tampil"><input className={inputCls} inputMode="numeric" value={editing.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
              <Field label="Mulai"><input type="datetime-local" className={inputCls} value={editing.starts_at} onChange={(e) => set('starts_at', e.target.value)} /></Field>
              <Field label="Selesai"><input type="datetime-local" className={inputCls} value={editing.ends_at} onChange={(e) => set('ends_at', e.target.value)} /></Field>
            </div>
            <Field label="S&K tambahan (opsional)"><textarea className={inputCls} rows={3} value={editing.terms} onChange={(e) => set('terms', e.target.value)} /></Field>
            <div className="space-y-2.5 rounded-xl bg-surface p-3 text-sm font-semibold text-ink ring-1 ring-slate-200">
              {[
                ['for_whatsapp', 'Berlaku untuk pesan via WhatsApp'],
                ['for_midtrans', 'Berlaku untuk bayar di web'],
                ['exclude_promo', 'Tidak berlaku untuk produk yang sedang promo'],
                ['can_combine', 'Bisa digabung dengan voucher lain'],
                ['is_active', 'Aktif'],
                ['is_public', 'Tampil & bisa diklaim di toko'],
                ['show_in_popup', 'Tampilkan di popup beranda'],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center justify-between gap-3">{label}<Toggle checked={Boolean(editing[k])} onChange={(x) => set(k, x)} /></label>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
