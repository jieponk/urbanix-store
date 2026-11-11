'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, Drawer, Empty, ErrorBox, Field, PageHeader, STATUS_TONE, Spinner, Toggle, btn, inputCls } from '@/components/seller/ui';
import { fmtDateTime, fromLocalInput, notify, sellerApi, useSellerData } from '@/lib/seller';

export default function PromosPage() {
  const { data, error, loading, reload } = useSellerData<any[]>('promos');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', starts_at: '', ends_at: '', is_active: true });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const p = await sellerApi('promos', { body: { ...form, starts_at: fromLocalInput(form.starts_at), ends_at: fromLocalInput(form.ends_at) } });
      notify('Promo dibuat. Sekarang tambahkan produknya.');
      window.location.href = `/seller/promo/${p.id}`;
    } catch (err) {
      notify((err as Error).message, 'error');
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Promo harga"
        subtitle="Potong harga per SKU dengan jadwal. Harga kembali normal otomatis saat promo selesai."
        actions={<button type="button" className={btn.brand} onClick={() => setOpen(true)}>+ Buat promo</button>}
      />
      <Card padded={false}>
        {error ? <div className="p-4"><ErrorBox message={error} onRetry={reload} /></div>
          : loading && !data ? <Spinner />
          : !data || data.length === 0 ? <Empty title="Belum ada promo">Buat promo pertama, misalnya “Promo 12.12”.</Empty>
          : (
            <ul className="divide-y divide-slate-200">
              {data.map((p) => (
                <li key={p.id}>
                  <Link href={`/seller/promo/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-mist sm:px-5">
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">{p.name}</span>
                      <span className="text-xs text-slate-500">
                        {p.starts_at ? fmtDateTime(p.starts_at) : 'Langsung'} – {p.ends_at ? fmtDateTime(p.ends_at) : 'tanpa batas'} · {p.items_count} SKU
                      </span>
                    </span>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <Drawer open={open} title="Buat promo" onClose={() => setOpen(false)}
        footer={<button type="button" disabled={busy || !form.name} className={`${btn.primary} w-full`} onClick={create}>{busy ? 'Menyimpan…' : 'Buat & pilih produk'}</button>}>
        <div className="space-y-4">
          <Field label="Nama promo" hint="Tampil di label produk, mis. “Promo 12.12”."><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mulai" hint="Kosongkan = langsung berlaku."><input type="datetime-local" className={inputCls} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
          <Field label="Selesai" hint="Kosongkan = berlaku sampai dimatikan."><input type="datetime-local" className={inputCls} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
          <label className="flex items-center gap-3 text-sm font-bold text-ink"><Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} /> Aktif</label>
        </div>
      </Drawer>
    </div>
  );
}
