/**
 * Pengaturan teks toko di satu tempat.
 * Ubah isi di file ini untuk mengganti moto, kontak, dan info pembayaran
 * tanpa membuka file halaman.
 */
export const siteConfig = {
  name: 'URBANIX STORE',

  // Moto toko (ditampilkan di beranda dan footer)
  motto: 'Inovasi Teknologi & Gaya Perkotaan Modern',
  mottoSub:
    'Perlengkapan kamera dan gear kreator pilihan untuk setiap momen yang ingin kamu abadikan.',

  // Contact person. GANTI nilai contoh di bawah dengan data toko yang asli.
  contact: {
    person: 'Admin Urbanix',
    // Nomor WhatsApp format internasional tanpa + atau spasi, contoh: '6281234567890'.
    // Kalau dikosongkan, nomor tampil sebagai teks biasa (bukan tautan WhatsApp).
    whatsappNumber: '',
    whatsappDisplay: '0812-XXXX-XXXX',
    email: 'cs@urbanix-store.example',
    hours: 'Senin–Sabtu, 09.00–17.00 WIB',
  },

  // Metode pembayaran yang tersedia (sesuai integrasi Midtrans di checkout)
  paymentMethods: ['QRIS', 'Virtual Account'],

  // Teks berjalan di beranda
  highlights: [
    'Pelayanan terbaik untuk setiap pelanggan',
    'Admin siap membantu memilih gear yang pas',
    'Produk original pilihan',
    'Harga transparan',
    'Pembayaran aman via QRIS & Virtual Account',
    'Belanja praktis, tinggal klik',
  ],
};
