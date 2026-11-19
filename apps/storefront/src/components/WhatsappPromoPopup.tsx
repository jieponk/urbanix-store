'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { loadMotion, prefersReducedMotion } from '@/lib/motion';
import { claimVoucher, type VoucherInfo } from '@/lib/vouchers';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';

const STORAGE_KEY = 'urbanix-wa-popup-closed';
const HIDE_DAYS = 3;
const DELAY_MS = 2500;

type Props = {
  percent: number;
  whatsappNumber: string;
  appliesToPromo: boolean;
  /** Voucher yang ditampilkan (voucher bercentang "Tampilkan di popup"). */
  voucher?: VoucherInfo | null;
};

function closedRecently() {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY));
    return at > 0 && Date.now() - at < HIDE_DAYS * 86400000;
  } catch {
    return false;
  }
}

/** Popup "Pesan via WhatsApp, hemat X%". Muncul sekali, lalu disembunyikan 3 hari setelah ditutup. */
export default function WhatsappPromoPopup({ percent, whatsappNumber, appliesToPromo, voucher }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  const backdrop = useRef<HTMLDivElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (closedRecently()) return;
    const reduced = prefersReducedMotion();
    // Library animasi dimuat selama jeda 2,5 detik, jadi tidak membebani loading halaman.
    if (!reduced) loadMotion().catch(() => {});
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Muncul dengan efek pegas lembut. useLayoutEffect: gaya awal dipasang sebelum digambar (tanpa kedip).
  useLayoutEffect(() => {
    const box = dialog.current;
    const bg = backdrop.current;
    if (!open || !box || !bg || prefersReducedMotion()) return;
    box.style.opacity = '0';
    bg.style.opacity = '0';
    let cancelled = false;
    loadMotion()
      .then(({ animate }) => {
        if (cancelled) return;
        animate(bg, { opacity: [0, 1] }, { duration: 0.2, ease: 'easeOut' });
        animate(
          box,
          { opacity: [0, 1], y: [28, 0], scale: [0.96, 1] },
          { type: 'spring', bounce: 0.3, visualDuration: 0.45, opacity: { duration: 0.2, ease: 'easeOut' } }
        );
      })
      .catch(() => {
        // Gagal memuat library: tampilkan saja tanpa animasi.
        box.style.opacity = '';
        bg.style.opacity = '';
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* browser tanpa penyimpanan: popup bisa muncul lagi, tidak masalah */
    }
  }

  function startShopping() {
    if (voucher) claimVoucher(voucher.code);
    close();
    document.getElementById('produk-pilihan')?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!open) return null;

  const chatText = encodeURIComponent(
    `Halo admin URBANIX, saya mau pesan via WhatsApp dengan diskon ${percent}%. Bisa dibantu?`
  );

  return (
    <div ref={backdrop} className="fixed inset-0 z-[60] flex items-end justify-center bg-cobalt-900/60 p-3 sm:items-center" onClick={close}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-2xl"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label={t('Tutup')}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:rotate-90 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <TablerIcon name="x" size={18} stroke={2.5} />
        </button>

        <div className="relative bg-cobalt-900 px-6 pb-6 pt-7">
          <p className="text-sm font-bold text-white/70">{t('Khusus pesan lewat WhatsApp')}</p>
          <p className="mt-1 flex items-end gap-2 leading-none text-white">
            <span className="text-[5.5rem] font-extrabold tracking-[-0.06em] text-sun-300">{percent}%</span>
            <span className="pb-3 text-lg font-extrabold">{t('lebih hemat')}</span>
          </p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h2 id="wa-popup-title" className="text-xl font-extrabold tracking-tight text-ink">
            {t('Pesan via WhatsApp, potongan {n}% langsung terhitung', { n: percent })}
          </h2>
          {voucher && (
            <p className="mt-3 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 text-sm">
              <span className="text-slate-500">{t('Kode voucher')}</span>
              <b className="tracking-wider text-ink">{voucher.code}</b>
            </p>
          )}
          <ol className="mt-4 space-y-2.5 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-surface">1</span>
              {t('Masukkan produk ke keranjang.')}
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-surface">2</span>
              {t('Di halaman checkout, pilih')} <b className="text-ink">{t('Pesan via WhatsApp')}</b>.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-surface">3</span>
              {voucher ? t('Pakai voucher di checkout, lalu kirim chat pesanan ke admin.') : t('Kirim chat pesanan ke admin. Totalnya sudah dipotong {n}%.', { n: percent })}
            </li>
          </ol>
          {voucher ? (
            <ul className="mt-4 list-disc space-y-0.5 pl-4 text-xs text-slate-500">
              {voucher.terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : (
            !appliesToPromo && (
              <p className="mt-4 text-xs text-slate-500">{t('Tidak berlaku untuk produk yang sedang ikut promo potong harga.')}</p>
            )
          )}

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={startShopping}
              className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-slate-800"
            >
              {voucher ? t('Klaim & mulai belanja') : t('Mulai belanja')}
            </button>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${chatText}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="rounded-full border-2 border-ink px-5 py-2.5 text-center text-sm font-bold text-ink hover:bg-mist"
            >
              {t('Tanya admin dulu')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
