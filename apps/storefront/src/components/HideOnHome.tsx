'use client';

import { usePathname } from 'next/navigation';

/** Sembunyikan isi di beranda (mis. deretan merek di atas footer, karena beranda sudah punya Brand Corner). */
export default function HideOnHome({ children }: { children: React.ReactNode }) {
  return usePathname() === '/' ? null : <>{children}</>;
}
