'use client';

import { useId, useState, type ReactNode } from 'react';

/**
 * Kelompok tautan footer.
 * HP: lipat-buka (judul + panah) supaya footer tidak terlalu panjang. PC: selalu terbuka sebagai kolom.
 */
export default function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="border-b border-white/10 md:border-0">
      <h2 className="text-sm font-bold text-white">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between py-4 text-left md:pointer-events-none md:cursor-default md:py-0"
        >
          {title}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`text-white/60 transition-transform duration-300 md:hidden ${open ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      <div id={id} className={`${open ? 'block' : 'hidden'} pb-4 md:mt-4 md:block md:pb-0`}>
        {children}
      </div>
    </div>
  );
}
