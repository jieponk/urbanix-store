'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLang, useT } from '@/components/LangProvider';
import { getCart } from '@/lib/cart';
import { LANG_COOKIE, type Lang } from '@/lib/i18n';
import { loadMotion, prefersReducedMotion } from '@/lib/motion';

const THEME_KEY = 'urbanix-theme';

/** Jumlah barang di keranjang (ikut berubah saat produk ditambah/dihapus). */
export function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => setCount(getCart().reduce((total, item) => total + item.quantity, 0));
    update();
    window.addEventListener('cart-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return count;
}

/** Simpan pilihan bahasa di cookie lalu muat ulang tampilan dari server (keranjang tidak hilang). */
export function useSetLang() {
  const router = useRouter();
  return (lang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
    router.refresh();
  };
}

/** Mode gelap: baca status awal dari <html class="dark"> lalu simpan pilihan. */
function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* penyimpanan tidak tersedia */
    }
  };
  return { dark, toggle };
}

/** Angka keranjang berdenyut saat produk ditambahkan. */
function usePulse(ref: { current: HTMLElement | null }) {
  useEffect(() => {
    const pulse = () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      loadMotion()
        .then(({ animate }) => animate(el, { scale: [1, 1.4, 1] }, { duration: 0.45 }))
        .catch(() => {});
    };
    window.addEventListener('cart-added', pulse);
    return () => window.removeEventListener('cart-added', pulse);
  }, [ref]);
}

const badgeCls =
  'absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sale-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface';

/** Tombol ID/EN berbentuk sakelar kecil. */
function LangSwitch({ wide = false }: { wide?: boolean }) {
  const lang = useLang();
  const setLang = useSetLang();
  const t = useT();
  return (
    <div role="group" aria-label={t('Bahasa')} className={`relative grid grid-cols-2 rounded-full bg-mist p-0.5 text-xs font-extrabold ${wide ? 'w-full' : 'w-[76px]'}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-ink transition-transform duration-300 ease-out motion-reduce:transition-none ${lang === 'en' ? 'translate-x-full' : ''}`}
      />
      {(['id', 'en'] as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => lang !== code && setLang(code)}
          aria-pressed={lang === code}
          aria-label={code === 'id' ? 'Bahasa Indonesia' : 'English'}
          className={`relative z-10 rounded-full transition-colors ${wide ? 'py-2' : 'py-1.5'} ${lang === code ? 'text-surface' : 'text-slate-500 hover:text-ink'}`}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/**
 * Desktop (≥768px): tombol langsung di header — Cek pesanan, Keranjang, ID/EN, Mode gelap.
 * Di HP disembunyikan; diganti bar navigasi bawah (MobileNav).
 */
export default function HeaderActions() {
  const t = useT();
  const count = useCartCount();
  const { dark, toggle } = useTheme();
  const badge = useRef<HTMLSpanElement>(null);
  usePulse(badge);

  const btn =
    'group/item relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink';
  const tip =
    'pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-surface opacity-0 transition group-hover/item:opacity-100 group-focus-visible/item:opacity-100';

  return (
    <div className="hidden items-center gap-1 md:flex">
      <Link href="/tersimpan" aria-label={t('Produk tersimpan')} className={btn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-8.6C1.4 8.6 3.1 5 6.6 5c2 0 3.3 1.1 4.1 2.3.4.6 1.2.6 1.6 0C13.1 6.1 14.4 5 16.4 5c3.5 0 5.2 3.6 3.8 6.4C19 15.6 12 20 12 20z" /></svg>
        <span className={tip}>{t('Tersimpan')}</span>
      </Link>
      <Link href="/cek-pesanan" aria-label={t('Cek pesanan')} className={btn}>
        <OrderIco />
        <span className={tip}>{t('Cek pesanan')}</span>
      </Link>
      <Link href="/cart" aria-label={count > 0 ? t('Keranjang, {n} barang', { n: count }) : t('Keranjang')} className={btn}>
        <CartIco />
        {count > 0 && <span ref={badge} className={badgeCls}>{count}</span>}
        <span className={tip}>{t('Keranjang')}</span>
      </Link>
      <div className="mx-1"><LangSwitch /></div>
      <button type="button" onClick={toggle} aria-label={t(dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap')} className={btn}>
        {dark ? <SunIco /> : <MoonIco />}
        <span className={tip}>{t(dark ? 'Mode terang' : 'Mode gelap')}</span>
      </button>
    </div>
  );
}

const isProductPage = (p: string) => /^\/produk\/[^/]+/.test(p);
const NAV_DEPTH = 'urbanix-nav-depth';

/** Hitung halaman Urbanix yang dibuka di tab ini (untuk tahu apakah "kembali" tetap di dalam situs). */
function useNavDepth(pathname: string) {
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_DEPTH, String((Number(sessionStorage.getItem(NAV_DEPTH)) || 0) + 1));
    } catch {
      /* abaikan */
    }
  }, [pathname]);
}

const roundBtn =
  'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors active:bg-mist md:hidden';

/**
 * HP, halaman detail produk: tombol kembali di kiri header (menggantikan logo).
 * Datang dari halaman Urbanix lain → kembali ke sana (posisi gulir tetap); dibuka langsung → ke katalog.
 */
export function ProductBackButton() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname() || '/';
  if (!isProductPage(pathname)) return null;
  return (
    <button
      type="button"
      aria-label={t('Kembali')}
      onClick={() => {
        let depth = 0;
        try {
          depth = Number(sessionStorage.getItem(NAV_DEPTH)) || 0;
        } catch {
          /* abaikan */
        }
        if (depth > 1 && window.history.length > 1) router.back();
        else router.push('/produk');
      }}
      className={`${roundBtn} -ml-2`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

/** HP, halaman detail produk: ikon keranjang + jumlah barang di kanan header. */
export function ProductCartButton() {
  const t = useT();
  const pathname = usePathname() || '/';
  const count = useCartCount();
  const badge = useRef<HTMLSpanElement>(null);
  usePulse(badge);
  if (!isProductPage(pathname)) return null;
  return (
    <Link href="/cart" aria-label={count > 0 ? t('Keranjang, {n} barang', { n: count }) : t('Keranjang')} className={`${roundBtn} -mr-1.5`}>
      <CartIco />
      {count > 0 && <span ref={badge} className={badgeCls}>{count}</span>}
    </Link>
  );
}

type Cat = { id: number; name: string };

/**
 * true saat pembeli scroll ke bawah (bar disembunyikan), false saat scroll ke atas,
 * dekat bagian atas halaman, atau sudah mentok di bawah (footer terlihat).
 */
function useHideOnScroll(pathname: string) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
        if (y < 80 || nearBottom) setHidden(false);
        else if (delta > 6) setHidden(true);
        else if (delta < -6) setHidden(false);
        if (Math.abs(delta) > 6) last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);
  return hidden;
}

/**
 * HP (<768px): bar navigasi bawah — Beranda, Kategori, Artikel, Keranjang, Lainnya.
 * Kategori & Lainnya membuka panel yang meluncur dari bawah.
 * Disembunyikan di halaman detail produk: di sana ada bar "Beli" di bawah, dan tombol kembali +
 * keranjang pindah ke header (ProductBackButton / ProductCartButton).
 */
export function MobileNav({ categories, whatsappNumber, showPromo }: { categories: Cat[]; whatsappNumber: string; showPromo: boolean }) {
  const t = useT();
  const pathname = usePathname() || '/';
  const count = useCartCount();
  const { dark, toggle } = useTheme();
  const [sheet, setSheet] = useState<'cat' | 'more' | null>(null);
  const badge = useRef<HTMLSpanElement>(null);
  usePulse(badge);

  useEffect(() => setSheet(null), [pathname]);
  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(null);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const hidden = useHideOnScroll(pathname) && !sheet;
  useNavDepth(pathname);

  if (/^\/produk\/[^/]+/.test(pathname)) return null;

  const active = (key: string) =>
    sheet
      ? sheet === key
      : key === 'home'
        ? pathname === '/'
        : key === 'inspo'
          ? pathname.startsWith('/inspirasi') || pathname.startsWith('/berita')
          : key === 'cart'
            ? pathname.startsWith('/cart')
            : key === 'cat'
              ? pathname.startsWith('/produk')
              : false;

  const tab = (key: string) =>
    `relative z-0 flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10.5px] font-semibold transition-colors duration-300 ${
      active(key) ? 'text-ink' : 'text-slate-500'
    }`;
  // Sorotan tab aktif: kapsul lembut di belakang ikon + label (gaya iOS terbaru)
  const bar = (key: string) => (
    <span
      aria-hidden="true"
      className={`absolute inset-y-0.5 inset-x-0.5 -z-10 rounded-full bg-ink/[0.08] transition-all duration-300 ease-out dark:bg-white/[0.12] ${
        active(key) ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
      }`}
    />
  );
  const row =
    'flex items-center gap-3 rounded-2xl px-3 py-3 text-[15px] font-semibold text-ink transition-colors active:bg-mist';

  return (
    <>
      {/* Ruang kosong agar isi paling bawah (footer) tidak tertutup bar */}
      <div aria-hidden="true" className="h-[calc(5rem+env(safe-area-inset-bottom))] bg-cobalt-900 md:hidden" />

      {/* Panel dari bawah */}
      <div
        className={`fixed inset-0 z-[55] bg-black/45 transition-opacity duration-300 md:hidden ${sheet ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setSheet(null)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={sheet === 'cat' ? t('Kategori') : t('Lainnya')}
        aria-hidden={!sheet}
        className={`fixed inset-x-0 bottom-0 z-[56] max-h-[75vh] overflow-y-auto rounded-t-3xl bg-surface px-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] pt-2 shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden ${
          sheet ? 'translate-y-0' : 'pointer-events-none translate-y-full'
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        {sheet === 'cat' && (
          <>
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t('Kategori')}</p>
            <div className="grid grid-cols-2 gap-1">
              {showPromo && (
                <Link href="/produk?promo=1" className={`${row} col-span-2 text-sale-600`}>
                  <TagIco /> {t('Promo')}
                </Link>
              )}
              <Link href="/produk" className={`${row} col-span-2`}>
                <GridIco /> {t('Semua produk')}
              </Link>
              {categories.map((c) => (
                <Link key={c.id} href={`/produk?category=${c.id}`} className={`${row} py-2.5 text-sm`}>
                  {c.name}
                </Link>
              ))}
            </div>
          </>
        )}
        {sheet === 'more' && (
          <div className="flex flex-col gap-1">
            {showPromo && (
              <Link href="/produk?promo=1" className={`${row} text-sale-600`}>
                <TagIco /> {t('Promo')}
              </Link>
            )}
            <Link href="/cek-pesanan" className={row}>
              <OrderIco /> {t('Cek pesanan')}
            </Link>
            <Link href="/tersimpan" className={row}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-8.6C1.4 8.6 3.1 5 6.6 5c2 0 3.3 1.1 4.1 2.3.4.6 1.2.6 1.6 0C13.1 6.1 14.4 5 16.4 5c3.5 0 5.2 3.6 3.8 6.4C19 15.6 12 20 12 20z" /></svg> {t('Produk tersimpan')}
            </Link>
            <Link href="/bandingkan" className={row}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 4v16M17 4v16M3 8h8M13 16h8" /></svg> {t('Bandingkan produk')}
            </Link>
            {whatsappNumber && (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className={row}>
                <ChatIco /> {t('Chat admin')}
              </a>
            )}
            <Link href="/tentang-kami" className={row}>
              <InfoIco /> {t('Tentang kami')}
            </Link>
            <div className="mt-2 flex items-center gap-3 border-t border-slate-200 px-3 pt-4">
              <GlobeIco />
              <span className="flex-1 text-[15px] font-semibold text-ink">{t('Bahasa')}</span>
              <div className="w-28"><LangSwitch wide /></div>
            </div>
            <button type="button" onClick={toggle} className={`${row} justify-between`} aria-pressed={dark}>
              <span className="flex items-center gap-3">{dark ? <SunIco /> : <MoonIco />} {t('Mode gelap')}</span>
              <span className={`relative h-6 w-11 rounded-full transition-colors ${dark ? 'bg-ink' : 'bg-slate-300'}`}>
                <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform duration-300 ${dark ? 'translate-x-5' : ''}`} />
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Bar navigasi bawah */}
      {/* Kapsul mengambang: hilang saat scroll ke bawah, muncul lagi saat scroll ke atas */}
      <nav
        aria-label={t('Navigasi utama')}
        className={`fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[57] flex rounded-full bg-surface/75 p-1 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] backdrop-blur-xl backdrop-saturate-150 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none print:hidden dark:ring-white/10 md:hidden ${
          hidden ? 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <Link href="/" className={tab('home')} aria-current={pathname === '/' ? 'page' : undefined}>
          {bar('home')}
          <HomeIco />
          {t('Beranda')}
        </Link>
        <button type="button" className={tab('cat')} onClick={() => setSheet(sheet === 'cat' ? null : 'cat')} aria-expanded={sheet === 'cat'}>
          {bar('cat')}
          <GridIco />
          {t('Kategori')}
        </button>
        <Link href="/inspirasi" className={tab('inspo')}>
          {bar('inspo')}
          <InspoIco />
          {t('Artikel')}
        </Link>
        <Link href="/cart" className={tab('cart')} aria-label={count > 0 ? t('Keranjang, {n} barang', { n: count }) : t('Keranjang')}>
          {bar('cart')}
          <span className="relative">
            <CartIco />
            {count > 0 && <span ref={badge} className={badgeCls}>{count}</span>}
          </span>
          {t('Keranjang')}
        </Link>
        <button type="button" className={tab('more')} onClick={() => setSheet(sheet === 'more' ? null : 'more')} aria-expanded={sheet === 'more'}>
          {bar('more')}
          <MoreIco />
          {t('Lainnya')}
        </button>
      </nav>
    </>
  );
}

const ico = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const CartIco = () => (
  <svg {...ico} className="transition-transform duration-300 group-hover/item:-rotate-12">
    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
    <circle cx="9.5" cy="20" r="1.3" />
    <circle cx="17" cy="20" r="1.3" />
  </svg>
);
const OrderIco = () => (
  <svg {...ico} className="transition-transform duration-300 group-hover/item:-translate-y-0.5">
    <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
    <path d="m3 8 9 5 9-5M12 13v8" />
  </svg>
);
const InspoIco = () => (
  <svg {...ico} className="transition-transform duration-300 group-hover/item:rotate-[-6deg]">
    <path d="M4 5.5h12.5v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z" />
    <path d="M16.5 9h3.5v9.5a2 2 0 0 1-4 0M7.5 9h5.5M7.5 12.5h5.5M7.5 16h3.5" />
  </svg>
);
const ChatIco = () => (
  <svg {...ico} className="transition-transform duration-300 group-hover/item:scale-110">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
  </svg>
);
const GlobeIco = () => (
  <svg {...ico} width={17} height={17} className="transition-transform duration-500 group-hover/item:rotate-[30deg]">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z" />
  </svg>
);
const SunIco = () => (
  <svg {...ico} className="transition-transform duration-500 group-hover/item:rotate-45">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
  </svg>
);
const MoonIco = () => (
  <svg {...ico} className="transition-transform duration-500 group-hover/item:-rotate-12">
    <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
  </svg>
);

/** Pilihan bahasa di footer: "Bahasa Indonesia | English". */
export function LangLinks() {
  const lang = useLang();
  const setLang = useSetLang();
  const t = useT();
  return (
    <div className="flex items-center gap-2 text-xs" role="group" aria-label={t('Bahasa')}>
      <GlobeIco />
      {[
        { code: 'id' as Lang, label: 'Bahasa Indonesia' },
        { code: 'en' as Lang, label: 'English' },
      ].map((l, i) => (
        <span key={l.code} className="flex items-center gap-2">
          {i > 0 && <span className="text-white/30">|</span>}
          <button
            type="button"
            onClick={() => setLang(l.code)}
            aria-pressed={lang === l.code}
            className={`transition-colors ${lang === l.code ? 'font-bold text-white underline underline-offset-4' : 'text-white/65 hover:text-white'}`}
          >
            {l.label}
          </button>
        </span>
      ))}
    </div>
  );
}

const HomeIco = () => (
  <svg {...ico}>
    <path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" />
  </svg>
);
const GridIco = () => (
  <svg {...ico}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);
const MoreIco = () => (
  <svg {...ico}>
    <circle cx="5.5" cy="12" r="1.3" />
    <circle cx="12" cy="12" r="1.3" />
    <circle cx="18.5" cy="12" r="1.3" />
  </svg>
);
const TagIco = () => (
  <svg {...ico}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);
const InfoIco = () => (
  <svg {...ico}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
