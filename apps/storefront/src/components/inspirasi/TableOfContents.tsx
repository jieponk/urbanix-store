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
  const pct = headings.length > 1 ? Math.round((idx / (headings.length - 1)) * 100) : 100;

  return (
    <nav aria-label="Daftar isi" className="sticky top-28 rounded-3xl bg-surface p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
          <ListIcon size={15} /> Daftar isi
        </p>
        <span className="text-[11px] font-bold tabular-nums text-slate-400">{pct}%</span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-mist">
        <div className="h-full rounded-full bg-gradient-to-r from-[#ff5b14] to-[#ffc93c] transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 max-h-[55vh] space-y-0.5 overflow-y-auto pr-1 text-sm">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? 'true' : undefined}
              className={`toc-link relative block rounded-lg py-1.5 pr-2 leading-snug text-slate-500 transition-colors hover:bg-mist hover:text-ink ${
                h.level === 3 ? 'pl-6 text-[13px]' : 'pl-3.5 font-semibold'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
