/**
 * Disimpan di perangkat pembeli (localStorage): wishlist (♡ Simpan) & daftar bandingkan (maks. 3).
 * Event "saved-updated" dikirim supaya tombol & ikon header ikut berubah.
 */
export type SavedItem = { id: number; name: string; image: string; price: number; savedAt: number };

const WISH = 'urbanix-wishlist';
const COMPARE = 'urbanix-compare';
export const COMPARE_MAX = 3;

function read<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event('saved-updated'));
  } catch {
    /* mode privat / penuh */
  }
}

export function getWishlist(): SavedItem[] {
  const list = read<SavedItem[]>(WISH, []);
  return Array.isArray(list) ? list.filter((i) => i && typeof i.id === 'number') : [];
}
export function isWished(id: number) {
  return getWishlist().some((i) => i.id === id);
}
export function toggleWish(item: Omit<SavedItem, 'savedAt'>): boolean {
  const list = getWishlist();
  const on = list.some((i) => i.id === item.id);
  write(WISH, on ? list.filter((i) => i.id !== item.id) : [{ ...item, savedAt: Date.now() }, ...list].slice(0, 60));
  return !on;
}

export function getCompare(): number[] {
  const list = read<number[]>(COMPARE, []);
  return Array.isArray(list) ? list.filter((n) => typeof n === 'number').slice(0, COMPARE_MAX) : [];
}
/** Tambah/hapus dari perbandingan. Penuh (3) → yang paling lama dikeluarkan. */
export function toggleCompare(id: number): number[] {
  const list = getCompare();
  const next = list.includes(id) ? list.filter((n) => n !== id) : [...list, id].slice(-COMPARE_MAX);
  write(COMPARE, next);
  return next;
}
export function setCompare(ids: number[]) {
  write(COMPARE, ids.slice(0, COMPARE_MAX));
}
