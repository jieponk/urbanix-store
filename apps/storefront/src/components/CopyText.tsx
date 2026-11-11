'use client';

import { useEffect, useState } from 'react';
import { rememberOrder } from '@/lib/recentOrders';

/** Tombol salin teks (nomor pesanan, resi). `remember` menyimpan nomor pesanan di perangkat ini. */
export default function CopyText({ text, label = 'Salin', remember = false, className = '' }: { text: string; label?: string; remember?: boolean; className?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (remember) rememberOrder(text);
  }, [remember, text]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard tidak diizinkan */
        }
      }}
      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ring-1 transition ${done ? 'bg-emerald-700 text-white ring-emerald-700' : 'text-ink ring-slate-200 hover:ring-ink'} ${className}`}
    >
      {done ? 'Tersalin ✓' : label}
    </button>
  );
}
