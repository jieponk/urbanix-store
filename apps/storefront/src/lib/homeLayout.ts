/**
 * Tata letak beranda (Seller Center → Dekor toko → Tata letak beranda).
 * Banner/banner event selalu paling atas; bagian lain bisa diurutkan & disembunyikan.
 */
export type HomeKey =
  | 'voucher'
  | 'flash'
  | 'kategori'
  | 'brand'
  | 'laris'
  | 'video'
  | 'chat'
  | 'produk'
  | 'ulasan'
  | 'berita'
  | 'keunggulan';

export const HOME_SECTIONS: { key: HomeKey; label: string; hint: string }[] = [
  { key: 'voucher', label: 'Voucher', hint: 'Voucher yang bisa diklaim' },
  { key: 'flash', label: 'Flash Sale / promo', hint: 'Produk diskon dengan hitung mundur' },
  { key: 'kategori', label: 'Kategori', hint: 'Belanja per kategori bergambar' },
  { key: 'brand', label: 'Brand Corner', hint: 'Logo merek yang ada produknya' },
  { key: 'laris', label: 'Paling laris', hint: 'Muncul bila sudah ada penjualan' },
  { key: 'video', label: 'Video belanja', hint: 'Muncul bila sudah ada video' },
  { key: 'chat', label: 'Ajakan chat WhatsApp', hint: '“Butuh bantuan pilih gear?”' },
  { key: 'produk', label: 'Produk pilihan', hint: '8 produk per halaman' },
  { key: 'ulasan', label: 'Ulasan pembeli', hint: 'Ulasan asli pembeli' },
  { key: 'berita', label: 'Berita kamera', hint: 'Berita terbaru bergambar' },
  { key: 'keunggulan', label: 'Keunggulan toko', hint: 'Original, garansi, dll.' },
];

export type HomeLayoutItem = { key: HomeKey; visible: boolean };

export const DEFAULT_LAYOUT: HomeLayoutItem[] = HOME_SECTIONS.map((s) => ({ key: s.key, visible: true }));

/** Gabungkan susunan tersimpan dengan daftar bagian terbaru (bagian baru otomatis ditambahkan di akhir). */
export function resolveLayout(saved: { key: string; visible: boolean }[] | null | undefined): HomeLayoutItem[] {
  const known = new Set<string>(HOME_SECTIONS.map((s) => s.key));
  const out: HomeLayoutItem[] = [];
  for (const item of saved ?? []) {
    if (known.has(item.key) && !out.some((o) => o.key === item.key)) out.push({ key: item.key as HomeKey, visible: item.visible !== false });
  }
  for (const s of HOME_SECTIONS) if (!out.some((o) => o.key === s.key)) out.push({ key: s.key, visible: true });
  return out;
}
