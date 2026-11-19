import type { IconName } from '@/components/seller/SellerIcons';

/** Daftar menu Seller Center (dipakai sidebar PC, halaman Menu di HP, dan pencarian menu). */
export type MenuItem = { href: string; label: string; icon: IconName; keywords?: string };

export const MENU: { group: string; items: MenuItem[] }[] = [
  { group: 'Penjualan', items: [
    { href: '/seller', label: 'Dashboard', icon: 'dashboard', keywords: 'beranda omzet laporan' },
    { href: '/seller/pesanan', label: 'Pesanan', icon: 'orders', keywords: 'order resi kirim' },
  ] },
  { group: 'Produk', items: [
    { href: '/seller/produk', label: 'Produk & SKU', icon: 'products', keywords: 'stok harga varian' },
    { href: '/seller/mass-update', label: 'Mass update', icon: 'bulk', keywords: 'excel massal' },
  ] },
  { group: 'Marketing', items: [
    { href: '/seller/promo', label: 'Promo harga', icon: 'promo', keywords: 'diskon flash sale potong harga' },
    { href: '/seller/voucher', label: 'Voucher', icon: 'voucher', keywords: 'kupon ongkir' },
    { href: '/seller/banner', label: 'Banner & link', icon: 'banner', keywords: 'slider gambar' },
    { href: '/seller/video', label: 'Video belanja', icon: 'video', keywords: 'tiktok instagram youtube reels lihat langsung' },
    { href: '/seller/dekor', label: 'Dekor toko', icon: 'palette', keywords: 'tema event 12.12 gajian payday tampilan tata letak beranda urutan' },
  ] },
  { group: 'Konten', items: [
    { href: '/seller/artikel', label: 'Artikel', icon: 'article', keywords: 'inspirasi blog' },
    { href: '/seller/komentar', label: 'Komentar', icon: 'chat' },
    { href: '/seller/berita', label: 'Berita RSS', icon: 'news' },
    { href: '/seller/ulasan-pembeli', label: 'Ulasan produk', icon: 'reviews', keywords: 'rating bintang' },
    { href: '/seller/ulasan', label: 'Ulasan Shopee', icon: 'reviews' },
  ] },
  { group: 'Toko', items: [{ href: '/seller/pengaturan', label: 'Pengaturan', icon: 'settings', keywords: 'whatsapp shopee kategori' }] },
];
