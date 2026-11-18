/**
 * Gambar produk dari CDN Shopee berukuran asli (±1024 px, ratusan KB).
 * CDN Shopee bisa mengirim versi kecil WebP: tambahkan "@resize_w{lebar}_nl.webp".
 * Foto yang sudah disalin ke server sendiri memakai versi -450.webp untuk ukuran kecil.
 * URL lain dikembalikan apa adanya.
 */
export function productImg(url: string | null | undefined, width = 450): string {
  if (!url) return '';
  // Foto yang sudah disalin ke server sendiri (perintah salin_gambar): ada versi 450 px untuk kartu.
  if (/\/media\/products\/\d+\/[0-9a-f]{12}\.webp$/.test(url)) return width <= 480 ? url.replace(/\.webp$/, '-450.webp') : url;
  if (!/^https?:\/\/[^/]*(shopee\.co\.id|susercontent\.com)\/file\/[^/?@]+$/.test(url)) return url;
  return `${url}@resize_w${width}_nl.webp`;
}
