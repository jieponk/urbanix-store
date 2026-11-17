'use client';

import { useEffect, useState } from 'react';
import { ListIcon } from '@/components/inspirasi/InspoIcons';

type Heading = { id: string; text: string; level: number };

/** Daftar isi yang menandai bagian yang sedang dibaca (desktop: menempel di samping). */
export default function TableOfContents({ headings }: { headings: Heading[] }) {
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
  let n = 0;

  return (
    <nav aria-label="Daftar isi" className="sticky top-28 border-t-[3px] border-ink pt-4">
      <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-ink">
        <ListIcon size={15} /> Daftar isi
      </p>
      <div className="mt-3 h-0.5 bg-slate-200">
        <div className="h-full bg-ed transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-2 max-h-[60vh] overflow-y-auto pr-1">
        {headings.map((h) => {
          const sub = h.level === 3;
          if (!sub) n += 1;
          const on = active === h.id;
          return (
            <li key={h.id} className={sub ? '' : 'border-b border-slate-200 last:border-0'}>
              <a
                href={`#${h.id}`}
                aria-current={on ? 'true' : undefined}
                className={`group flex gap-3 py-2.5 leading-snug transition-colors ${sub ? 'pl-8 pt-0 text-[13px]' : 'text-sm font-semibold'} ${
                  on ? 'text-ink' : 'text-slate-500 hover:text-ink'
                }`}
              >
                {!sub && (
                  <span className={`w-5 shrink-0 text-xs font-extrabold tabular-nums leading-5 ${on ? 'text-ed' : 'text-slate-400'}`}>
                    {String(n).padStart(2, '0')}
                  </span>
                )}
                <span className={on ? 'underline decoration-ed decoration-2 underline-offset-4' : ''}>{h.text}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
