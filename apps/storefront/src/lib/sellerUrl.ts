/**
 * Seller Center tinggal di subdomain sendiri: https://seller.urbanix.id (bukan urbanix.id/seller).
 *
 * Halaman tetap berada di folder app/seller; middleware me-rewrite seller.urbanix.id/pesanan → /seller/pesanan
 * dan menutup urbanix.id/seller/... (404). Di kode, link tetap ditulis '/seller/...'
 * lalu dibungkus sellerHref() supaya alamat yang tampil di browser bersih.
 *
 * Hanya aktif di build produksi (npm run build); saat `npm run dev` Seller Center tetap di localhost:3000/seller.
 */
export const SELLER_SUBDOMAIN = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SELLER_SUBDOMAIN !== 'off';

/** Awalan host Seller Center. */
export const SELLER_HOST_PREFIX = 'seller.';

/** '/seller/pesanan?x=1' → '/pesanan?x=1' (subdomain aktif); '/seller' → '/'. */
export function sellerHref(path: string): string {
  if (!SELLER_SUBDOMAIN) return path;
  const stripped = path.replace(/^\/seller(?=\/|\?|#|$)/, '');
  return !stripped || /^[?#]/.test(stripped) ? `/${stripped}` : stripped;
}

/** Path di address bar Seller Center → path internal '/seller/...'. */
export function toSellerPath(pathname: string): string {
  if (!SELLER_SUBDOMAIN || pathname === '/seller' || pathname.startsWith('/seller/')) return pathname;
  return pathname === '/' || pathname === '' ? '/seller' : `/seller${pathname}`;
}

/** Alamat toko utama (dipakai link "Lihat di toko" dari Seller Center). */
export const SHOP_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://urbanix.id').replace(/\/+$/, '');

/** Link halaman toko dari dalam Seller Center: di subdomain harus alamat lengkap urbanix.id. */
export function shopHref(path: string): string {
  return SELLER_SUBDOMAIN && path.startsWith('/') ? `${SHOP_URL}${path}` : path;
}
