'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';
import { siteConfig } from '@/lib/siteConfig';

type Option = { value: string; label: string };
type ReturnData = {
  status: string;
  status_label: string;
  reason_label: string;
  resolution_label: string;
  description: string;
  admin_note: string;
  return_tracking_number: string;
  refund_amount: string | null;
  refund_method: string;
  replacement_tracking_number: string;
  video_via_whatsapp: boolean;
  history: { status: string; label: string; note: string; by: string; at: string }[];
};
type Info = {
  eligibility: { can_request: boolean; reason: string; deadline: string | null; window_hours: number; video_max_mb: number };
  reasons: Option[];
  resolutions: Option[];
  items: { id: number; name: string; variation: string; quantity: number }[];
  return: ReturnData | null;
  whatsapp_url: string;
};

const fmt = (v: string) =>
  new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
const rp = (v: string | number) => `Rp${Number(v).toLocaleString('id-ID')}`;
const field = 'w-full rounded-xl border border-slate-300 bg-surface px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none';

/** Ajukan & pantau pengembalian (retur) pesanan, ala marketplace. */
export default function ReturnForm({ orderNumber }: { orderNumber: string }) {
  const t = useT();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({ phone: '', reason: '', resolution: 'REFUND', description: '', viaWa: false });
  const [items, setItems] = useState<number[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [ship, setShip] = useState({ phone: '', courier: '', tracking: '' });
  const [sentWa, setSentWa] = useState('');
  const url = `/api/retur/${encodeURIComponent(orderNumber)}`;

  async function load() {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || t('Pesanan tidak ditemukan.'));
      setInfo(data);
      setItems(data.items.map((i: { id: number }) => i.id));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxMb = info?.eligibility.video_max_mb ?? 50;
  const videoTooBig = video ? video.size > maxMb * 1024 * 1024 : false;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.reason) return setError(t('Pilih alasan pengembalian.'));
    if (form.description.trim().length < 20) return setError(t('Jelaskan masalahnya minimal 20 karakter.'));
    if (!photo) return setError(t('Lampirkan foto resi pengiriman.'));
    if (!video && !form.viaWa) return setError(t('Lampirkan video unboxing, atau pilih kirim video lewat WhatsApp.'));
    if (videoTooBig) return setError(t('Video lebih dari {n} MB. Pilih kirim video lewat WhatsApp.', { n: maxMb }));
    if (!items.length) return setError(t('Pilih barang yang ingin dikembalikan.'));

    const body = new FormData();
    body.append('phone', form.phone);
    body.append('reason', form.reason);
    body.append('resolution', form.resolution);
    body.append('description', form.description.trim());
    items.forEach((id) => body.append('item_ids', String(id)));
    body.append('waybill_photo', photo);
    if (video && !form.viaWa) body.append('unboxing_video', video);
    body.append('video_via_whatsapp', form.viaWa ? 'true' : 'false');

    // XHR supaya ada persentase unggah (video bisa puluhan MB)
    setBusy(true);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
    xhr.onload = () => {
      setBusy(false);
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* abaikan */
      }
      if (xhr.status >= 400) return setError(data.error || t('Gagal mengajukan. Coba lagi.'));
      if (data.whatsapp_url) setSentWa(data.whatsapp_url);
      load();
    };
    xhr.onerror = () => {
      setBusy(false);
      setError(t('Koneksi terputus saat mengunggah. Coba lagi atau kirim video lewat WhatsApp.'));
    };
    xhr.send(body);
  }

  async function action(payload: Record<string, string>) {
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

  if (!info) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : <div className="h-40 animate-pulse rounded-2xl bg-mist" />}
      </div>
    );
  }

  const ret = info.return;
  const legal = siteConfig.legal;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Link href={`/pesanan/${encodeURIComponent(orderNumber)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-ink">
        <TablerIcon name="arrow-left" size={16} /> {t('Kembali ke pesanan')} {orderNumber}
      </Link>
      <h1 className="text-2xl font-black text-ink">{t('Pengembalian barang/dana')}</h1>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {ret ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-mist px-3 py-1 text-sm font-bold text-ink">{t(ret.status_label)}</span>
            <span className="text-xs text-slate-500">{t(ret.reason_label)} · {t(ret.resolution_label)}</span>
          </div>
          {sentWa && (
            <a href={sentWa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white">
              {t('Kirim video unboxing ke WhatsApp admin')}
            </a>
          )}
          {ret.admin_note && (
            <p className="rounded-xl bg-mist p-3 text-sm text-ink"><b>{t('Catatan admin:')}</b> {ret.admin_note}</p>
          )}
          {ret.status === 'REFUNDED' && ret.refund_amount && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {t('Dana dikembalikan:')} <b>{rp(ret.refund_amount)}</b>{ret.refund_method ? ` · ${ret.refund_method}` : ''}
            </p>
          )}
          {ret.status === 'REPLACED' && ret.replacement_tracking_number && (
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {t('Resi barang pengganti:')} <b className="font-mono">{ret.replacement_tracking_number}</b>
            </p>
          )}

          {ret.status === 'APPROVED' && (
            <form
              className="space-y-3 rounded-xl border border-dashed border-slate-300 p-4"
              onSubmit={(e) => { e.preventDefault(); action({ action: 'ship_back', phone: ship.phone, courier: ship.courier, tracking_number: ship.tracking }); }}
            >
              <p className="text-sm font-bold text-ink">{t('Kirim barang kembali ke toko, lalu isi resinya di sini')}</p>
              <p className="text-xs text-slate-500">{legal.address ?? ''}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input className={field} placeholder={t('No. HP saat pesan')} inputMode="tel" value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} required />
                <input className={field} placeholder={t('Kurir (mis. JNE)')} value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })} />
                <input className={field} placeholder={t('No. resi kirim balik')} value={ship.tracking} onChange={(e) => setShip({ ...ship, tracking: e.target.value })} required />
              </div>
              <button disabled={busy} className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-surface disabled:opacity-60">{t('Kirim resi')}</button>
            </form>
          )}

          <ol className="relative ml-2 space-y-3 border-l-2 border-slate-200 pl-4">
            {[...ret.history].reverse().map((h, i) => (
              <li key={i} className="relative">
                <span aria-hidden="true" className={`absolute -left-[23px] top-1 h-3 w-3 rounded-full ring-2 ring-surface ${i === 0 ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                <p className={`text-sm font-bold ${i === 0 ? 'text-ink' : 'text-slate-600'}`}>{t(h.label)}</p>
                {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                <p className="text-[11px] text-slate-400">{fmt(h.at)}{h.by ? ` · ${h.by}` : ''}</p>
              </li>
            ))}
          </ol>

          {ret.status === 'REQUESTED' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const phone = window.prompt(t('Masukkan No. HP saat pesan untuk membatalkan pengajuan'));
                if (phone) action({ action: 'cancel', phone });
              }}
              className="text-sm font-semibold text-red-700 underline"
            >
              {t('Batalkan pengajuan')}
            </button>
          )}
          <p className="text-xs text-slate-500">
            {t('Pengajuan ditinjau maksimal 1×24 jam. Dana dikembalikan maksimal 7 hari kerja setelah barang retur kami terima & diperiksa.')}
          </p>
        </section>
      ) : !info.eligibility.can_request ? (
        <p className="rounded-2xl border border-slate-200 bg-surface p-5 text-sm text-slate-600">{t(info.eligibility.reason)}</p>
      ) : (
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-surface p-5">
          <p className="rounded-xl bg-mist p-3 text-sm text-slate-600">
            {t('Pengembalian hanya untuk barang rusak, salah kirim, atau kurang.')}{' '}
            {info.eligibility.deadline && (
              <>
                {t('Batas pengajuan:')} <b className="text-ink">{fmt(info.eligibility.deadline)}</b>.
              </>
            )}
          </p>

          <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('1. Barang yang dikembalikan')}</p>
            <div className="space-y-2">
              {info.items.map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-xl p-3 ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[#191919]"
                    checked={items.includes(item.id)}
                    onChange={(e) => setItems(e.target.checked ? [...items, item.id] : items.filter((x) => x !== item.id))}
                  />
                  <span className="text-sm text-ink">
                    {item.quantity}× {item.name}
                    {item.variation && <span className="block text-xs text-slate-500">{item.variation}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('2. Alasan')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
              {info.reasons.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl p-3 text-sm ring-1 transition ${form.reason === r.value ? 'bg-mist ring-2 ring-ink' : 'ring-slate-200 hover:ring-slate-400'}`}
                >
                  <input type="radio" name="reason" className="accent-[#191919]" checked={form.reason === r.value} onChange={() => setForm({ ...form, reason: r.value })} />
                  <span className="text-ink">{t(r.label)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('3. Jelaskan masalahnya')}</p>
            <textarea
              className={field}
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('Contoh: lensa tidak bisa fokus sejak pertama dinyalakan, sudah dicoba di 2 kamera berbeda.')}
            />
            <p className="mt-1 text-right text-[11px] text-slate-500">{form.description.trim().length}/20+</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('4. Permintaan')}</p>
            <div className="flex flex-wrap gap-2">
              {info.resolutions.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setForm({ ...form, resolution: r.value })}
                  className={`rounded-full px-4 py-2 text-sm font-bold ring-1 ${form.resolution === r.value ? 'bg-ink text-surface ring-ink' : 'bg-surface text-ink ring-slate-300'}`}
                >
                  {t(r.label)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">{t('5. Bukti')}</p>
            <label className="block rounded-xl p-3 ring-1 ring-slate-200">
              <span className="block text-sm font-semibold text-ink">{t('Foto resi pengiriman')} *</span>
              <span className="block text-xs text-slate-500">{t('Foto label resi yang menempel di paket. JPG/PNG maks. 10 MB.')}</span>
              <input type="file" accept="image/*" className="mt-2 block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <label className={`block rounded-xl p-3 ring-1 ${form.viaWa ? 'opacity-60 ring-slate-200' : 'ring-slate-200'}`}>
              <span className="block text-sm font-semibold text-ink">{t('Video unboxing tanpa potong')} *</span>
              <span className="block text-xs text-slate-500">{t('Dari paket masih tersegel sampai barang terlihat. MP4/MOV maks. {n} MB.', { n: maxMb })}</span>
              <input type="file" accept="video/*" disabled={form.viaWa} className="mt-2 block w-full text-sm" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} />
              {video && (
                <span className={`mt-1 block text-xs ${videoTooBig ? 'font-bold text-red-600' : 'text-slate-500'}`}>
                  {(video.size / 1024 / 1024).toFixed(1)} MB{videoTooBig ? ` — ${t('terlalu besar, kirim lewat WhatsApp')}` : ''}
                </span>
              )}
            </label>
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#191919]" checked={form.viaWa} onChange={(e) => setForm({ ...form, viaWa: e.target.checked })} />
              <span>
                {t('Video terlalu besar / susah diunggah? Kirim videonya lewat WhatsApp admin saja.')}
                <span className="block text-xs text-slate-500">{t('Tombol WhatsApp muncul setelah pengajuan terkirim.')}</span>
              </span>
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold text-ink">{t('6. Verifikasi')}</p>
            <input className={field} inputMode="tel" placeholder={t('No. HP yang dipakai saat memesan')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>

          <button type="submit" disabled={busy} className="w-full rounded-full bg-ink px-5 py-3 text-sm font-black text-surface disabled:opacity-60">
            {busy ? (progress > 0 && progress < 100 ? t('Mengunggah… {n}%', { n: progress }) : t('Mengirim…')) : t('Ajukan pengembalian')}
          </button>
        </form>
      )}
    </div>
  );
}
