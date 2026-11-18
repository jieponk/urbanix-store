'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type FilterOption = { value: string; label: string };

/** Dropdown filter katalog (merek / rentang harga): mengganti satu parameter URL, filter lain tetap. */
export default function CatalogFilter({ param, value, options, label }: { param: string; value: string; options: FilterOption[]; label: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = Boolean(value);
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-label={label}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
        className={`appearance-none rounded-full border py-2 pl-4 pr-9 text-sm font-bold outline-none transition focus:ring-2 focus:ring-slate-200 ${
          active ? 'border-ink bg-ink text-surface' : 'border-slate-300 bg-surface text-ink hover:border-slate-500'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className={`pointer-events-none absolute right-3 ${active ? 'text-surface' : 'text-slate-500'}`} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}
