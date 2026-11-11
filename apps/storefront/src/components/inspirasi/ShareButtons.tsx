'use client';

import { useState } from 'react';

/** Bagikan artikel: WhatsApp, Facebook, X, salin link. */
export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-ink';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-bold text-slate-600">Bagikan</span>
      <a className={btn} href={`https://wa.me/?text=${enc(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Bagikan ke WhatsApp">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.4-.9-2.8-1.2-4.6-4-4.8-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.6-.1 1.2z" />
        </svg>
      </a>
      <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Bagikan ke Facebook">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14 8V6.5c0-.7.5-1 1-1h2V2h-3c-3 0-4 2-4 4.5V8H7.5v3.5H10V22h4V11.5h2.7L17 8z" />
        </svg>
      </a>
      <a className={btn} href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`} target="_blank" rel="noopener noreferrer" aria-label="Bagikan ke X">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z" />
        </svg>
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
        {copied ? 'Link tersalin ✓' : 'Salin link'}
      </button>
    </div>
  );
}
