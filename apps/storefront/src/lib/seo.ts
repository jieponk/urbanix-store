/** Alamat publik situs (untuk sitemap, RSS, canonical, Open Graph). Di server diisi lewat env SITE_URL. */
export const SITE_URL = (process.env.SITE_URL || 'https://urbanix.id').replace(/\/+$/, '');

/** Teks polos dari deskripsi produk (tanpa HTML/spasi berlebih), dipotong untuk meta description. */
export function plainText(text: string | null | undefined, max = 160) {
  const clean = (text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
