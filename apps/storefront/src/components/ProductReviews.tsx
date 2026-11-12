'use client';

import { useState } from 'react';
import type { ProductReview, ProductReviewPage } from '@/lib/api';

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" className="inline-flex gap-0.5" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z"
            fill={i <= Math.round(value) ? '#ffc93c' : 'rgb(var(--slate-200))'}
          />
        </svg>
      ))}
    </span>
  );
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });

function ReviewItem({ r, onPhoto }: { r: ProductReview; onPhoto: (url: string) => void }) {
  return (
    <li className="py-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-sun-400 text-sm font-black text-white">
          {r.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <b className="text-ink">{r.name}</b>
            {r.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                ✓ Pembeli terverifikasi
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Stars value={r.rating} size={14} />
            <time dateTime={r.created_at}>{fmt(r.created_at)}</time>
            {r.variation_name && <span>· Varian: {r.variation_name}</span>}
          </div>
          {r.body && <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-6 text-slate-700">{r.body}</p>}
          {r.photo_url && (
            <button type="button" onClick={() => onPhoto(r.photo_url)} className="mt-3 block overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={r.photo_url} alt={`Foto dari ${r.name}`} loading="lazy" className="h-28 w-28 object-cover transition hover:scale-105" />
            </button>
          )}
          {r.staff_reply && (
            <div className="mt-3 rounded-xl bg-mist px-4 py-3 text-sm">
              <p className="text-xs font-bold text-ink">Balasan Urbanix Store</p>
              <p className="mt-1 whitespace-pre-line text-slate-600">{r.staff_reply}</p>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** Ulasan pembeli terverifikasi di halaman produk (ringkasan bintang + daftar + foto). */
export default function ProductReviews({ productId, initial }: { productId: number; initial: ProductReviewPage }) {
  const [items, setItems] = useState(initial.results);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState('');
  const { average, count, distribution } = initial.summary;

  async function more() {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews?page=${page + 1}`);
      const data = (await res.json()) as ProductReviewPage;
      if (res.ok) {
        setItems((list) => [...list, ...data.results]);
        setPage(data.page);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="ulasan" aria-labelledby="judul-ulasan-produk" className="mt-10 scroll-mt-24">
      <h2 id="judul-ulasan-produk" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        Ulasan pembeli
      </h2>
      <div className="mt-5 grid gap-6 rounded-3xl bg-surface p-5 ring-1 ring-slate-200 sm:p-7 lg:grid-cols-[260px_1fr]">
        {/* Ringkasan */}
        <div className="lg:border-r lg:border-slate-200 lg:pr-6">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black leading-none text-ink">{average.toFixed(1)}</span>
            <span className="pb-1 text-sm text-slate-500">/ 5</span>
          </div>
          <div className="mt-2">
            <Stars value={average} size={20} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{count} ulasan dari pembeli di urbanix.id</p>
          <ul className="mt-4 space-y-1.5">
            {['5', '4', '3', '2', '1'].map((star) => {
              const n = distribution[star] || 0;
              return (
                <li key={star} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-3 text-right font-bold">{star}</span>
                  <span aria-hidden="true" className="text-[#ffc93c]">★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                    <span className="block h-full rounded-full bg-[#ffc93c]" style={{ width: `${count ? (n / count) * 100 : 0}%` }} />
                  </span>
                  <span className="w-6 text-right">{n}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Daftar */}
        <div>
          <ul className="-my-5 divide-y divide-slate-200">
            {items.map((r) => (
              <ReviewItem key={r.id} r={r} onPhoto={setPhoto} />
            ))}
          </ul>
          {page < initial.pages && (
            <button
              type="button"
              onClick={more}
              disabled={loading}
              className="mt-6 rounded-full bg-mist px-5 py-2.5 text-sm font-bold text-ink hover:bg-slate-200 disabled:opacity-50"
            >
              {loading ? 'Memuat…' : 'Lihat ulasan lainnya'}
            </button>
          )}
        </div>
      </div>

      {photo && (
        <button
          type="button"
          aria-label="Tutup foto"
          onClick={() => setPhoto('')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <img src={photo} alt="Foto ulasan" className="max-h-full max-w-full rounded-2xl" />
        </button>
      )}
    </section>
  );
}
