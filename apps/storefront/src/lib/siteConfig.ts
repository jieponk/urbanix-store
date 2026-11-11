import type { FeatureIconName } from '@/components/FeatureIcon';

/**
 * Pengaturan teks toko di satu tempat.
 * Ubah isi di file ini untuk mengganti keunggulan, kontak, dan info pembayaran
 * tanpa membuka file halaman.
 */
export const siteConfig = {
  name: 'URBANIX STORE',

  // Tagline resmi (sama dengan logo)
  tagline: 'Capture Your Style',

  // Deskripsi singkat toko (footer & deskripsi situs untuk Google)
  motto: 'Kamera, lensa, drone, audio, dan gear kreator original bergaransi resmi.',

  // Data hukum untuk halaman Syarat & Ketentuan dan Kebijakan Privasi. WAJIB diisi sebelum dipublikasikan luas.
  legal: {
    company: '[Nama badan usaha, mis. PT ...]',
    address: '[Alamat kantor/toko lengkap]',
    updated: '11 November 2026',
    paymentDeadline: '1×24 jam',
    returnWindow: '2×24 jam',
  },

  // Kontak toko (tampil di footer). Nomor WhatsApp di Pengaturan toko (admin) diutamakan bila diisi.
  contact: {
    person: 'Admin Urbanix',
    // Nomor WhatsApp format internasional tanpa + atau spasi, contoh: '6281234567890'.
    // Kalau dikosongkan, nomor tampil sebagai teks biasa (bukan tautan WhatsApp).
    whatsappNumber: '628212990180',
    whatsappDisplay: '0821-2990-180',
    email: 'urbanixstore@gmail.com',
    hours: 'Senin–Sabtu, 09.00–17.00 WIB',
  },

  /**
   * Banner beranda diambil otomatis dari folder public/banners
   * (lihat BACA-DULU.txt di folder itu). Untuk membuat banner bisa diklik,
   * isi tautannya di sini: nama file -> alamat tujuan.
   * Contoh: '1-promo-kamera.jpg': '/produk?category=3'
   */
  bannerLinks: {
    '1-gear-terbaik.webp': '/produk',
    '2-fast-service.webp': '/produk',
    '3-produk-pilihan.webp': '/produk',
  } as Record<string, string>,

  // Keunggulan toko ("kenapa belanja di sini"). Pastikan semuanya benar untuk tokomu.
  featuresTitle: 'Kenapa belanja di Urbanix?',
  features: [
    {
      icon: 'bolt',
      title: 'Fast Service',
      text: 'Pesanan diproses cepat dan pertanyaanmu dibalas tanpa lama menunggu.',
    },
    {
      icon: 'shield',
      title: 'Produk Original',
      text: 'Perlengkapan kamera dan gear pilihan, dikurasi untuk kreator.',
    },
    {
      icon: 'tag',
      title: 'Harga Transparan',
      text: 'Harga dan diskon tertera jelas, tanpa biaya tersembunyi.',
    },
    {
      icon: 'lock',
      title: 'Pembayaran Aman',
      text: 'Pilihan pembayaran praktis dan aman untuk setiap pesanan.',
    },
    {
      icon: 'chat',
      title: 'Admin Responsif',
      text: 'Bingung memilih gear? Admin siap membantu sesuai kebutuhanmu.',
    },
    {
      icon: 'box',
      title: 'Packing Rapi & Aman',
      text: 'Setiap barang dikemas dengan hati-hati sebelum dikirim.',
    },
  ] as { icon: FeatureIconName; title: string; text: string }[],

  /**
   * Metode pembayaran di footer. `logo` = nama file di public/payments
   * (tanpa ekstensi), misalnya 'qris' untuk public/payments/qris.png.
   * Kalau file logonya belum ada, footer menampilkan nama sebagai teks.
   * PENTING: tampilkan hanya metode yang benar-benar bisa dipakai di checkout.
   */
  paymentMethods: [
    { name: 'QRIS', logo: 'qris', showName: true },
    { name: 'Transfer Bank', logo: 'transfer-bank', showName: true },
    { name: 'E-Wallet', logo: 'e-wallet', showName: true },
  ] as { name: string; logo: string; showName?: boolean }[],

  // Teks berjalan di beranda
  highlights: [
    'Pelayanan terbaik untuk setiap pelanggan',
    'Admin siap membantu memilih gear yang pas',
    'Produk original pilihan',
    'Harga transparan',
    'Belanja praktis, tinggal klik',
  ],
};
