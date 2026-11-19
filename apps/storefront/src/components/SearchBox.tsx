'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { productImg } from '@/lib/img';
import { money } from '@/lib/money';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';

type Hit = { id: number; name: string; category: string; image: string; price: number; original: number | null };
type Cat = { id: number; name: string; count: number };
type Data = { results: Hit[]; total: number; suggestions: string[]; categories: Cat[]; brands: string[] };

const EMPTY: Data = { results: [], total: 0, suggestions: [], categories: [], brands: [] };
const HISTORY_KEY = 'urbanix-search-history';
const MAX_HISTORY = 8;

function readHistory(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function writeHistory(list: string[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

/** Tebalkan bagian yang cocok dengan kata kunci. */
function Highlight({ text, q }: { text: string; q: string }) {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return (
    <>
      {text.split(re).map((part, i) =>
        words.includes(part.toLowerCase()) ? (
          <b key={i} className="font-extrabold text-ink">
            {part}
          </b>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Ambil saran 200 ms setelah pembeli berhenti mengetik (juga daftar populer saat kosong). */
function useSuggestions(query: string, enabled: boolean) {
  const [data, setData] = useState<Data>(EMPTY);
  const [popular, setPopular] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (!enabled || popular.categories.length || popular.brands.length) return;
    fetch('/api/search')
      .then((r) => r.json())
      .then((d) => setPopular({ ...EMPTY, ...d }))
      .catch(() => {});
  }, [enabled, popular]);

  useEffect(() => {
    if (q.length < 2) {
      setData(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        setData({ ...EMPTY, ...(await res.json()) });
      } catch {
        /* dibatalkan atau gagal: biarkan saran lama */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return { data, popular, loading };
}

const SearchIco = ({ className = '' }: { className?: string }) => <TablerIcon name="search" size={18} stroke={2.2} className={`shrink-0 ${className}`} />;
const ClockIco = () => <TablerIcon name="clock" size={16} className="shrink-0 text-slate-400" />;
const ArrowUpLeft = () => (
  <TablerIcon name="arrow-up-left" size={16} className="shrink-0 text-slate-400" />
);

/**
 * Kotak cari header.
 * - PC: dropdown di bawah kotak (riwayat, populer, saran kata, kategori, produk).
 * - HP: menyentuh kotak membuka halaman cari layar penuh (keyboard tidak menutupi saran, tombol kembali menutup).
 */
export default function SearchBox({ className }: { className: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const boxRef = useRef<HTMLFormElement>(null);
  const fullInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false); // dropdown PC
  const [full, setFull] = useState(false); // layar penuh HP
  const [active, setActive] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const { data, popular, loading } = useSuggestions(query, open || full);
  const q = query.trim();

  useEffect(() => setHistory(readHistory()), []);

  // Tutup saat pindah halaman
  useEffect(() => {
    setOpen(false);
    setFull(false);
  }, [pathname]);

  // PC: tutup dropdown saat klik di luar
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // HP: tombol kembali (Android/gesture) menutup halaman cari, bukan meninggalkan halaman
  const closeFull = useCallback(() => {
    if (window.history.state?.urbanixSearch) window.history.back();
    else setFull(false);
  }, []);
  useEffect(() => {
    if (!full) return;
    window.history.pushState({ ...(window.history.state || {}), urbanixSearch: true }, '');
    const onPop = () => setFull(false);
    window.addEventListener('popstate', onPop);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => fullInput.current?.focus(), 60);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.body.style.overflow = prev;
      window.clearTimeout(timer);
    };
  }, [full]);

  function remember(term: string) {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...history.filter((h) => h.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_HISTORY);
    setHistory(next);
    writeHistory(next);
  }

  function go(href: string, term?: string) {
    if (term) remember(term);
    setOpen(false);
    if (full) {
      // Ganti entri riwayat "halaman cari" dengan halaman tujuan: tombol kembali nanti ke halaman sebelum mencari.
      setFull(false);
      if (window.history.state?.urbanixSearch) {
        router.replace(href);
        return;
      }
    }
    router.push(href);
  }

  const search = (term: string) => go(`/produk?q=${encodeURIComponent(term.trim())}`, term);

  function removeHistory(term: string) {
    const next = history.filter((h) => h !== term);
    setHistory(next);
    writeHistory(next);
  }

  function clearHistory() {
    setHistory([]);
    writeHistory([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (full) closeFull();
      setOpen(false);
      return;
    }
    if (!data.results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, data.results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    }
  }

  useEffect(() => setActive(-1), [data]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (active >= 0 && data.results[active]) go(`/produk/${data.results[active].id}`, q);
    else if (q) search(q);
  }

  const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

  /* ---------------------------------------------------------------- isi saran (dipakai PC & HP) */
  const big = full; // HP: baris lebih tinggi agar mudah disentuh
  const rowCls = `flex w-full items-center gap-3 px-4 text-left transition-colors hover:bg-mist ${big ? 'py-3 text-[15px]' : 'py-2 text-sm'}`;
  const head = (label: string, extra?: React.ReactNode) => (
    <p className="flex items-center justify-between px-4 pb-1 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
      {label}
      {extra}
    </p>
  );

  const panel =
    q.length < 2 ? (
      <div className="pb-3">
        {history.length > 0 && (
          <>
            {head(
              t('Terakhir dicari'),
              <button type="button" onClick={clearHistory} className="text-[11px] font-bold normal-case tracking-normal text-slate-500 hover:text-ink">
                {t('Hapus semua')}
              </button>
            )}
            <ul>
              {history.map((h) => (
                <li key={h} className="flex items-center">
                  <button type="button" onClick={() => search(h)} className={`${rowCls} flex-1 text-slate-700`}>
                    <ClockIco />
                    <span className="min-w-0 flex-1 truncate">{h}</span>
                  </button>
                  <button type="button" onClick={() => removeHistory(h)} aria-label={t('Hapus dari riwayat')} className="px-4 py-2 text-slate-400 hover:text-ink">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        {popular.brands.length > 0 && (
          <>
            {head(t('Merek populer'))}
            <div className="flex flex-wrap gap-2 px-4 pt-1">
              {popular.brands.map((b) => (
                <button key={b} type="button" onClick={() => search(b)} className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink">
                  {b}
                </button>
              ))}
            </div>
          </>
        )}
        {popular.categories.length > 0 && (
          <>
            {head(t('Kategori'))}
            <div className="flex flex-wrap gap-2 px-4 pt-1">
              {popular.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => go(`/produk?category=${c.id}`)}
                  className="rounded-full bg-mist px-3.5 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </>
        )}
        {!history.length && !popular.brands.length && !popular.categories.length && (
          <p className="px-4 py-6 text-center text-sm text-slate-500">{t('Ketik nama produk, merek, atau jenis gear.')}</p>
        )}
      </div>
    ) : (
      <div className="pb-1">
        {data.suggestions.length > 0 && (
          <ul className="pt-2">
            {data.suggestions.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => search(s)} className={`${rowCls} text-slate-600`}>
                  <SearchIco className="text-slate-400" />
                  <span className="min-w-0 flex-1 truncate">
                    <Highlight text={s} q={q} />
                  </span>
                  {big && (
                    <span
                      role="button"
                      tabIndex={-1}
                      aria-label={t('Pakai kata ini')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuery(s + ' ');
                        fullInput.current?.focus();
                      }}
                      className="-mr-1 p-1"
                    >
                      <ArrowUpLeft />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {data.categories.length > 0 && (
          <>
            {head(t('Kategori'))}
            <ul>
              {data.categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => go(`/produk?category=${c.id}&q=${encodeURIComponent(q)}`, q)}
                    className={`${rowCls} text-slate-700`}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {t('“{q}” di', { q })} <b className="font-bold text-ink">{c.name}</b>
                    </span>
                    {c.count > 0 && <span className="text-xs text-slate-400">{c.count}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {data.results.length > 0 && (
          <>
            {head(t('Produk'))}
            <ul role="listbox" id={listId}>
              {data.results.map((h, i) => (
                <li key={h.id} role="option" aria-selected={i === active}>
                  <Link
                    href={`/produk/${h.id}`}
                    onClick={(e: { preventDefault(): void }) => {
                      e.preventDefault();
                      go(`/produk/${h.id}`, q);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${i === active ? 'bg-mist' : 'hover:bg-mist'}`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-slate-200">
                      {h.image && <img src={productImg(h.image, 120)} alt="" className="h-full w-full object-contain" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-snug text-slate-700">
                        <Highlight text={h.name} q={q} />
                      </span>
                      <span className="text-xs text-slate-500">{h.category}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className={`block text-sm font-extrabold ${h.original ? 'text-sale-600' : 'text-ink'}`}>{money(h.price)}</span>
                      {h.original && <span className="block text-xs text-slate-400 line-through">{money(h.original)}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => search(q)} className="block w-full border-t border-slate-200 px-4 py-3 text-center text-sm font-bold text-ink hover:bg-mist">
              {t('Lihat semua {n} hasil untuk “{q}”', { n: data.total, q })}
            </button>
          </>
        )}

        {!loading && !data.results.length && !data.suggestions.length && !data.categories.length && (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            {t('Tidak ada produk untuk “{q}”. Coba kata lain, misalnya merek atau jenis produk.', { q })}
          </p>
        )}
        {loading && !data.results.length && <p className="px-4 py-6 text-center text-sm text-slate-500">{t('Mencari…')}</p>}
      </div>
    );

  /* ---------------------------------------------------------------- tampilan */
  return (
    <>
      <form ref={boxRef} action="/produk" method="GET" role="search" className={`relative ${className}`} onSubmit={onSubmit}>
        <label className="flex w-full items-center gap-2 rounded-full border border-slate-200 bg-mist px-3.5 py-2 focus-within:border-ink focus-within:bg-surface md:px-4 md:py-2.5">
          <SearchIco className="text-slate-500" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              // HP: input header tetap fokus (keyboard iOS tetap terbuka), lalu fokus pindah ke input layar penuh
              if (isMobile()) setFull(true);
              else setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder={t('Cari kamera, lensa, mic…')}
            aria-label={t('Cari produk')}
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400 md:text-sm"
          />
          {loading && open && (
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-ink" role="status" aria-label={t('Mencari')} />
          )}
        </label>

        {/* PC: dropdown */}
        {open && !full && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 hidden max-h-[75vh] overflow-y-auto rounded-2xl border border-slate-200 bg-surface shadow-2xl shadow-slate-900/15 md:block md:min-w-[28rem]">
            {panel}
          </div>
        )}
      </form>

      {/* HP: halaman cari layar penuh */}
      {full && (
        <div role="dialog" aria-modal="true" aria-label={t('Cari produk')} className="search-full fixed inset-0 z-[80] flex flex-col bg-surface md:hidden">
          <form onSubmit={onSubmit} className="flex items-center gap-2 border-b border-slate-200 px-2 py-2.5" role="search">
            <button type="button" onClick={closeFull} aria-label={t('Kembali')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink active:bg-mist">
              <TablerIcon name="arrow-left" size={22} stroke={2.2} />
            </button>
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-ink bg-surface px-3.5 py-2">
              <SearchIco className="text-slate-500" />
              <input
                ref={fullInput}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={t('Cari kamera, lensa, mic…')}
                aria-label={t('Cari produk')}
                autoComplete="off"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-400"
              />
              {loading ? (
                <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-ink" role="status" aria-label={t('Mencari')} />
              ) : (
                query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      fullInput.current?.focus();
                    }}
                    aria-label={t('Hapus teks')}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white"
                  >
                    ×
                  </button>
                )
              )}
            </label>
            <button type="submit" disabled={!q} className="shrink-0 px-2 text-sm font-bold text-ink disabled:text-slate-400">
              {t('Cari')}
            </button>
          </form>
          <div className="flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">{panel}</div>
        </div>
      )}
    </>
  );
}
