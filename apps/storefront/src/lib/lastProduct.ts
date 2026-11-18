/**
 * Produk terakhir yang dibuka pembeli (hanya di tab ini, sessionStorage).
 * Dipakai tombol "Kembali" di keranjang & checkout supaya pembeli tidak terlempar ke beranda.
 */
export type LastProduct = { href: string; name: string };

const KEY = 'urbanix-last-product';

export function rememberProduct(p: LastProduct) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ href: p.href, name: p.name.slice(0, 120) }));
  } catch {
    /* mode privat / penyimpanan penuh */
  }
}

export function getLastProduct(): LastProduct | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (raw && typeof raw.href === 'string' && raw.href.startsWith('/produk/') && typeof raw.name === 'string') return raw;
  } catch {
    /* abaikan */
  }
  return null;
}
