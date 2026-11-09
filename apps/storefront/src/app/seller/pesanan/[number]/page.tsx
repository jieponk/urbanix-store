'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, ConfirmButton, ErrorBox, Field, ORDER_TONE, PageHeader, Spinner, Thumb, btn, inputCls } from '@/components/seller/ui';
import { icons } from '@/components/seller/SellerIcons';
import { fmtDateTime, notify, rp, sellerApi, useSellerData } from '@/lib/seller';

const NEXT_STEP: Record<string, { to: string; label: string }> = {
  PENDING: { to: 'PROCESSING', label: 'Konfirmasi & proses' },
  PROCESSING: { to: 'SHIPPED', label: 'Tandai dikirim' },
  SHIPPED: { to: 'COMPLETED', label: 'Tandai selesai' },
};

export default function OrderDetailPage({ params }: { params: { number: string } }) {
  const number = decodeURIComponent(params.number);
  const { data, setData, error, loading, reload } = useSellerData<any>(`orders/${encodeURIComponent(number)}`);
  const [form, setForm] = useState({ shipping_courier: '', tracking_number: '', shipping_cost: '', admin_note: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      shipping_courier: data.shipping_courier || '',
      tracking_number: data.tracking_number || '',
      shipping_cost: data.shipping_cost !== null && data.shipping_cost !== undefined ? String(data.shipping_cost) : '',
      admin_note: data.admin_note || '',
    });
  }, [data]);

  async function save(patch: Record<string, unknown>, message = 'Pesanan disimpan.') {
    setSaving(true);
    try {
      setData(await sellerApi(`orders/${encodeURIComponent(number)}`, { method: 'PATCH', body: patch }));
      notify(message);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function stock(action: 'deduct' | 'restore') {
    try {
      setData(await sellerApi(`orders/${encodeURIComponent(number)}/stock`, { body: { action } }));
      notify(action === 'deduct' ? 'Stok dikurangi sesuai pesanan.' : 'Stok dikembalikan.');
    } catch (err) {
      notify((err as Error).message, 'error');
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  if (!data) return null;

  const next = NEXT_STEP[data.status];
  const address = [data.customer_name, data.customer_phone, data.shipping_address, data.city, data.province, data.postal_code]
    .filter(Boolean).join('\n');

  return (
    <div>
      <PageHeader
        back={{ href: '/seller/pesanan', label: 'Pesanan' }}
        title={data.order_number}
        subtitle={<>{fmtDateTime(data.created_at)} · {data.method_label} · <Badge tone={ORDER_TONE[data.status]}>{data.status_label}</Badge> <Badge tone={data.payment_status === 'PAID' ? 'green' : 'gray'}>{data.payment_label}</Badge></>}
        actions={
          <>
            {data.whatsapp_customer && (
              <a href={data.whatsapp_customer} target="_blank" rel="noopener noreferrer" className={btn.ghost}>
                {icons.chat({ size: 16 })} Chat pembeli
              </a>
            )}
            {next && (
              <button type="button" disabled={saving} className={btn.primary} onClick={() => save({ status: next.to }, `Status: ${next.label.toLowerCase()}.`)}>
                {next.label}
              </button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Barang" padded={false}>
            <ul className="divide-y divide-slate-200">
              {data.items.map((item: any, i: number) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <Thumb src={item.image_url} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{item.name}</span>
                    <span className="text-xs text-slate-500">{[item.variation, `SKU ${item.sku}`].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="block text-slate-500">{item.quantity} × {rp(item.price)}</span>
                    <b className="text-ink">{rp(item.subtotal)}</b>
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-slate-200 px-4 py-3 text-sm sm:px-5">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{rp(data.subtotal)}</dd></div>
              {data.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700"><dt>{data.discount_note || 'Potongan'}</dt><dd>-{rp(data.discount_amount)}</dd></div>
              )}
              {data.shipping_discount_max > 0 && (
                <div className="flex justify-between text-emerald-700"><dt>Potongan ongkir (voucher)</dt><dd>s/d {rp(data.shipping_discount_max)}</dd></div>
              )}
              <div className="flex justify-between text-base"><dt className="font-bold">Total barang</dt><dd className="font-extrabold">{rp(data.total)}</dd></div>
              {data.shipping_cost !== null && (
                <div className="flex justify-between border-t border-slate-200 pt-1.5">
                  <dt className="text-slate-500">Ongkir {data.shipping_discount_max > 0 && `(setelah potong s/d ${rp(data.shipping_discount_max)})`}</dt>
                  <dd>{rp(Math.max(0, data.shipping_cost - data.shipping_discount_max))}</dd>
                </div>
              )}
              {data.shipping_cost !== null && (
                <div className="flex justify-between text-base"><dt className="font-bold">Total ditagih</dt><dd className="font-extrabold">{rp(data.total + Math.max(0, data.shipping_cost - data.shipping_discount_max))}</dd></div>
              )}
              {data.voucher_codes && <p className="pt-1 text-xs text-slate-500">Voucher: {data.voucher_codes}</p>}
            </dl>
          </Card>

          <Card title="Pengiriman & catatan">
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={(e) => { e.preventDefault(); save({ ...form, shipping_cost: form.shipping_cost === '' ? null : form.shipping_cost }); }}
            >
              <Field label="Kurir"><input className={inputCls} value={form.shipping_courier} onChange={(e) => setForm({ ...form, shipping_courier: e.target.value })} placeholder="JNE / J&T / SiCepat" /></Field>
              <Field label="No. resi"><input className={inputCls} value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} /></Field>
              <Field label="Ongkir (Rp)"><input className={inputCls} inputMode="numeric" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} placeholder="mis. 25000" /></Field>
              <Field label="Catatan admin (tidak terlihat pembeli)" className="sm:col-span-3">
                <textarea className={inputCls} rows={3} value={form.admin_note} onChange={(e) => setForm({ ...form, admin_note: e.target.value })} />
              </Field>
              <div className="sm:col-span-3"><button type="submit" disabled={saving} className={btn.primary}>{saving ? 'Menyimpan…' : 'Simpan'}</button></div>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Pembeli & alamat" action={<button type="button" className={btn.small} onClick={() => { navigator.clipboard?.writeText(address); notify('Alamat disalin.'); }}>Salin</button>}>
            <p className="whitespace-pre-line text-sm text-ink">{address}</p>
            {data.customer_email && <p className="mt-2 text-xs text-slate-500">{data.customer_email}</p>}
            {data.notes && <p className="mt-3 rounded-lg bg-sun-100 p-2.5 text-sm text-cobalt-900"><b>Catatan pembeli:</b> {data.notes}</p>}
          </Card>

          <Card title="Status">
            <div className="space-y-3">
              <Field label="Status pesanan">
                <select className={inputCls} value={data.status} disabled={saving} onChange={(e) => save({ status: e.target.value })}>
                  {data.status_choices.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Pembayaran" hint="Tandai Lunas setelah transfer pembeli masuk.">
                <select className={inputCls} value={data.payment_status} disabled={saving} onChange={(e) => save({ payment_status: e.target.value })}>
                  {data.payment_choices.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Stok">
            <p className="text-sm text-slate-600">
              {data.stock_reserved
                ? 'Stok untuk pesanan ini sudah dikurangi.'
                : 'Pesanan WhatsApp belum memotong stok. Kurangi setelah pembeli membayar.'}
            </p>
            <div className="mt-3">
              {data.stock_reserved ? (
                <ConfirmButton onConfirm={() => stock('restore')} confirmText="Ya, kembalikan">Kembalikan stok</ConfirmButton>
              ) : (
                <ConfirmButton onConfirm={() => stock('deduct')} confirmText="Ya, kurangi stok" className={btn.ghost}>Kurangi stok sesuai pesanan</ConfirmButton>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Membatalkan pesanan otomatis mengembalikan stok yang sudah dikurangi.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
