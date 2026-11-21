/**
 * Alamat tersimpan untuk pembelian berikutnya — hanya di browser/perangkat pembeli (localStorage),
 * tidak dikirim ke server sampai pembeli membuat pesanan. Maks. 5 alamat, terbaru di atas.
 */
export type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  province: string;
  city: string;
  district: string;
  village: string;
  postal_code: string;
  usedAt: number;
};

const KEY = 'urbanix-alamat';
const MAX = 5;

export function getSavedAddresses(): SavedAddress[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list)
      ? list.filter((a) => a && typeof a.id === 'string' && typeof a.street === 'string').sort((a, b) => b.usedAt - a.usedAt)
      : [];
  } catch {
    return [];
  }
}

function write(list: SavedAddress[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* mode privat / penuh */
  }
}

const same = (a: Omit<SavedAddress, 'id' | 'usedAt'>, b: Omit<SavedAddress, 'id' | 'usedAt'>) =>
  a.phone.replace(/\D/g, '') === b.phone.replace(/\D/g, '') &&
  a.street.trim().toLowerCase() === b.street.trim().toLowerCase() &&
  a.city.trim().toLowerCase() === b.city.trim().toLowerCase();

/** Simpan (atau perbarui bila alamat yang sama sudah ada). */
export function saveAddress(data: Omit<SavedAddress, 'id' | 'usedAt'>) {
  const list = getSavedAddresses();
  const existing = list.find((a) => same(a, data));
  const entry: SavedAddress = {
    ...data,
    id: existing?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    usedAt: Date.now(),
  };
  write([entry, ...list.filter((a) => a.id !== entry.id)]);
}

export function removeAddress(id: string) {
  write(getSavedAddresses().filter((a) => a.id !== id));
}

/** Satu baris ringkas untuk kartu alamat. */
export function addressLine(a: Pick<SavedAddress, 'street' | 'village' | 'district' | 'city' | 'province' | 'postal_code'>) {
  return [a.street, a.village, a.district && `Kec. ${a.district}`, a.city, a.province, a.postal_code].filter(Boolean).join(', ');
}
