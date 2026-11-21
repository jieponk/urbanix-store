import { findPublicImage } from '@/lib/assets';
import { SHIPPING_BRANDS, type LogoKey } from '@/lib/shipping';

/**
 * Logo kurir yang tersedia di public/couriers (hanya di server). Kosong = tampil sebagai teks.
 * `mono` = versi abu-abu (<logo>-mono.webp) untuk footer gelap.
 */
export function courierLogos(variant: 'color' | 'mono' = 'color'): Partial<Record<LogoKey, string>> {
  const out: Partial<Record<LogoKey, string>> = {};
  for (const b of SHIPPING_BRANDS) {
    const src = findPublicImage('couriers', variant === 'mono' ? `${b.logo}-mono` : b.logo);
    if (src) out[b.logo] = src;
  }
  return out;
}
