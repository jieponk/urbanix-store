'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Props = {
  name: string;
  maxDiscount: number;
  count: number;
  endsAt: string | null;
};

function remaining(endsAt: string | null) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/**
 * Panel promo bergaya layar LCD kamera: nama promo, diskon terbesar,
 * dan hitung mundur sungguhan sampai promo berakhir.
 */
export default function PromoCountdown({ name, maxDiscount, count, endsAt }: Props) {
  // Dihitung setelah halaman tampil agar angka server & browser tidak bentrok.
  const [time, setTime] = useState<ReturnType<typeof remaining>>(null);

  useEffect(() => {
    setTime(remaining(endsAt));
    const timer = window.setInterval(() => setTime(remaining(endsAt)), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const units = time
    ? [
        { value: time.days, label: 'hari' },
        { value: time.hours, label: 'jam' },
        { value: time.minutes, label: 'menit' },
        { value: time.seconds, label: 'detik' },
      ]
    : null;

  return (
    <section
      aria-label={`${name}, hemat sampai ${maxDiscount}%`}
      className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-cobalt-800 p-5 text-white sm:p-6"
    >
      {/* Sudut jendela bidik kamera */}
      <span className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-white/30" aria-hidden="true" />
      <span className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-white/30" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-white/30" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-white/30" aria-hidden="true" />

      <p className="flex items-center gap-2 text-sm font-semibold text-sun-300">
        <span className="h-2 w-2 rounded-full bg-sale-600 shadow-[0_0_0_3px_rgba(229,36,59,0.35)]" aria-hidden="true" />
        {name} sedang berjalan
      </p>

      <p className="mt-3 leading-none">
        <span className="block text-base font-semibold text-white/80">Hemat sampai</span>
        <span className="mt-1 block text-[clamp(4rem,11vw,6.5rem)] font-extrabold tracking-[-0.06em] text-sun-400">
          {maxDiscount}%
        </span>
      </p>

      {units && (
        <div className="mt-4">
          <p className="text-xs font-medium text-white/70">Berakhir dalam</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5" role="timer" aria-live="off">
            {units.map((unit) => (
              <div key={unit.label} className="rounded-xl bg-cobalt-900 px-1 py-2 text-center ring-1 ring-white/10">
                <span key={unit.value} className="tick block text-2xl font-extrabold tabular-nums text-sun-400 sm:text-[28px]">
                  {String(unit.value).padStart(2, '0')}
                </span>
                <span className="block text-[11px] text-white/60">{unit.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <p className="text-sm text-white/80">{count} produk ikut promo</p>
        <Link
          href="/produk?promo=1"
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
        >
          Lihat semua promo
        </Link>
      </div>
    </section>
  );
}
