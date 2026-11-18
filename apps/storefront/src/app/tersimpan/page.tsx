'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import { money } from '@/lib/money';
import { getWishlist, toggleWish, type SavedItem } from '@/lib/saved';

/** Produk yang disimpan (♡) di perangkat ini. */
export default function SavedPage() {
  const t = useT();
  const [items, setItems] = useState<SavedItem[] | null>(null);

  useEffect(() => {
    const sync = () => setItems(getWishlist());
    sync();
    window.addEventListener('saved-updated', sync);
    return () => window.removeEventListener('saved-updated', sync);
  }, []);

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Produk tersimpan')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('Disimpan di perangkat ini. Bandingkan, bagikan, atau beli kapan saja.')}</p>

        {items === null ? null : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold text-ink">{t('Belum ada produk tersimpan')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('Tekan ♡ Simpan di halaman produk untuk menyimpannya di sini.')}</p>
            <Link href="/produk" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-surface">
              {t('Lihat produk')}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-surface">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <Link href={`/produk/${it.id}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                    {it.image ? (
                      <img src={it.image} alt="" width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-xl bg-white object-contain ring-1 ring-slate-200" />
                    ) : (
                      <span className="h-[72px] w-[72px] shrink-0 rounded-xl bg-mist" />
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-bold text-ink">{it.name}</span>
                      <span className="mt-1 block text-sm font-extrabold text-ink">{money(it.price)}</span>
                      <span className="block text-[11px] text-slate-500">{t('Harga saat disimpan; cek harga terbaru di halaman produk.')}</span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleWish(it)}
                    aria-label={t('Hapus {name} dari tersimpan', { name: it.name })}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-mist hover:text-ink"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            {items.length >= 2 && (
              <Link
                href={`/bandingkan?ids=${items.slice(0, 3).map((i) => i.id).join(',')}`}
                className="mt-5 inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-surface"
              >
                {t('Bandingkan {n} teratas', { n: Math.min(3, items.length) })}
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
