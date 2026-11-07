'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'urbanix-wa-popup-closed';
const HIDE_DAYS = 3;
const DELAY_MS = 2500;

type Props = {
  percent: number;
  whatsappNumber: string;
  appliesToPromo: boolean;
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
export default function WhatsappPromoPopup({ percent, whatsappNumber, appliesToPromo }: Props) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (closedRecently()) return;
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

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
    close();
    document.getElementById('produk-pilihan')?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!open) return null;

  const chatText = encodeURIComponent(
    `Halo admin URBANIX, saya mau pesan via WhatsApp dengan diskon ${percent}%. Bisa dibantu?`
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-cobalt-900/60 p-3 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-popup-title"
        onClick={(e) => e.stopPropagation()}
        className="popup-in relative w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={close}
          aria-label="Tutup"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl text-ink hover:bg-white"
        >
          ×
        </button>

        <div className="relative bg-sun-400 px-6 pb-6 pt-7">
          <p className="text-sm font-bold text-cobalt-800">Khusus pesan lewat WhatsApp</p>
          <p className="mt-1 flex items-end gap-2 leading-none text-cobalt-900">
            <span className="text-[5.5rem] font-extrabold tracking-[-0.06em]">{percent}%</span>
            <span className="pb-3 text-lg font-extrabold">lebih hemat</span>
          </p>
        </div>

        <div className="px-6 pb-6 pt-5">
          <h2 id="wa-popup-title" className="text-xl font-extrabold tracking-tight text-ink">
            Pesan via WhatsApp, potongan {percent}% langsung terhitung
          </h2>
          <ol className="mt-4 space-y-2.5 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobalt-800 text-xs font-bold text-white">1</span>
              Masukkan produk ke keranjang.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobalt-800 text-xs font-bold text-white">2</span>
              Di halaman checkout, pilih <b className="text-ink">Pesan via WhatsApp</b>.
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cobalt-800 text-xs font-bold text-white">3</span>
              Kirim chat pesanan ke admin. Totalnya sudah dipotong {percent}%.
            </li>
          </ol>
          {!appliesToPromo && (
            <p className="mt-4 text-xs text-slate-500">Tidak berlaku untuk produk yang sedang ikut promo potong harga.</p>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={startShopping}
              className="rounded-full bg-brand-500 px-5 py-3 text-sm font-bold text-white hover:bg-brand-600"
            >
              Mulai belanja
            </button>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${chatText}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="rounded-full border-2 border-cobalt-800 px-5 py-2.5 text-center text-sm font-bold text-cobalt-800 hover:bg-mist"
            >
              Tanya admin dulu
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
