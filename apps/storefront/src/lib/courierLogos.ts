import { findPublicImage } from '@/lib/assets';
import { SHIPPING_BRANDS, type LogoKey } from '@/lib/shipping';

/** Logo kurir yang tersedia di public/couriers (hanya di server). Kosong = tampil sebagai teks. */
export function courierLogos(): Partial<Record<LogoKey, string>> {
  const out: Partial<Record<LogoKey, string>> = {};
  for (const b of SHIPPING_BRANDS) {
    const src = findPublicImage('couriers', b.logo);
    if (src) out[b.logo] = src;
  }
  return out;
}
