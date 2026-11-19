'use client';

import { useEffect, useState } from 'react';
import TablerIcon from '@/components/TablerIcon';

const KEY = 'urbanix-theme';

/** Tombol mode terang/gelap. Pilihan disimpan di browser; awalnya mengikuti pengaturan perangkat. */
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    setDark(next);
    try {
      localStorage.setItem(KEY, next ? 'dark' : 'light');
    } catch {
      /* penyimpanan tidak tersedia: pilihan hanya berlaku di halaman ini */
    }
  }

  const label = dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition hover:bg-mist"
    >
      {dark ? (
        <TablerIcon name="sun" size={20} />
      ) : (
        <TablerIcon name="moon" size={20} />
      )}
    </button>
  );
}

/** Dijalankan di <head> sebelum halaman tampil, supaya tidak ada kedipan putih di mode gelap. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;
