'use client';

import { useEffect, useState } from 'react';

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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z" />
        </svg>
      )}
    </button>
  );
}

/** Dijalankan di <head> sebelum halaman tampil, supaya tidak ada kedipan putih di mode gelap. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;
