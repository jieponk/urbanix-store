'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Tampil kalau terjadi error tak terduga di halaman toko (bukan 404). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-5xl font-extrabold text-cobalt-800 dark:text-sky-300">Oops</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink">Halaman sedang bermasalah</h1>
        <p className="mt-3 text-slate-600">
          Coba muat ulang sebentar lagi. Kalau masih terjadi, hubungi kami lewat WhatsApp.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-bold">
          <button type="button" onClick={reset} className="rounded-xl bg-ink px-5 py-3 text-surface hover:bg-slate-800">
            Coba lagi
          </button>
          <Link href="/" className="rounded-xl bg-surface px-5 py-3 text-ink ring-1 ring-slate-200 hover:bg-mist">
            Ke beranda
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-slate-400">Kode: {error.digest}</p>}
      </div>
    </div>
  );
}
