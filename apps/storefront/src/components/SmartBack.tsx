'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeftIcon } from '@/components/Icons';
import { useT } from '@/components/LangProvider';
import { getLastProduct, type LastProduct } from '@/lib/lastProduct';

/**
 * Tombol kembali ke produk terakhir yang dilihat pembeli (bukan ke beranda).
 * Bila belum ada produk yang dibuka di tab ini → ke `fallback` (default: daftar produk).
 */
export default function SmartBack({ fallback = '/produk', fallbackLabel }: { fallback?: string; fallbackLabel?: string }) {
  const t = useT();
  const [last, setLast] = useState<LastProduct | null>(null);

  useEffect(() => setLast(getLastProduct()), []);

  const href = last?.href || fallback;
  const label = last ? t('Kembali ke {name}', { name: last.name }) : fallbackLabel || t('Lanjut belanja');

  return (
    <Link
      href={href}
      className="inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pr-3 text-sm font-semibold text-slate-600 transition hover:text-ink"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-slate-200">
        <ArrowLeftIcon size={16} />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
