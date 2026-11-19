'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import { getCompare, isWished, toggleCompare, toggleWish, COMPARE_MAX } from '@/lib/saved';
import TablerIcon from '@/components/TablerIcon';

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
        <TablerIcon name="heart" size={18} filled={wished} />
        {wished ? t('Tersimpan') : t('Simpan')}
      </button>

      <button
        type="button"
        aria-pressed={inCompare}
        onClick={() => setCompareList(toggleCompare(id))}
        className={`${btn} ${inCompare ? 'border-ink bg-mist text-ink' : 'border-slate-300 text-ink hover:border-ink'}`}
      >
        <TablerIcon name="arrows-left-right" size={18} />
        {inCompare ? t('Dibandingkan') : t('Bandingkan')}
      </button>

      <button type="button" onClick={share} className={`${btn} border-slate-300 text-ink hover:border-ink`}>
        <TablerIcon name="share" size={18} />
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
