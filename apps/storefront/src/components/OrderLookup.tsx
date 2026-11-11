'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { forgetOrder, getRecentOrders, normalizeOrderNumber, type RecentOrder } from '@/lib/recentOrders';

/** Form cek pesanan + daftar pesanan terakhir di perangkat ini. */
export default function OrderLookup() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentOrder[]>([]);

  useEffect(() => setRecent(getRecentOrders()), []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const no = normalizeOrderNumber(value);
    if (no.length < 6) {
      setError('Masukkan nomor pesanan, contoh: URX-20261111-K3F9QZ7M');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/order-exists?no=${encodeURIComponent(no)}`);
      if (res.ok) {
        router.push(`/pesanan/${encodeURIComponent(no)}`);
        return;
      }
      setError(res.status === 404 ? 'Nomor pesanan tidak ditemukan. Periksa lagi huruf dan angkanya.' : 'Server sedang sibuk. Coba lagi sebentar.');
    } catch {
      setError('Koneksi terputus. Periksa internet lalu coba lagi.');
    }
    setBusy(false);
  }

  return (
    <div>
      <form onSubmit={submit} className="rounded-2xl bg-surface p-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 sm:p-7">
        <label htmlFor="order-no" className="text-sm font-bold text-ink">
          Nomor pesanan
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="order-no"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            placeholder="URX-20261111-K3F9QZ7M"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'order-no-error' : undefined}
            className={`min-w-0 flex-1 rounded-xl border bg-mist px-4 py-3.5 font-mono text-base uppercase tracking-wide text-ink outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:bg-surface ${
              error ? 'border-red-400' : 'border-slate-200 focus:border-ink'
            }`}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand-600 px-6 py-3.5 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Mencari…' : 'Cek pesanan'}
          </button>
        </div>
        {error && (
          <p id="order-no-error" role="alert" className="mt-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Boleh juga tempel link halaman pesanan. Nomor pesanan ada di chat WhatsApp pesananmu (diawali &quot;No. pesanan&quot;)
          dan di email konfirmasi bila kamu mengisi email saat checkout.
        </p>
      </form>

      {recent.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-bold text-ink">Pesanan terakhir di perangkat ini</p>
          <ul className="mt-3 space-y-2">
            {recent.map((o) => (
              <li key={o.no} className="flex items-center gap-2 rounded-xl bg-surface p-3 ring-1 ring-slate-200">
                <Link href={`/pesanan/${encodeURIComponent(o.no)}`} className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-sm font-bold text-ink">{o.no}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(o.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </Link>
                <Link
                  href={`/pesanan/${encodeURIComponent(o.no)}/invoice`}
                  className="rounded-lg px-3 py-2 text-xs font-bold text-ink ring-1 ring-slate-200 hover:ring-ink"
                >
                  Invoice
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    forgetOrder(o.no);
                    setRecent(getRecentOrders());
                  }}
                  aria-label={`Hapus ${o.no} dari daftar`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-mist hover:text-ink"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
