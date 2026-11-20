'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Card, ConfirmButton, ErrorBox, Field, PageHeader, Spinner, btn, inputCls } from '@/components/seller/ui';
import { RETURN_TONE, fmtDateTime, notify, rp, sellerApi, useSellerData } from '@/lib/seller';

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  const { data, setData, error, loading, reload } = useSellerData<any>(`pengembalian/${params.id}`);
  const [note, setNote] = useState('');
  const [refund, setRefund] = useState({ amount: '', method: '' });
  const [replaceTracking, setReplaceTracking] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(body: Record<string, unknown>, message: string) {
    setBusy(true);
    try {
      setData(await sellerApi(`pengembalian/${params.id}`, { body }));
      notify(message);
      setNote('');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  if (!data) return null;
  const s = data.status;
  const active = ['APPROVED', 'RETURN_SHIPPED', 'RECEIVED'].includes(s);

  return (
    <div>
      <PageHeader
        back={{ href: '/seller/pengembalian', label: 'Pengembalian' }}
        title={`Retur ${data.order_number}`}
        subtitle={<>{fmtDateTime(data.created_at)} · <Badge tone={RETURN_TONE[s]}>{data.status_label}</Badge></>}
        actions={<Link href={`/seller/pesanan/${encodeURIComponent(data.order_number)}`} className={btn.ghost}>Buka pesanan</Link>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card title="Pengajuan pembeli">
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">Alasan</dt><dd className="font-bold text-ink">{data.reason_label}</dd></div>
              <div><dt className="text-xs text-slate-500">Permintaan</dt><dd className="font-bold text-ink">{data.resolution_label}</dd></div>
              <div><dt className="text-xs text-slate-500">Paket diterima</dt><dd className="text-ink">{data.received_at ? fmtDateTime(data.received_at) : '-'}</dd></div>
              <div><dt className="text-xs text-slate-500">Total dibayar</dt><dd className="text-ink">{rp(data.billed_amount)} · {data.payment_method}</dd></div>
            </dl>
            <p className="mt-4 whitespace-pre-line rounded-lg bg-mist p-3 text-sm text-ink">{data.description}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              {data.items.map((i: any) => <li key={i.id}>• {i.quantity}× {i.name}{i.variation ? ` (${i.variation})` : ''}</li>)}
            </ul>
          </Card>

          <Card title="Bukti">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Foto resi</p>
                {data.waybill_photo ? (
                  <a href={data.waybill_photo} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={data.waybill_photo} alt="Foto resi" className="max-h-72 w-full rounded-lg object-contain ring-1 ring-slate-200" />
                  </a>
                ) : '-'}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">Video unboxing</p>
                {data.unboxing_video ? (
                  <video src={data.unboxing_video} controls preload="metadata" className="max-h-72 w-full rounded-lg bg-black" />
                ) : (
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    {data.video_via_whatsapp ? 'Pembeli mengirim video lewat WhatsApp. Cek chat dari ' : 'Tidak ada video. '}
                    <b>{data.customer_phone}</b>.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {(s === 'REQUESTED' || active) && (
            <Card title="Tindakan">
              <div className="space-y-4">
                <Field label="Catatan untuk pembeli" hint="Wajib saat menolak. Ikut terkirim di email ke pembeli.">
                  <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {s === 'REQUESTED' && (
                    <button type="button" disabled={busy} className={btn.primary} onClick={() => run({ action: 'approve', admin_note: note }, 'Pengajuan disetujui.')}>
                      Setujui, minta kirim balik
                    </button>
                  )}
                  {(s === 'APPROVED' || s === 'RETURN_SHIPPED') && (
                    <button type="button" disabled={busy} className={btn.primary} onClick={() => run({ action: 'received', admin_note: note }, 'Barang retur ditandai diterima.')}>
                      Barang retur sudah diterima
                    </button>
                  )}
                  <ConfirmButton className={btn.ghost} confirmText="Tolak pengajuan ini?" onConfirm={() => run({ action: 'reject', admin_note: note }, 'Pengajuan ditolak.')}>
                    Tolak
                  </ConfirmButton>
                </div>

                {active && (
                  <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-ink">Kembalikan dana</p>
                      <input className={inputCls} inputMode="numeric" placeholder={`Jumlah (maks. ${rp(data.billed_amount)})`} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
                      <input className={inputCls} placeholder="Cara: mis. Transfer BCA a.n. pembeli / Refund Midtrans" value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value })} />
                      <ConfirmButton className={btn.primary} confirmText="Dana sudah benar-benar dikembalikan?" onConfirm={() => run({ action: 'refund', refund_amount: refund.amount, refund_method: refund.method, admin_note: note }, 'Ditandai dana dikembalikan.')}>
                        Tandai dana dikembalikan
                      </ConfirmButton>
                      {data.payment_method === 'MIDTRANS' && (
                        <p className="text-xs text-slate-500">Pembayaran via Midtrans: lakukan refund di dashboard Midtrans dulu, lalu tandai di sini.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-ink">Tukar barang</p>
                      <input className={inputCls} placeholder="No. resi barang pengganti" value={replaceTracking} onChange={(e) => setReplaceTracking(e.target.value)} />
                      <button type="button" disabled={busy} className={btn.ghost} onClick={() => run({ action: 'replace', tracking_number: replaceTracking, admin_note: note }, 'Barang pengganti ditandai dikirim.')}>
                        Barang pengganti dikirim
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Card title="Pembeli">
            <p className="text-sm font-bold text-ink">{data.customer_name}</p>
            <p className="text-sm text-slate-600">{data.customer_phone}</p>
            {data.return_tracking_number && (
              <p className="mt-3 rounded-lg bg-mist p-2.5 text-sm text-ink">Resi kirim balik: <b>{data.return_courier} {data.return_tracking_number}</b></p>
            )}
            {data.refund_amount && <p className="mt-3 text-sm text-emerald-700">Dana dikembalikan: <b>{rp(data.refund_amount)}</b> {data.refund_method}</p>}
            {data.replacement_tracking_number && <p className="mt-3 text-sm text-emerald-700">Resi pengganti: <b>{data.replacement_tracking_number}</b></p>}
          </Card>
          <Card title="Riwayat">
            <ol className="space-y-3">
              {[...data.history].reverse().map((h: any, i: number) => (
                <li key={i} className="text-sm">
                  <p className="font-semibold text-ink">{h.label}</p>
                  {h.note && <p className="text-xs text-slate-600">{h.note}</p>}
                  <p className="text-[11px] text-slate-500">{fmtDateTime(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
