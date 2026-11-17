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

/**
 * Satu tombol menu di kanan header. Saat ditekan, deretan ikon meluncur keluar ke kiri:
 * Keranjang, Cek pesanan, Inspirasi, Chat admin, Bahasa ID/EN, Mode gelap.
 * Angka di tombol = isi keranjang, supaya keranjang tetap terlihat walau menu tertutup.
 */
export default function HeaderMenu({ whatsappNumber }: { whatsappNumber: string }) {
  const t = useT();
  const lang = useLang();
  const setLang = useSetLang();
  const pathname = usePathname();
  const count = useCartCount();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLSpanElement>(null);

  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);
  useEffect(() => setOpen(false), [pathname]);

  // Tutup saat klik di luar / tombol Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Angka keranjang berdenyut saat produk ditambahkan
  useEffect(() => {
    const pulse = () => {
      const el = badge.current;
      if (!el || prefersReducedMotion()) return;
      loadMotion()
        .then(({ animate }) => animate(el, { scale: [1, 1.4, 1] }, { duration: 0.45 }))
        .catch(() => {});
    };
    window.addEventListener('cart-added', pulse);
    return () => window.removeEventListener('cart-added', pulse);
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      /* penyimpanan tidak tersedia */
    }
  }

  const item =
    'hmenu-item group/item relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink';
  const tip =
    'pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-semibold text-surface opacity-0 transition group-hover/item:opacity-100 group-focus-visible/item:opacity-100';

  const items = [
    {
      key: 'cart',
      node: (
        <Link href="/cart" aria-label={count > 0 ? t('Keranjang, {n} barang', { n: count }) : t('Keranjang')} className={item}>
          <CartIco />
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sale-600 px-1 text-[10px] font-bold text-white">{count}</span>}
          <span className={tip}>{t('Keranjang')}</span>
        </Link>
      ),
    },
    {
      key: 'order',
      node: (
        <Link href="/cek-pesanan" aria-label={t('Cek pesanan')} className={item}>
          <OrderIco />
          <span className={tip}>{t('Cek pesanan')}</span>
        </Link>
      ),
    },
    {
      key: 'inspo',
      node: (
        <Link href="/inspirasi" aria-label={t('Inspirasi')} className={item}>
          <InspoIco />
          <span className={tip}>{t('Inspirasi')}</span>
        </Link>
      ),
    },
    ...(whatsappNumber
      ? [
          {
            key: 'wa',
            node: (
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label={t('Chat admin')} className={item}>
                <ChatIco />
                <span className={tip}>{t('Chat admin')}</span>
              </a>
            ),
          },
        ]
      : []),
    {
      key: 'lang',
      node: (
        <button
          type="button"
          onClick={() => setLang(lang === 'en' ? 'id' : 'en')}
          aria-label={`${t('Ganti bahasa')}: ${lang === 'en' ? 'Bahasa Indonesia' : 'English'}`}
          className={`${item} w-auto gap-1 px-2.5 text-xs font-extrabold`}
        >
          <GlobeIco />
          <span className={lang === 'id' ? 'text-ink' : 'text-slate-400'}>ID</span>
          <span className="text-slate-300">/</span>
          <span className={lang === 'en' ? 'text-ink' : 'text-slate-400'}>EN</span>
          <span className={tip}>{t('Bahasa')}</span>
        </button>
      ),
    },
    {
      key: 'theme',
      node: (
        <button type="button" onClick={toggleTheme} aria-label={t(dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap')} className={item}>
          {dark ? <SunIco /> : <MoonIco />}
          <span className={tip}>{t(dark ? 'Mode terang' : 'Mode gelap')}</span>
        </button>
      ),
    },
  ];

  return (
    <div ref={wrap} className="relative flex items-center">
      {/* Deretan ikon yang meluncur ke kiri */}
      <div
        id="header-menu"
        role="menu"
        aria-hidden={!open}
        className={`absolute right-full top-1/2 mr-1 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-surface py-1 pl-1 pr-1 shadow-lg ring-1 ring-slate-200 transition-[opacity,transform,clip-path] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'visible opacity-100 [clip-path:inset(-40px_-10px_-40px_-10px)]' : 'invisible opacity-0 [clip-path:inset(0_0_0_100%)]'
        }`}
      >
        {items.map((it, i) => (
          <div
            key={it.key}
            role="none"
            className={`transition duration-300 ease-out motion-reduce:transition-none ${open ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
            style={{ transitionDelay: open ? `${(items.length - 1 - i) * 35}ms` : '0ms' }}
          >
            {it.node}
          </div>
        ))}
      </div>

      {/* Tombol pembuka */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="header-menu"
        aria-label={t(open ? 'Tutup menu' : 'Buka menu')}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${open ? 'bg-ink text-surface' : 'text-ink hover:bg-mist'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path className={`origin-center transition-transform duration-300 ${open ? 'translate-y-[5px] rotate-45' : ''}`} d="M5 7h14" style={{ transformBox: 'fill-box' }} />
          <path className={`transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} d="M5 12h14" />
          <path className={`origin-center transition-transform duration-300 ${open ? '-translate-y-[5px] -rotate-45' : ''}`} d="M5 17h14" style={{ transformBox: 'fill-box' }} />
        </svg>
        {count > 0 && !open && (
          <span ref={badge} className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sale-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}

const ico = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
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
