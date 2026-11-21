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
const CONFETTI = ['#e30220', '#ff5a6e', '#ffffff', '#191919', '#dddddd', '#be0000'];

/** Lekukan kiri-kanan ala tiket: bagian atas dilubangi di sudut bawah, bagian bawah di sudut atas. */
const notch = (edge: 'top' | 'bottom') => {
  const y = edge === 'bottom' ? '100%' : '0';
  const g = (x: string) => `radial-gradient(circle 13px at ${x} ${y}, transparent 12px, #000 13px)`;
  const mask = `${g('0')} left / 51% 100% no-repeat, ${g('100%')} right / 51% 100% no-repeat`;
  return { WebkitMask: mask, mask } as React.CSSProperties;
};

function closedRecently() {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY));
    return at > 0 && Date.now() - at < HIDE_DAYS * 86400000;
  } catch {
    return false;
  }
}

/** Angka besar di tiket: 5% / 50rb / Gratis ongkir. */
function bigValue(v: VoucherInfo): { main: string; unit: string } {
  const n = Number(v.value) || 0;
  if (v.type === 'PERCENT') return { main: String(Number(n.toFixed(2))), unit: '%' };
  const short = n >= 1_000_000 ? `${Number((n / 1_000_000).toFixed(1))}jt` : n >= 1000 ? `${Math.round(n / 1000)}rb` : String(n);
  return { main: short, unit: '' };
}

/** Popup voucher belanja di website (voucher bercentang "Tampilkan di popup"). Muncul sekali, lalu diam 3 hari setelah ditutup. */
export default function VoucherPopup({ voucher, whatsappNumber }: { voucher: VoucherInfo; whatsappNumber?: string }) {
  const t = useT();
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const backdrop = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (closedRecently()) return;
    if (!prefersReducedMotion()) loadMotion().catch(() => {});
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Masuk: tiket "dilempar" dari bawah sambil miring lalu memantul, angka diskon meletup.
  useLayoutEffect(() => {
    const box = card.current;
    const bg = backdrop.current;
    if (!open || !box || !bg || prefersReducedMotion()) return;
    box.style.opacity = '0';
    bg.style.opacity = '0';
    let cancelled = false;
    loadMotion()
      .then(({ animate }) => {
        if (cancelled) return;
        animate(bg, { opacity: [0, 1] }, { duration: 0.25 });
        animate(
          box,
          { opacity: [0, 1], y: [90, 0], rotate: [-7, 0], scale: [0.88, 1] },
          { type: 'spring', bounce: 0.45, visualDuration: 0.6, opacity: { duration: 0.2 } }
        );
        if (valueRef.current)
          animate(valueRef.current, { scale: [0.4, 1], rotate: [-12, 0] }, { type: 'spring', bounce: 0.6, visualDuration: 0.5, delay: 0.25 });
      })
      .catch(() => {
        box.style.opacity = '';
        bg.style.opacity = '';
      });
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
        await animate(box, { opacity: 0, y: 40, scale: 0.95 }, { duration: 0.2, ease: 'easeIn' });
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

  /** Konfeti kecil meletup dari tombol klaim. */
  async function burst() {
    const btn = ctaRef.current;
    const host = card.current;
    if (!btn || !host || prefersReducedMotion()) return;
    const { animate } = await loadMotion();
    const hostBox = host.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const cx = b.left - hostBox.left + b.width / 2;
    const cy = b.top - hostBox.top + b.height / 2;
    const pieces = Array.from({ length: 28 }, (_, i) => {
      const el = document.createElement('span');
      const size = 5 + Math.random() * 5;
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
        zIndex: '20',
        boxShadow: CONFETTI[i % CONFETTI.length] === '#ffffff' ? '0 0 0 1px rgba(0,0,0,.08)' : 'none',
      });
      host.appendChild(el);
      return el;
    });
    await Promise.all(
      pieces.map((el) => {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
        const dist = 90 + Math.random() * 130;
        return animate(
          el,
          {
            x: [0, Math.cos(angle) * dist, Math.cos(angle) * dist * 1.15],
            y: [0, Math.sin(angle) * dist, Math.sin(angle) * dist + 120],
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
    claimVoucher(voucher.code);
    setClaimed(true);
    await burst().catch(() => {});
    close(() => document.getElementById('produk-pilihan')?.scrollIntoView({ behavior: 'smooth' }));
  }

  if (!open) return null;

  const value = bigValue(voucher);
  const ends = voucher.ends_at
    ? new Date(voucher.ends_at).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })
    : '';
  const unitLabel =
    voucher.type === 'PERCENT' ? t('diskon') : voucher.type === 'FIXED' ? t('potongan') : t('gratis ongkir');
  const steps: { icon: 'shopping-cart' | 'ticket' | 'discount'; text: string }[] = [
    { icon: 'shopping-cart', text: t('Pilih barang incaran') },
    { icon: 'ticket', text: t('Pakai kodenya di checkout') },
    { icon: 'discount', text: t('Langsung hemat!') },
  ];
  const chatText = encodeURIComponent(`Hai kak, saya mau nanya soal voucher ${voucher.code}`);

  return (
    <div
      ref={backdrop}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:items-center"
      onClick={() => close()}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[400px] drop-shadow-2xl"
      >
        {/* Bagian atas tiket */}
        <div className="relative overflow-hidden rounded-t-[28px] bg-cobalt-900 px-6 pb-8 pt-6 text-white" style={notch('bottom')}>
          <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sale-600/35 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-white/[0.06] blur-2xl" />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]"
          />

          <button
            ref={closeRef}
            type="button"
            onClick={() => close()}
            aria-label={t('Tutup')}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:rotate-90 hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <TablerIcon name="x" size={18} stroke={2.4} />
          </button>

          <p className="relative inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 ring-1 ring-white/15">
            <TablerIcon name="sparkles" size={14} stroke={2} className="voucher-twinkle" />
            {t('Voucher spesial buat kamu')}
          </p>

          <div className="relative mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/50">{unitLabel}</p>
              <p ref={valueRef} className="origin-bottom-left leading-none">
                {voucher.type === 'FREE_SHIPPING' ? (
                  <span className="text-[3.25rem] font-extrabold tracking-tight">
                    {t('s/d')} {value.main}
                  </span>
                ) : (
                  <>
                    <span className="text-[5.25rem] font-extrabold tracking-[-0.05em]">{value.main}</span>
                    {value.unit && <span className="text-[3rem] font-extrabold text-sun-300">{value.unit}</span>}
                  </>
                )}
              </p>
            </div>
            <span aria-hidden="true" className="voucher-wiggle mb-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-cobalt-900 shadow-lg">
              <TablerIcon name="ticket" size={30} stroke={1.8} />
            </span>
          </div>

          <h2 id="voucher-popup-title" className="relative mt-3 text-[15px] font-semibold leading-6 text-white/85">
            {voucher.title || voucher.headline}
            {voucher.title && voucher.headline && voucher.title !== voucher.headline && (
              <span className="block text-sm font-normal text-white/60">{voucher.headline}</span>
            )}
          </h2>
        </div>

        {/* Bagian bawah tiket */}
        <div className="relative rounded-b-[28px] bg-surface px-6 pb-5 pt-6" style={notch('top')}>
          {/* Garis sobekan */}
          <span aria-hidden="true" className="absolute inset-x-6 top-0 border-t-2 border-dashed border-slate-200" />
          <button
            type="button"
            onClick={copyCode}
            className="voucher-shine group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl bg-mist px-4 py-3 text-left ring-1 ring-slate-200 transition hover:ring-ink"
            aria-label={t('Salin kode voucher {code}', { code: voucher.code })}
          >
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('Kode voucher')}</span>
              <span className="font-mono text-xl font-extrabold tracking-[0.18em] text-ink">{voucher.code}</span>
            </span>
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                copied ? 'bg-emerald-600 text-white' : 'bg-surface text-ink ring-1 ring-slate-200 group-hover:ring-ink'
              }`}
            >
              <TablerIcon name={copied ? 'check' : 'clipboard-list'} size={14} stroke={2.2} />
              {copied ? t('Tersalin') : t('Salin')}
            </span>
          </button>

          <ol className="mt-4 grid grid-cols-3 gap-2 text-center">
            {steps.map((s, i) => (
              <li key={s.icon} className="flex flex-col items-center gap-1.5">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-mist text-ink">
                  <TablerIcon name={s.icon} size={19} stroke={1.9} />
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-surface">
                    {i + 1}
                  </span>
                </span>
                <span className="text-[11.5px] font-semibold leading-4 text-slate-600">{s.text}</span>
              </li>
            ))}
          </ol>

          <details className="group mt-4 rounded-xl text-xs text-slate-500">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 font-semibold text-slate-600 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1.5">
                <TablerIcon name="clock" size={14} stroke={2} />
                {ends ? t('Berlaku sampai {d}', { d: ends }) : t('Syarat voucher')}
              </span>
              <span className="flex items-center gap-1">
                {t('Syarat')}
                <TablerIcon name="chevron-down" size={14} stroke={2.2} className="transition group-open:rotate-180" />
              </span>
            </summary>
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              {voucher.terms.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>

          <button
            ref={ctaRef}
            type="button"
            onClick={claim}
            className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-sale-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-sale-600/25 transition hover:bg-sale-700 active:scale-[0.98]"
          >
            {claimed ? (
              <>
                <TablerIcon name="circle-check" size={18} stroke={2.2} />
                {t('Voucher diklaim!')}
              </>
            ) : (
              <>
                {t('Klaim & belanja sekarang')}
                <TablerIcon name="arrow-right" size={17} stroke={2.4} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
          <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-slate-500">
            <button type="button" onClick={() => close()} className="px-2 py-1.5 hover:text-ink">
              {t('Nanti saja')}
            </button>
            {whatsappNumber && (
              <>
                <span aria-hidden="true">·</span>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${chatText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={remember}
                  className="px-2 py-1.5 hover:text-ink"
                >
                  {t('Tanya admin dulu')}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
