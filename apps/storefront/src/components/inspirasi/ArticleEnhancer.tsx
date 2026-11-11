'use client';

import { useEffect } from 'react';

/** Tambahan interaktif untuk isi artikel: tombol "Salin" di blok kode & spoiler yang tetap terbuka setelah diketuk. */
export default function ArticleEnhancer({ targetId, deps = '' }: { targetId: string; deps?: string }) {
  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const added: HTMLElement[] = [];
    root.querySelectorAll<HTMLElement>('.code-block').forEach((block) => {
      if (block.querySelector('.code-copy')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy';
      btn.textContent = 'Salin';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(block.querySelector('code')?.textContent || '');
          btn.textContent = 'Tersalin ✓';
          setTimeout(() => (btn.textContent = 'Salin'), 1600);
        } catch {
          btn.textContent = 'Gagal';
        }
      });
      block.querySelector('figcaption')?.appendChild(btn);
      added.push(btn);
    });
    const onSpoiler = (e: Event) => {
      const el = (e.target as HTMLElement).closest?.('.spoiler') as HTMLElement | null;
      if (el && (e.type === 'click' || (e as KeyboardEvent).key === 'Enter')) {
        el.style.background = 'rgb(var(--mist))';
        el.style.color = 'inherit';
      }
    };
    root.addEventListener('click', onSpoiler);
    root.addEventListener('keydown', onSpoiler);
    return () => {
      added.forEach((b) => b.remove());
      root.removeEventListener('click', onSpoiler);
      root.removeEventListener('keydown', onSpoiler);
    };
  }, [targetId, deps]);
  return null;
}
