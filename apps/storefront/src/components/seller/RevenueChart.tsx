'use client';

import { useState } from 'react';
import { rp, shortRp } from '@/lib/seller';

type Point = { date: string; revenue: number; orders: number };

/** Grafik batang omzet per hari: satu warna, batang tipis, tooltip saat disentuh/hover. */
export default function RevenueChart({ series }: { series: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((p) => p.revenue));
  const ticks = [max, max / 2, 0];
  const W = 100 / Math.max(1, series.length);
  const label = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const step = Math.ceil(series.length / 6);
  const point = hover !== null ? series[hover] : null;

  if (series.every((p) => p.revenue === 0)) {
    return <p className="py-12 text-center text-sm text-slate-500">Belum ada omzet di periode ini.</p>;
  }

  return (
    <div>
      <div className="relative flex h-48 gap-2">
        <div className="flex w-12 shrink-0 flex-col justify-between pb-5 text-right text-[10px] text-slate-500">
          {ticks.map((t, i) => <span key={i}>{t === 0 ? '0' : shortRp(t).replace('Rp', '')}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-5 flex flex-col justify-between">
            {ticks.map((_, i) => <div key={i} className="border-t border-dashed border-slate-200" />)}
          </div>
          <div className="absolute inset-x-0 top-0 bottom-5 flex items-end" onMouseLeave={() => setHover(null)}>
            {series.map((p, i) => (
              <button
                key={p.date}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onClick={() => setHover(i)}
                aria-label={`${label(p.date)}: ${rp(p.revenue)}, ${p.orders} pesanan`}
                className="flex h-full items-end justify-center px-[1px]"
                style={{ width: `${W}%` }}
              >
                <span
                  className={`block w-full max-w-[18px] rounded-t-[4px] transition-colors ${
                    hover === i ? 'bg-brand-500' : 'bg-cobalt-700 dark:bg-sky-400'
                  }`}
                  style={{ height: `${p.revenue ? Math.max(2, (p.revenue / max) * 100) : 0}%` }}
                />
              </button>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-5 items-end">
            {series.map((p, i) => (
              <span key={p.date} className="text-center text-[10px] text-slate-500" style={{ width: `${W}%` }}>
                {i % step === 0 ? label(p.date) : ''}
              </span>
            ))}
          </div>
          {point && hover !== null && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-surface shadow-lg"
              style={{ left: `${(hover + 0.5) * W}%` }}
            >
              <b>{label(point.date)}</b> · {rp(point.revenue)} · {point.orders} pesanan
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
