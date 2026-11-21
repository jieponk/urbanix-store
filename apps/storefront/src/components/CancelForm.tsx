'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';
import { siteConfig } from '@/lib/siteConfig';

type Option = { value: string; label: string };
type CancelData = {
  status: string;
  status_label: string;
  reason_label: string;
  note: string;
  admin_note: string;
  refund_amount: string | null;
  refund_method: string;
  history: { status: string; label: string; note: string; by: string; at: string }[];
};
type Info = { eligibility: { can_request: boolean; reason: string }; reasons: Option[]; cancel: CancelData | null };

const fmt = (v: string) =>
  new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
const rp = (v: string | number) => `Rp${Number(v).toLocaleString('id-ID')}`;
const field = 'w-full rounded-xl border border-slate-300 bg-surface px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none';

const TONE: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30',
  APPROVED: 'bg-mist text-ink ring-slate-200',
  REFUNDED: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30',
  REJECTED: 'bg-mist text-slate-600 ring-slate-200',
};

/** Ajukan & pantau pembatalan pesanan yang sudah dibayar dan belum dikirim. */
export default function CancelForm({ orderNumber }: { orderNumber: string }) {
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ phone: '', reason: '', note: '' });
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const url = `/api/batal/${encodeURIComponent(orderNumber)}`;
  const legal = siteConfig.legal;

  async function load() {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || t('Pesanan tidak ditemukan.'));
      setInfo(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post(payload: Record<string, string>) {
    setError('');
    setBusy(true);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('Gagal. Coba lagi.'));
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.reason) return setError(t('Pilih alasan pembatalan.'));
    post({ phone: form.phone, reason: form.reason, note: form.note });
  }

  if (!info) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : <div className="h-40 animate-pulse rounded-2xl bg-mist" />}
      </div>
    );
  }

  const c = info.cancel && info.cancel.status !== 'WITHDRAWN' ? info.cancel : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link href={`/pesanan/${encodeURIComponent(orderNumber)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-ink">
        <TablerIcon name="arrow-left" size={16} /> {t('Kembali ke pesanan')} {orderNumber}
      </Link>
      <h1 className="text-2xl font-black text-ink">{t('Batalkan pesanan')}</h1>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {c ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-surface p-5">
          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ring-1 ${TONE[c.status] ?? TONE.APPROVED}`}>{t(c.status_label)}</span>
          <p className="text-sm text-slate-600">
            {t('Alasan:')} <b className="text-ink">{t(c.reason_label)}</b>
            {c.note && <span className="block text-slate-500">“{c.note}”</span>}
          </p>
          {c.status === 'REQUESTED' && (
            <p className="text-sm text-slate-600">
              {t('Admin akan meninjau maksimal {t}. Selama ditinjau, pesanan belum dikirim.', { t: legal.reviewTime })}
            </p>
          )}
          {c.status === 'APPROVED' && (
            <p className="text-sm text-slate-600">{t('Pesanan dibatalkan. Dana akan dikembalikan maksimal {t}.', { t: legal.refundTime })}</p>
          )}
          {c.admin_note && (
            <p className="rounded-xl bg-mist p-3 text-sm text-ink"><b>{t('Catatan admin:')}</b> {c.admin_note}</p>
          )}
          {c.status === 'REFUNDED' && c.refund_amount && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              {t('Dana dikembalikan:')} <b>{rp(c.refund_amount)}</b>{c.refund_method ? ` · ${c.refund_method}` : ''}
            </p>
          )}
          {c.status === 'REQUESTED' && (
            <form
              className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center"
              onSubmit={(e) => { e.preventDefault(); post({ action: 'withdraw', phone: withdrawPhone }); }}
            >
              <span className="text-sm text-slate-600 sm:flex-1">{t('Tidak jadi membatalkan?')}</span>
              <input className={`${field} sm:w-48`} placeholder={t('No. HP saat pesan')} inputMode="tel" value={withdrawPhone} onChange={(e) => setWithdrawPhone(e.target.value)} required />
              <button disabled={busy} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-ink hover:border-ink disabled:opacity-60">
                {t('Tarik pengajuan')}
              </button>
            </form>
          )}
          <ol className="relative ml-2 space-y-3 border-l-2 border-slate-200 pl-4">
            {[...c.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-surface bg-ink" />
                <p className="text-sm font-bold text-ink">{t(h.label)}</p>
                <p className="text-xs text-slate-500">{fmt(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : !info.eligibility.can_request ? (
        <section className="rounded-2xl border border-slate-200 bg-surface p-5 text-sm text-slate-600">{t(info.eligibility.reason)}</section>
      ) : (
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-surface p-5">
          <p className="rounded-xl bg-mist p-3 text-sm text-slate-600">
            {t('Pembatalan bisa diajukan selama paket belum dikirim. Setelah disetujui, dana dikembalikan maksimal {t}.', { t: legal.refundTime })}
          </p>
          <fieldset>
            <legend className="text-sm font-bold text-ink">{t('Alasan pembatalan')}</legend>
            <div className="mt-2 grid gap-2">
              {info.reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 transition ${
                    form.reason === r.value ? 'bg-ink text-surface ring-ink' : 'bg-surface text-ink ring-slate-200 hover:ring-ink'
                  }`}
                >
                  <input type="radio" name="reason" value={r.value} checked={form.reason === r.value} onChange={() => setForm({ ...form, reason: r.value })} className="sr-only" />
                  <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${form.reason === r.value ? 'border-surface bg-sale-600' : 'border-slate-300'}`} />
                  {t(r.label)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-sm font-bold text-ink">
              {t('Catatan')} {form.reason !== 'OTHER' && <span className="font-normal text-slate-500">({t('opsional')})</span>}
            </span>
            <textarea className={`${field} mt-1.5`} rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">{t('No. HP saat pesan')}</span>
            <input className={`${field} mt-1.5`} inputMode="tel" placeholder="08…" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <span className="mt-1 block text-xs text-slate-500">{t('Untuk memastikan yang mengajukan adalah pemesan.')}</span>
          </label>
          <button disabled={busy} className="w-full rounded-full bg-sale-600 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-sale-700 disabled:opacity-60">
            {busy ? t('Mengirim…') : t('Ajukan pembatalan')}
          </button>
        </form>
      )}
    </div>
  );
}
