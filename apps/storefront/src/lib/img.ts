/**
 * Gambar produk dari CDN Shopee berukuran asli (±1024 px, ratusan KB).
 * CDN Shopee bisa mengirim versi kecil WebP: tambahkan "@resize_w{lebar}_nl.webp".
 * URL selain Shopee dikembalikan apa adanya.
 */
export function productImg(url: string | null | undefined, width = 450): string {
  if (!url) return '';
  if (!/^https?:\/\/[^/]*(shopee\.co\.id|susercontent\.com)\/file\/[^/?@]+$/.test(url)) return url;
  return `${url}@resize_w${width}_nl.webp`;
}
