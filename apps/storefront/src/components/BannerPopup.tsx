'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadMotion, prefersReducedMotion } from '@/lib/motion';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';

const HIDE_DAYS = 3;
const DELAY_MS = 2500;

export type PopupBanner = { id: number; title: string; image: string; mobile_image: string; link_url: string };

const isExternal = (url: string) => /^https?:\/\//i.test(url);

/**
 * Popup banner promo/event (banner berpenempatan "Popup" dari Seller Center → Banner).
 * Muncul sekali per banner; setelah ditutup diam 3 hari. Banner baru (id lain) langsung tampil lagi.
 */
export default function BannerPopup({ banner }: { banner: PopupBanner }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const backdrop = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const key = `urbanix-popup-banner-${banner.id}`;

  useEffect(() => {
    try {
      const at = Number(localStorage.getItem(key));
      if (at > 0 && Date.now() - at < HIDE_DAYS * 86400000) return;
    } catch {
      /* tanpa penyimpanan: tetap tampil */
    }
    if (!prefersReducedMotion()) loadMotion().catch(() => {});
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  // Masuk: banner "dilempar" miring lalu memantul, dekorasi bermunculan.
  useLayoutEffect(() => {
    const box = card.current;
    const bg = backdrop.current;
    if (!open || !box || !bg || prefersReducedMotion()) return;
    const decos = Array.from(box.querySelectorAll<HTMLElement>('[data-deco]'));
    const hidden = [box, bg, ...decos];
    hidden.forEach((el) => (el.style.opacity = '0'));
    let cancelled = false;
    loadMotion()
      .then(({ animate, stagger }) => {
        if (cancelled) return;
        animate(bg, { opacity: [0, 1] }, { duration: 0.25 });
        animate(
          box,
          { opacity: [0, 1], scale: [0.6, 1], rotate: [5, 0], y: [60, 0] },
          { type: 'spring', bounce: 0.45, visualDuration: 0.6, opacity: { duration: 0.15 } }
        );
        if (decos.length)
          animate(
            decos,
            { opacity: [0, 1], scale: [0, 1] },
            { type: 'spring', bounce: 0.6, visualDuration: 0.5, delay: stagger(0.08, { startDelay: 0.35 }) }
          );
      })
      .catch(() => hidden.forEach((el) => (el.style.opacity = '')));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function remember() {
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      /* abaikan */
    }
  }

  async function close() {
    remember();
    const box = card.current;
    const bg = backdrop.current;
    if (box && bg && !prefersReducedMotion()) {
      try {
        const { animate } = await loadMotion();
        animate(bg, { opacity: 0 }, { duration: 0.2 });
        await animate(box, { opacity: 0, scale: 0.85, y: 30 }, { duration: 0.2, ease: 'easeIn' });
      } catch {
        /* langsung tutup */
      }
    }
    setOpen(false);
  }

  if (!open) return null;

  const link = banner.link_url.trim();
  const linkProps = link
    ? { href: link, onClick: remember, ...(isExternal(link) ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
    : null;
  const picture = (
    <picture>
      {banner.mobile_image && <source media="(max-width: 639px)" srcSet={banner.mobile_image} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.image} alt={banner.title} className="block max-h-[70vh] w-full object-contain" />
    </picture>
  );

  return (
    <div
      ref={backdrop}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/70 px-7 py-12 backdrop-blur-[2px]"
      onClick={() => close()}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label={banner.title}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px]"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={() => close()}
          aria-label={t('Tutup')}
          className="absolute -right-3 -top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white text-cobalt-900 shadow-lg ring-2 ring-black/5 transition hover:rotate-90 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
        >
          <TablerIcon name="x" size={20} stroke={2.6} />
        </button>

        {/* Dekorasi kecil di tepi banner */}
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -left-5 top-10 z-20">
          <span className="voucher-float flex h-11 w-11 items-center justify-center rounded-full bg-white text-sale-600 shadow-xl [--r:-14deg]">
            <TablerIcon name="sparkles" size={22} stroke={2.2} />
          </span>
        </span>
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -right-5 top-1/2 z-20">
          <span className="voucher-float-slow block rounded-xl bg-sale-600 px-2.5 py-2 text-white shadow-xl ring-2 ring-white [--r:14deg]">
            <span className="flex items-center gap-1 border-l-2 border-dashed border-white/50 pl-2 text-sm font-black">
              <TablerIcon name="discount" size={18} stroke={2.4} />%
            </span>
          </span>
        </span>
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -left-4 bottom-16 z-20">
          <span className="voucher-float-slow flex h-10 w-10 items-center justify-center rounded-full bg-cobalt-900 text-white shadow-xl ring-2 ring-white [--r:8deg]">
            <TablerIcon name="bolt" size={20} stroke={2.2} />
          </span>
        </span>

        <div className="overflow-hidden rounded-[28px] bg-cobalt-900 shadow-2xl ring-4 ring-white">
          {linkProps ? <a {...linkProps} className="block">{picture}</a> : picture}
        </div>

        {linkProps && (
          <a
            {...linkProps}
            className="voucher-cta group absolute -bottom-6 left-1/2 z-20 flex items-center gap-3 whitespace-nowrap rounded-full bg-sale-600 py-2.5 pl-6 pr-2.5 text-base font-black uppercase tracking-wide text-white shadow-[0_5px_0_#7a0010,0_14px_30px_rgb(0_0_0/0.35)] ring-4 ring-white"
          >
            {t('Lihat promonya')}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sale-600 transition-transform group-hover:translate-x-0.5">
              <TablerIcon name="arrow-right" size={18} stroke={3} />
            </span>
          </a>
        )}
      </div>
    </div>
  );
}
