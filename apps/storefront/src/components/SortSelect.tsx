'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/components/LangProvider';
import TablerIcon from '@/components/TablerIcon';

export type SortOption = { value: string; label: string };

/** Dropdown "Urutkan" untuk katalog: mengganti ?urut= tanpa menghapus filter lain. */
export default function SortSelect({ options, value }: { options: SortOption[]; value: string }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <label className="relative inline-flex items-center gap-2 text-sm">
      <span className="hidden font-semibold text-slate-500 sm:inline">{t('Urutkan')}</span>
      <span className="pointer-events-none absolute left-3 text-slate-500 sm:hidden" aria-hidden="true">
        <TablerIcon name="sort-descending" size={16} />
      </span>
      <select
        value={value}
        aria-label={t('Urutkan produk')}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set('urut', e.target.value);
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className="appearance-none rounded-full border border-slate-300 bg-surface py-2 pl-9 pr-9 text-sm font-bold text-ink outline-none transition hover:border-slate-500 focus:border-ink focus:ring-2 focus:ring-slate-200 sm:pl-4"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-slate-500" aria-hidden="true">
        <TablerIcon name="chevron-down" size={14} stroke={2.4} />
      </span>
    </label>
  );
}
