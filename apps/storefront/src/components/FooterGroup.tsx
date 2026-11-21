'use client';

import { useId, useState, type ReactNode } from 'react';
import TablerIcon from '@/components/TablerIcon';

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
          <TablerIcon name="chevron-down" size={18} stroke={2.2} className={`text-white/60 transition-transform duration-300 md:hidden ${open ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={id} className={`${open ? 'block' : 'hidden'} pb-4 md:mt-4 md:block md:pb-0`}>
        {children}
      </div>
    </div>
  );
}
