'use client';

import { useEffect, useState } from 'react';
import { ListIcon } from '@/components/inspirasi/InspoIcons';
import { useT } from '@/components/LangProvider';

type Heading = { id: string; text: string; level: number };

/** Daftar isi yang menandai bagian yang sedang dibaca (desktop: menempel di samping). */
export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const t = useT();
  const [active, setActive] = useState(headings[0]?.id || '');

  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-110px 0px -65% 0px', threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  const idx = Math.max(0, headings.findIndex((h) => h.id === active));
  const pct = headings.length > 1 ? Math.round(((idx + 1) / headings.length) * 100) : 100;

  return (
    // Tidak sticky sendiri: wadahnya (aside) yang menempel, supaya tombol di bawahnya ikut & tidak tertimpa.
    <nav aria-label={t('Daftar isi')} className="flex min-h-0 flex-col border-t-[3px] border-ink pt-4">
      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-ink">
        <ListIcon size={15} /> {t('Daftar isi')}
      </p>
      <div className="mt-3 h-0.5 shrink-0 bg-slate-200">
        <div className="h-full bg-ed transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="toc-scroll mt-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {headings.map((h) => {
          const sub = h.level === 3;
          const on = active === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={on ? 'true' : undefined}
                className={`relative block border-l-2 py-2 pl-3.5 leading-snug transition-colors ${sub ? 'ml-3 text-[13px]' : 'text-sm font-semibold'} ${
                  on ? 'border-ed text-ink' : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-ink'
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
