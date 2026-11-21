/**
 * Data wilayah Indonesia (Kepmendagri 2025) dari public/wilayah/*.json — lihat scripts/build-wilayah.py.
 * Provinsi dimuat sekali; isi satu provinsi (kab/kota → kecamatan → desa + kode pos) dimuat saat provinsinya dipilih.
 */
export type Village = [name: string, postal: string];
export type District = [name: string, villages: Village[]];
export type Regency = [name: string, districts: District[]];
export type ProvinceData = Regency[];

let provinces: Promise<[string, string][]> | null = null;
const cache = new Map<string, Promise<ProvinceData>>();

export function loadProvinces() {
  if (!provinces) {
    provinces = fetch('/wilayah/provinsi.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        provinces = null;
        return [];
      });
  }
  return provinces;
}

export function loadProvince(code: string) {
  if (!/^[0-9]{2}$/.test(code)) return Promise.resolve([] as ProvinceData);
  let job = cache.get(code);
  if (!job) {
    job = fetch(`/wilayah/${code}.json`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        cache.delete(code);
        return [];
      });
    cache.set(code, job);
  }
  return job;
}

/** Bandingkan nama tanpa beda huruf besar/kecil, spasi, dan awalan "Kabupaten"/"Kota Adm." dsb. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findByName<T extends [string, ...unknown[]]>(list: T[], name: string): T | undefined {
  const n = norm(name);
  if (!n) return undefined;
  return list.find((item) => norm(item[0]) === n);
}
