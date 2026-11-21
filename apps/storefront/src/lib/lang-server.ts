import { cookies } from 'next/headers';
import { LANG_COOKIE, type Lang, translator } from '@/lib/i18n';

/** Bahasa pilihan pengunjung dari cookie (server). Default Bahasa Indonesia. */
export function getLang(): Lang {
  try {
    return cookies().get(LANG_COOKIE)?.value === 'en' ? 'en' : 'id';
  } catch {
    return 'id'; // di luar permintaan (mis. saat build)
  }
}

/** Fungsi terjemah untuk Server Component: `const t = getT(); t('Keranjang')`. */
export function getT() {
  return translator(getLang());
}
