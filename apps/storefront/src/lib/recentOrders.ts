/** Nomor pesanan terakhir yang dibuat/dibuka di perangkat ini (localStorage, maks. 5). */
const KEY = 'urbanix_recent_orders';

export type RecentOrder = { no: string; at: string };

export function getRecentOrders(): RecentOrder[] {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(data) ? data.filter((o) => o && typeof o.no === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberOrder(no: string) {
  try {
    const list = [{ no, at: new Date().toISOString() }, ...getRecentOrders().filter((o) => o.no !== no)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
}

export function forgetOrder(no: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(getRecentOrders().filter((o) => o.no !== no)));
  } catch {
    /* abaikan */
  }
}

/** Terima nomor pesanan atau link halaman pesanan yang ditempel pembeli. */
export function normalizeOrderNumber(input: string): string {
  const text = input.trim();
  const fromUrl = text.match(/\/pesanan\/([A-Za-z0-9-]+)/);
  return (fromUrl ? fromUrl[1] : text).replace(/\s+/g, '').toUpperCase();
}
