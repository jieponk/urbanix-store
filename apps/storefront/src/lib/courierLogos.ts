import { findPublicImage } from '@/lib/assets';
import { COURIERS, type CourierKey } from '@/lib/shipping';

/** Logo kurir yang tersedia di public/couriers (hanya di server). Kosong = tampil sebagai teks. */
export function courierLogos(): Partial<Record<CourierKey, string>> {
  const out: Partial<Record<CourierKey, string>> = {};
  for (const c of COURIERS) {
    const src = findPublicImage('couriers', c.key);
    if (src) out[c.key] = src;
  }
  return out;
}
