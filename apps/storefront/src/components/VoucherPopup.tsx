'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadMotion, prefersReducedMotion } from '@/lib/motion';
import { claimVoucher, type VoucherInfo } from '@/lib/vouchers';
import { useLang, useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';
import { dateLocale } from '@/lib/i18n';

const STORAGE_KEY = 'urbanix-voucher-popup-closed';
const HIDE_DAYS = 3;
const DELAY_MS = 2500;
const CONFETTI = ['#ffffff', '#ff5a6e', '#191919', '#dddddd', '#ffd7dc', '#be0000'];

function closedRecently() {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY));
    return at > 0 && Date.now() - at < HIDE_DAYS * 86400000;
  } catch {
    return false;
  }
}

/** 300000 → "300RB", 1500000 → "1,5JT". */
function short(n: number) {
  if (n >= 1_000_000) return `${String(Number((n / 1_000_000).toFixed(1))).replace('.', ',')}JT`;
  if (n >= 1000) return `${Math.round(n / 1000)}RB`;
  return String(n);
}

type T = (s: string, p?: Record<string, string | number>) => string;

/** Teks besar & kecil untuk satu blok voucher. */
function offer(v: VoucherInfo, t: T) {
  const value = Number(v.value) || 0;
  const min = Number(v.min_purchase) || 0;
  const minText = min > 0 ? t('MIN. BELANJA Rp{n}', { n: short(min) }) : t('TANPA MIN. BELANJA');
  if (v.type === 'PERCENT') {
    const max = Number(v.max_discount) || 0;
    return {
      big: `${Number(value.toFixed(2))}%`,
      label: t('DISKON'),
      sub: max > 0 ? t('S/D Rp{n}', { n: short(max) }) : minText,
      note: max > 0 ? minText : '',
    };
  }
  if (v.type === 'FIXED') return { big: `Rp${short(value)}`, label: t('POTONGAN'), sub: minText, note: '' };
  return { big: t('GRATIS ONGKIR'), label: '', sub: t('S/D Rp{n}', { n: short(value) }), note: minText };
}

type Props = {
  /** Voucher utama (bercentang "Tampilkan di popup"). */
  voucher: VoucherInfo;
  /** Voucher publik lain yang ikut ditumpuk di bawahnya (maks. 2). */
  extras?: VoucherInfo[];
};

/** Popup voucher beranda, gaya kupon meriah. Muncul sekali, lalu diam 3 hari setelah ditutup. */
export default function VoucherPopup({ voucher, extras = [] }: Props) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const backdrop = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const others = extras.filter((v) => v.code !== voucher.code).slice(0, 2);

  useEffect(() => {
    if (closedRecently()) return;
    if (!prefersReducedMotion()) loadMotion().catch(() => {});
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Masuk: kupon "meletup" dari kecil, blok voucher naik satu per satu, dekorasi beterbangan masuk.
  useLayoutEffect(() => {
    const box = card.current;
    const bg = backdrop.current;
    if (!open || !box || !bg || prefersReducedMotion()) return;
    const blocks = Array.from(box.querySelectorAll<HTMLElement>('[data-pop]'));
    const decos = Array.from(box.querySelectorAll<HTMLElement>('[data-deco]'));
    const hidden = [box, bg, ...blocks, ...decos];
    hidden.forEach((el) => (el.style.opacity = '0'));
    let cancelled = false;
    loadMotion()
      .then(({ animate, stagger }) => {
        if (cancelled) return;
        animate(bg, { opacity: [0, 1] }, { duration: 0.25 });
        animate(
          box,
          { opacity: [0, 1], scale: [0.55, 1], rotate: [-6, 0] },
          { type: 'spring', bounce: 0.5, visualDuration: 0.55, opacity: { duration: 0.15 } }
        );
        if (blocks.length)
          animate(
            blocks,
            { opacity: [0, 1], y: [30, 0], scale: [0.9, 1] },
            { type: 'spring', bounce: 0.45, visualDuration: 0.45, delay: stagger(0.09, { startDelay: 0.2 }) }
          );
        if (decos.length)
          animate(
            decos,
            { opacity: [0, 1], scale: [0, 1] },
            { type: 'spring', bounce: 0.6, visualDuration: 0.5, delay: stagger(0.07, { startDelay: 0.4 }) }
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
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* tanpa penyimpanan: popup bisa muncul lagi, tidak masalah */
    }
  }

  async function close(after?: () => void) {
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
    after?.();
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard ditolak: kode tetap terlihat */
    }
  }

  /** Konfeti meletup dari tombol klaim. */
  async function burst() {
    const btn = ctaRef.current;
    const host = card.current;
    if (!btn || !host || prefersReducedMotion()) return;
    const { animate } = await loadMotion();
    const hostBox = host.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const cx = b.left - hostBox.left + b.width / 2;
    const cy = b.top - hostBox.top + b.height / 2;
    const pieces = Array.from({ length: 36 }, (_, i) => {
      const el = document.createElement('span');
      const size = 6 + Math.random() * 6;
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        position: 'absolute',
        left: `${cx}px`,
        top: `${cy}px`,
        width: `${size}px`,
        height: `${size * (i % 3 === 0 ? 1 : 0.45)}px`,
        background: CONFETTI[i % CONFETTI.length],
        borderRadius: i % 4 === 0 ? '999px' : '2px',
        pointerEvents: 'none',
        zIndex: '30',
      });
      host.appendChild(el);
      return el;
    });
    await Promise.all(
      pieces.map((el) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
        const dist = 110 + Math.random() * 160;
        return animate(
          el,
          {
            x: [0, Math.cos(angle) * dist, Math.cos(angle) * dist * 1.15],
            y: [0, Math.sin(angle) * dist, Math.sin(angle) * dist + 140],
            rotate: [0, (Math.random() - 0.5) * 720],
            opacity: [1, 1, 0],
          },
          { duration: 1 + Math.random() * 0.4, ease: [0.2, 0.7, 0.4, 1] }
        ).then(() => el.remove());
      })
    );
  }

  async function claim() {
    if (claimed) return;
    [voucher, ...others].forEach((v) => claimVoucher(v.code));
    setClaimed(true);
    await burst().catch(() => {});
    close(() => document.getElementById('produk-pilihan')?.scrollIntoView({ behavior: 'smooth' }));
  }

  if (!open) return null;

  const main = offer(voucher, t);
  const ends = voucher.ends_at
    ? new Date(voucher.ends_at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' })
    : '';

  return (
    <div
      ref={backdrop}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/65 px-7 py-10 backdrop-blur-[2px]"
      onClick={() => close()}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[370px]"
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

        {/* Dekorasi beterbangan di tepi kartu */}
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -left-5 top-28 z-20 sm:-left-8">
          <span className="voucher-float block rounded-xl bg-white px-2.5 py-2 text-sale-600 shadow-xl [--r:-18deg]">
            <span className="flex items-center gap-1 border-l-2 border-dashed border-sale-600/40 pl-2 text-sm font-black">
              <TablerIcon name="discount" size={18} stroke={2.4} />%
            </span>
          </span>
        </span>
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -right-5 top-[44%] z-20 sm:-right-7">
          <span className="voucher-float-slow block rounded-xl bg-cobalt-900 px-2.5 py-2 text-white shadow-xl ring-2 ring-white [--r:16deg]">
            <span className="flex items-center gap-1 border-l-2 border-dashed border-white/40 pl-2 text-sm font-black">
              <TablerIcon name="ticket" size={18} stroke={2.2} />Rp
            </span>
          </span>
        </span>
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -left-6 bottom-20 z-20">
          <span className="voucher-float-slow flex h-12 w-12 items-center justify-center rounded-full bg-white text-cobalt-900 shadow-xl [--r:10deg]">
            <TablerIcon name="camera" size={24} stroke={2} />
          </span>
        </span>
        <span data-deco aria-hidden="true" className="pointer-events-none absolute -right-5 bottom-16 z-20">
          <span className="voucher-float flex h-11 w-11 items-center justify-center rounded-full bg-[#ffd7dc] text-sale-700 shadow-xl ring-2 ring-white [--r:-12deg]">
            <TablerIcon name="shopping-bag" size={22} stroke={2.2} />
          </span>
        </span>

        {/* Kartu utama */}
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-[#ff2a46] via-sale-600 to-sale-700 px-5 pb-12 pt-7 text-center shadow-2xl ring-4 ring-white/15">
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-white/25 blur-3xl" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1.2px,transparent_1.2px)] [background-size:16px_16px]"
          />
          <span aria-hidden="true" className="voucher-twinkle pointer-events-none absolute right-9 top-7 text-white/80">
            <TablerIcon name="sparkles" size={20} stroke={2} />
          </span>
          <span aria-hidden="true" className="voucher-twinkle pointer-events-none absolute bottom-24 left-6 text-white/70 [animation-delay:0.8s]">
            <TablerIcon name="sparkles" size={16} stroke={2} />
          </span>

          <p data-pop className="relative inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white ring-1 ring-white/30">
            {t('Khusus buat kamu')}
          </p>
          <h2
            id="voucher-popup-title"
            data-pop
            className="relative mt-2 text-[2.6rem] font-black uppercase italic leading-[0.95] tracking-tight text-white [text-shadow:0_4px_0_#8f0013,0_8px_18px_rgb(0_0_0/0.25)]"
          >
            {t('Voucher')}
            <br />
            {others.length ? t('Berlipat!') : t('Spesial!')}
          </h2>

          {/* Blok voucher utama */}
          <div data-pop className="relative mt-5 rounded-[22px] bg-cobalt-900 p-1.5 shadow-[0_6px_0_#7a0010] ring-2 ring-white/90">
            <div className="rounded-[17px] border-2 border-dashed border-white/25 px-4 pb-3 pt-3">
              {main.label && <p className="text-xs font-black tracking-[0.3em] text-white/70">{main.label}</p>}
              <p className="voucher-pulse font-black leading-none text-white">
                <span className={voucher.type === 'FREE_SHIPPING' ? 'text-[2.1rem]' : 'text-[4.2rem] tracking-tight'}>{main.big}</span>
              </p>
              <p className="mt-1 text-lg font-black text-sun-300">{main.sub}</p>
              {main.note && <p className="text-[11px] font-bold tracking-wide text-white/60">{main.note}</p>}
              <button
                type="button"
                onClick={copyCode}
                className="voucher-shine relative mx-auto mt-3 flex items-center gap-2 overflow-hidden rounded-full bg-white py-1.5 pl-4 pr-1.5 text-cobalt-900 transition active:scale-95"
                aria-label={t('Salin kode voucher {code}', { code: voucher.code })}
              >
                <span className="font-mono text-sm font-black tracking-[0.2em]">{voucher.code}</span>
                <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black text-white ${copied ? 'bg-emerald-600' : 'bg-cobalt-900'}`}>
                  <TablerIcon name={copied ? 'check' : 'clipboard-list'} size={12} stroke={2.6} />
                  {copied ? t('Tersalin') : t('Salin')}
                </span>
              </button>
            </div>
          </div>

          {/* Voucher lain ditumpuk, disambung tanda + */}
          {others.map((v) => {
            const o = offer(v, t);
            return (
              <div key={v.code}>
                <span
                  data-pop
                  aria-hidden="true"
                  className="relative z-10 -my-2 mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white text-sale-600 shadow-[0_3px_0_#7a0010] ring-4 ring-sale-600"
                >
                  <TablerIcon name="plus" size={18} stroke={3} />
                </span>
                <div data-pop className="relative rounded-[20px] bg-white px-4 py-3 shadow-[0_5px_0_#7a0010]">
                  <p className="text-[1.55rem] font-black uppercase leading-none tracking-tight text-cobalt-900">
                    {o.label && <span className="mr-1.5">{o.label}</span>}
                    {o.big}
                  </p>
                  <p className="mt-1 text-sm font-black text-sale-600">
                    {o.sub}
                    {o.note && <span className="ml-1.5 text-[11px] font-bold text-slate-500">· {o.note}</span>}
                  </p>
                </div>
              </div>
            );
          })}

          <p data-pop className="relative mt-4 text-[11px] font-semibold text-white/85">
            {ends ? `${t('Berlaku sampai {d}', { d: ends })} · ` : ''}
            {t('Otomatis terpasang di checkout')}
          </p>
        </div>

        {/* Tombol besar menempel di bawah kartu */}
        <button
          ref={ctaRef}
          type="button"
          onClick={claim}
          className="voucher-cta group absolute -bottom-7 left-1/2 z-20 flex items-center gap-3 whitespace-nowrap rounded-full bg-cobalt-900 py-2.5 pl-7 pr-2.5 text-lg font-black uppercase tracking-wide text-white shadow-[0_6px_0_#000,0_14px_30px_rgb(0_0_0/0.35)] ring-4 ring-white transition-[box-shadow] active:shadow-[0_2px_0_#000]"
        >
          {claimed ? t('Berhasil diklaim!') : t('Klaim sekarang')}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-cobalt-900 transition-transform group-hover:translate-x-0.5">
            <TablerIcon name={claimed ? 'check' : 'arrow-right'} size={20} stroke={3} />
          </span>
        </button>
      </div>
    </div>
  );
}
