/**
 * Jasa kirim yang tersedia. Kode `code` harus sama dengan backend (store/shipping.py).
 * Logo kurir opsional: taruh file resmi di public/couriers/<courier>.svg|png|webp (mis. jne.svg).
 */
export type CourierKey = 'jne' | 'jnt' | 'gosend' | 'grab';

export const COURIERS: { key: CourierKey; name: string; services: string[] }[] = [
  { key: 'jne', name: 'JNE', services: ['Reguler', 'Cargo (JTR)'] },
  { key: 'jnt', name: 'J&T Express', services: ['Reguler', 'J&T Cargo'] },
  { key: 'gosend', name: 'GoSend', services: ['Instant', 'Same Day'] },
  { key: 'grab', name: 'GrabExpress', services: ['Instant', 'Same Day'] },
];

export const SHIPPING_GROUPS: {
  name: 'Reguler' | 'Kargo' | 'Instan';
  note: string;
  options: { code: string; courier: CourierKey; label: string; short: string }[];
}[] = [
  {
    name: 'Reguler',
    note: 'Ke seluruh Indonesia, tarif resmi JNE / J&T.',
    options: [
      { code: 'jne_reg', courier: 'jne', label: 'JNE Reguler', short: 'Reguler' },
      { code: 'jnt_reg', courier: 'jnt', label: 'J&T Express Reguler', short: 'Reguler' },
    ],
  },
  {
    name: 'Kargo',
    note: 'Untuk paket besar atau berat, lebih hemat.',
    options: [
      { code: 'jne_cargo', courier: 'jne', label: 'JNE Cargo (JTR)', short: 'Cargo' },
      { code: 'jnt_cargo', courier: 'jnt', label: 'J&T Cargo', short: 'Cargo' },
    ],
  },
  {
    name: 'Instan',
    note: 'Sampai hari ini, untuk alamat yang terjangkau dari Jakarta.',
    options: [
      { code: 'gosend_instant', courier: 'gosend', label: 'GoSend Instant', short: 'Instant' },
      { code: 'gosend_sameday', courier: 'gosend', label: 'GoSend Same Day', short: 'Same Day' },
      { code: 'grab_instant', courier: 'grab', label: 'GrabExpress Instant', short: 'Instant' },
      { code: 'grab_sameday', courier: 'grab', label: 'GrabExpress Same Day', short: 'Same Day' },
    ],
  },
];

export const courierName = (key: CourierKey) => COURIERS.find((c) => c.key === key)?.name ?? key;
