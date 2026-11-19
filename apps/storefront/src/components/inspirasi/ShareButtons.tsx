'use client';

import { useState } from 'react';
import { Check } from '@/components/inspirasi/InspoIcons';
import { useT } from '@/components/LangProvider';
import SimpleIcon from '@/components/SimpleIcon';

/** Bagikan artikel: WhatsApp, Facebook, X, salin link. */
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-ink';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-bold text-slate-600">{t('Bagikan')}</span>
      <a className={btn} href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label={t('Bagikan ke WhatsApp')}>
        <SimpleIcon name="whatsapp" color="current" size={18} />
      </a>
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('Bagikan ke Facebook')}>
        <SimpleIcon name="facebook" color="current" size={18} />
      </a>
      <a className={btn} href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label={t('Bagikan ke X')}>
        <SimpleIcon name="x" color="current" size={16} />
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* abaikan */
          }
        }}
        className={`h-10 rounded-full px-4 text-sm font-bold ring-1 transition ${copied ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-surface text-ink ring-slate-200 hover:ring-ink'}`}
      >
        {copied ? <span className="inline-flex items-center gap-1">{t('Link tersalin')} <Check size={13} /></span> : t('Salin link')}
      </button>
    </div>
  );
}
