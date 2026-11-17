'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import type { Flash } from '@/lib/api';

/** Sisa waktu "HH:MM:SS" (hari dihitung ke jam). Kosong sampai halaman tampil agar tidak bentrok server/browser. */
export function useCountdown(endsAt: string | null | undefined) {
  const calc = () => {
    if (!endsAt) return null;
    const ms = new Date(endsAt).getTime() - Date.now();
    if (Number.isNaN(ms)) return null;
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  };
  const [parts, setParts] = useState<number[] | null>(null);
  useEffect(() => {
    setParts(calc());
    const timer = window.setInterval(() => setParts(calc()), 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt]);
  return parts;
}

/** Kotak angka hitung mundur: 02 : 15 : 09 */
export function Countdown({ endsAt, tone = 'dark' }: { endsAt: string | null | undefined; tone?: 'dark' | 'light' }) {
  const parts = useCountdown(endsAt);
  const t = useT();
  if (!endsAt) return null;
  const box = tone === 'dark' ? 'bg-white text-cobalt-900' : 'bg-ink text-surface';
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-extrabold tabular-nums" role="timer" aria-label={t('Sisa waktu')}>
      {(parts ?? [0, 0, 0]).map((n, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className={tone === 'dark' ? 'text-white/60' : 'text-slate-400'}>:</span>}
          <span className={`min-w-[1.9rem] rounded-md px-1.5 py-0.5 text-center ${box}`}>{parts ? String(n).padStart(2, '0') : '--'}</span>
        </span>
      ))}
    </span>
  );
}

/** Bar sisa kuota: "Tersisa 3" / "Segera habis" / "Habis". */
export function QuotaBar({ flash, tone = 'light' }: { flash: Flash; tone?: 'dark' | 'light' }) {
  const t = useT();
  if (flash.quota == null || flash.left == null) return null;
  const sold = Math.max(0, flash.quota - flash.left);
  const pct = flash.quota > 0 ? Math.min(100, Math.round((sold / flash.quota) * 100)) : 100;
  const label = flash.left <= 0 ? t('Habis') : flash.left <= Math.max(1, Math.ceil(flash.quota * 0.2)) ? t('Segera habis! Tersisa {n}', { n: flash.left }) : t('Tersisa {n}', { n: flash.left });
  return (
    <span className={`relative block h-5 overflow-hidden rounded-full ${tone === 'dark' ? 'bg-white/15' : 'bg-sale-50'}`}>
      <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sun-500 to-sale-600" style={{ width: `${Math.max(8, pct)}%` }} />
      <span className={`relative flex h-full items-center justify-center text-[11px] font-extrabold ${pct > 55 || tone === 'dark' ? 'text-white' : 'text-sale-600'}`}>{label}</span>
    </span>
  );
}

/** Pita flash sale di halaman produk: nama + hitung mundur + sisa kuota. */
export function FlashSaleStrip({ flash }: { flash: Flash }) {
  const t = useT();
  return (
    <div className="mb-3 overflow-hidden rounded-xl bg-cobalt-900 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-extrabold">
          <Bolt />
          {flash.name || t('Flash Sale')}
        </span>
        {flash.ends_at && (
          <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
            {t('Berakhir dalam')}
            <Countdown endsAt={flash.ends_at} />
          </span>
        )}
      </div>
      {flash.quota != null && (
        <div className="px-3 pb-3">
          <QuotaBar flash={flash} tone="dark" />
        </div>
      )}
    </div>
  );
}

export function Bolt({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flash-bolt text-sun-400">
      <path fill="currentColor" d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z" />
    </svg>
  );
}
