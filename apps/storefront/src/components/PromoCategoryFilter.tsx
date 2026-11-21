'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';

type Option = { id: string; name: string; count: number; max: number; href: string };

/**
 * Dropdown "Kategori promo": satu tombol ringkas, isinya daftar kategori yang sedang diskon
 * lengkap dengan jumlah produk dan diskon terbesar ("s/d 15%").
 */
export default function PromoCategoryFilter({ options, selected }: { options: Option[]; selected: string }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === selected) ?? options[0];

  useEffect(() => setOpen(false), [pathname, selected]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative mt-5 w-full sm:w-80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex w-full items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-left transition-colors ${
          open ? 'border-ink' : 'border-slate-200 hover:border-slate-400'
        }`}
      >
        <TablerIcon name="filter" size={18} className="shrink-0 text-slate-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('Kategori promo')}</span>
          <span className="block truncate text-sm font-bold text-ink">{current.name}</span>
        </span>
        <TablerIcon name="chevron-down" size={18} stroke={2.2} className={`shrink-0 text-ink transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <ul
        role="listbox"
        aria-label={t('Kategori promo')}
        className={`absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] origin-top overflow-y-auto rounded-xl border border-slate-200 bg-surface py-1.5 shadow-xl transition duration-150 ${
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
        }`}
      >
        {options.map((o) => {
          const on = o.id === current.id;
          return (
            <li key={o.id || 'all'} role="option" aria-selected={on}>
              <Link
                href={o.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-mist ${on ? 'font-bold text-ink' : 'text-slate-700'}`}
              >
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                <span className="text-xs text-slate-400">{o.count}</span>
                <TablerIcon name="check" size={16} stroke={2.5} className={`shrink-0 ${on ? 'text-ink' : 'invisible'}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
