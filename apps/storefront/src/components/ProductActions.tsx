'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import { getCompare, isWished, toggleCompare, toggleWish, COMPARE_MAX } from '@/lib/saved';

type Props = { id: number; name: string; image: string; price: number };

const btn =
  'inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink';

/** ♡ Simpan · ⇄ Bandingkan · Bagikan — di bawah tombol beli halaman produk. */
export default function ProductActions({ id, name, image, price }: Props) {
  const t = useT();
  const [wished, setWished] = useState(false);
  const [compare, setCompareList] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sync = () => {
      setWished(isWished(id));
      setCompareList(getCompare());
    };
    sync();
    window.addEventListener('saved-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('saved-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, [id]);

  const inCompare = compare.includes(id);

  async function share() {
    const url = `${window.location.origin}/produk/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `${name} di Urbanix Store`, url });
        return;
      }
    } catch {
      return; // dibatalkan pengguna
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${name}\n${url}`)}`, '_blank', 'noopener');
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={wished}
        onClick={() => setWished(toggleWish({ id, name, image, price }))}
        className={`${btn} ${wished ? 'border-ink bg-ink text-surface' : 'border-slate-300 text-ink hover:border-ink'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20s-7-4.4-9.2-8.6C1.4 8.6 3.1 5 6.6 5c2 0 3.3 1.1 4.1 2.3.4.6 1.2.6 1.6 0C13.1 6.1 14.4 5 16.4 5c3.5 0 5.2 3.6 3.8 6.4C19 15.6 12 20 12 20z" />
        </svg>
        {wished ? t('Tersimpan') : t('Simpan')}
      </button>

      <button
        type="button"
        aria-pressed={inCompare}
        onClick={() => setCompareList(toggleCompare(id))}
        className={`${btn} ${inCompare ? 'border-ink bg-mist text-ink' : 'border-slate-300 text-ink hover:border-ink'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 4v16M17 4v16M3 8h8M13 16h8" />
        </svg>
        {inCompare ? t('Dibandingkan') : t('Bandingkan')}
      </button>

      <button type="button" onClick={share} className={`${btn} border-slate-300 text-ink hover:border-ink`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
        </svg>
        {copied ? t('Link disalin') : t('Bagikan')}
      </button>

      {compare.length >= 2 && (
        <Link href={`/bandingkan?ids=${compare.join(',')}`} className="text-sm font-bold text-ink underline underline-offset-4">
          {t('Lihat perbandingan ({n}/{max})', { n: compare.length, max: COMPARE_MAX })}
        </Link>
      )}
      {compare.length === 1 && inCompare && (
        <span className="text-xs text-slate-500">{t('Pilih 1–2 produk lain untuk dibandingkan')}</span>
      )}
    </div>
  );
}
