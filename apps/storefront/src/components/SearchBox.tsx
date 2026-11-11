'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { productImg } from '@/lib/img';

type Hit = {
  id: number;
  name: string;
  category: string;
  image: string;
  price: number;
  original: number | null;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

/** Kotak cari header: saran produk muncul otomatis saat pembeli mengetik. */
export default function SearchBox({ className }: { className: string }) {
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Ambil saran 250 ms setelah pembeli berhenti mengetik.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = await res.json();
        setHits(data.results || []);
        setTotal(data.total || 0);
        setActive(-1);
      } catch {
        /* dibatalkan atau gagal: biarkan saran lama */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Tutup saat klik di luar kotak.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const q = query.trim();
  const showPanel = open && q.length >= 2;
  const allHref = `/produk?q=${encodeURIComponent(q)}`;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPanel) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <form
      ref={boxRef}
      action="/produk"
      method="GET"
      role="search"
      className={`relative ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && hits[active]) go(`/produk/${hits[active].id}`);
        else if (q) go(allHref);
      }}
    >
      <label className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-mist px-3.5 py-2 focus-within:border-slate-900 focus-within:bg-surface md:px-4 md:py-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="shrink-0 text-slate-500">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Cari kamera, lensa, mic…"
          aria-label="Cari produk"
          autoComplete="off"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400 md:text-sm"
        />
        {loading && (
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" role="status" aria-label="Mencari" />
        )}
      </label>

      {showPanel && (
        <div
          id={listId}
          className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-2xl shadow-slate-900/15 md:min-w-[26rem]"
        >
          {hits.length > 0 ? (
            <>
              <p className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Produk</p>
              <ul role="listbox" className="max-h-[60vh] overflow-y-auto pb-1">
                {hits.map((h, i) => (
                  <li key={h.id} role="option" aria-selected={i === active}>
                    <Link
                      href={`/produk/${h.id}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-center gap-3 px-4 py-2.5 ${i === active ? 'bg-mist' : ''}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f7f7] p-1">
                        {h.image && <img src={productImg(h.image, 120)} alt="" className="h-full w-full object-contain" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-semibold text-ink">{h.name}</span>
                        <span className="text-xs text-slate-500">{h.category}</span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-extrabold text-ink">{rupiah(h.price)}</span>
                        {h.original && <span className="block text-xs text-slate-400 line-through">{rupiah(h.original)}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={allHref}
                onClick={() => setOpen(false)}
                className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-bold text-brand-600 hover:bg-mist"
              >
                Lihat semua {total} hasil untuk “{q}”
              </Link>
            </>
          ) : (
            !loading && (
              <p className="px-4 py-5 text-center text-sm text-slate-500">
                Tidak ada produk untuk “{q}”. Coba kata lain, misalnya merek atau jenis produk.
              </p>
            )
          )}
          {hits.length === 0 && loading && <p className="px-4 py-5 text-center text-sm text-slate-500">Mencari…</p>}
        </div>
      )}
    </form>
  );
}
