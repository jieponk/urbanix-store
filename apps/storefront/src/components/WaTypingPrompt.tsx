'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import SimpleIcon from '@/components/SimpleIcon';

export type WaQuestion = { label: string; message: string };

/**
 * Kolom chat yang "mengetik" pertanyaan contoh bergantian (gaya D).
 * Seluruh kolom bisa diketuk: membuka WhatsApp admin dengan pertanyaan yang sedang tampil.
 * Bila pembeli mematikan animasi di HP-nya: tanpa efek ketik, pertanyaan cukup berganti tiap 3 detik.
 */
export default function WaTypingPrompt({ whatsappNumber, questions }: { whatsappNumber: string; questions: WaQuestion[] }) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(questions[0]?.label ?? '');
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!questions.length || paused) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setShown(questions[index].label);
      const id = window.setTimeout(() => setIndex((i) => (i + 1) % questions.length), 3000);
      return () => window.clearTimeout(id);
    }
    const full = questions[index].label;
    let n = 0;
    let deleting = false;
    let timer = 0;
    const tick = () => {
      if (!deleting) {
        n += 1;
        setShown(full.slice(0, n));
        if (n >= full.length) {
          deleting = true;
          timer = window.setTimeout(tick, 1800); // tahan sebentar supaya terbaca
          return;
        }
        timer = window.setTimeout(tick, 65);
      } else {
        n -= 1;
        setShown(full.slice(0, n));
        if (n <= 0) {
          setIndex((i) => (i + 1) % questions.length);
          return;
        }
        timer = window.setTimeout(tick, 28);
      }
    };
    timer = window.setTimeout(tick, 250);
    return () => window.clearTimeout(timer);
  }, [index, paused, questions]);

  if (!questions.length) return null;
  const current = questions[index];

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-white/60">{t('Tanya aja, misalnya:')}</p>
      <a
        href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(current.message)}`}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        aria-label={t('Chat admin: {q}', { q: current.label })}
        className="group mt-2 flex h-12 max-w-md items-center gap-2.5 rounded-full bg-white pl-4 pr-1.5 text-cobalt-900 shadow-lg shadow-black/20 transition hover:scale-[1.01]"
      >
        <SimpleIcon name="whatsapp" size={20} />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold" aria-hidden="true">
          {shown}
          <span className="wa-caret ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] bg-cobalt-900" />
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition group-hover:translate-x-0.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </a>
    </div>
  );
}
