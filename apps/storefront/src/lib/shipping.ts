/**
 * Jasa kirim yang tersedia. Kode `code` harus sama dengan backend (store/shipping.py).
 * Logo kurir: file resmi di public/couriers/<logo>.webp (jne, jne-cargo, jnt, jnt-cargo, gosend, grab).
 */
export type CourierKey = 'jne' | 'jnt' | 'gosend' | 'grab';
export type LogoKey = 'jne' | 'jne-cargo' | 'jnt' | 'jnt-cargo' | 'gosend' | 'grab';

/** Daftar untuk footer: satu kartu per logo. */
export const SHIPPING_BRANDS: { logo: LogoKey; courier: CourierKey; name: string; services: string }[] = [
  { logo: 'jne', courier: 'jne', name: 'JNE Express', services: 'Reguler' },
  { logo: 'jne-cargo', courier: 'jne', name: 'JNE Cargo', services: 'Cargo (JTR)' },
  { logo: 'jnt', courier: 'jnt', name: 'J&T Express', services: 'Reguler' },
  { logo: 'jnt-cargo', courier: 'jnt', name: 'J&T Cargo', services: 'Cargo' },
  { logo: 'gosend', courier: 'gosend', name: 'GoSend', services: 'Instant · Same Day' },
  { logo: 'grab', courier: 'grab', name: 'GrabExpress', services: 'Instant · Same Day' },
];

export const COURIERS: { key: CourierKey; name: string; services: string[] }[] = [
  { key: 'jne', name: 'JNE', services: ['Reguler', 'Cargo (JTR)'] },
  { key: 'jnt', name: 'J&T Express', services: ['Reguler', 'J&T Cargo'] },
  { key: 'gosend', name: 'GoSend', services: ['Instant', 'Same Day'] },
  { key: 'grab', name: 'GrabExpress', services: ['Instant', 'Same Day'] },
];

export const SHIPPING_GROUPS: {
  name: 'Reguler' | 'Kargo' | 'Instan';
  note: string;
  options: { code: string; courier: CourierKey; logo: LogoKey; label: string; short: string }[];
}[] = [
  {
    name: 'Reguler',
    note: 'Ke seluruh Indonesia, tarif resmi JNE / J&T.',
    options: [
      { code: 'jne_reg', courier: 'jne', logo: 'jne', label: 'JNE Reguler', short: 'Reguler' },
      { code: 'jnt_reg', courier: 'jnt', logo: 'jnt', label: 'J&T Express Reguler', short: 'Reguler' },
    ],
  },
  {
    name: 'Kargo',
    note: 'Untuk paket besar atau berat, lebih hemat.',
    options: [
      { code: 'jne_cargo', courier: 'jne', logo: 'jne-cargo', label: 'JNE Cargo (JTR)', short: 'Cargo' },
      { code: 'jnt_cargo', courier: 'jnt', logo: 'jnt-cargo', label: 'J&T Cargo', short: 'Cargo' },
    ],
  },
  {
    name: 'Instan',
    note: 'Sampai hari ini, untuk alamat yang terjangkau dari Jakarta.',
    options: [
      { code: 'gosend_instant', courier: 'gosend', logo: 'gosend', label: 'GoSend Instant', short: 'Instant' },
      { code: 'gosend_sameday', courier: 'gosend', logo: 'gosend', label: 'GoSend Same Day', short: 'Same Day' },
      { code: 'grab_instant', courier: 'grab', logo: 'grab', label: 'GrabExpress Instant', short: 'Instant' },
      { code: 'grab_sameday', courier: 'grab', logo: 'grab', label: 'GrabExpress Same Day', short: 'Same Day' },
    ],
  },
];

export const courierName = (key: CourierKey) => COURIERS.find((c) => c.key === key)?.name ?? key;
