import LegalPage from '@/components/legal/LegalPage';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'Syarat & Ketentuan',
  description: 'Syarat dan ketentuan belanja di Urbanix Store: pemesanan, pembayaran, voucher, pengiriman, pengembalian, dan garansi.',
  alternates: { canonical: '/syarat-ketentuan' },
};

export default function TermsPage() {
  const { legal, contact } = siteConfig;
  const wa = contact.whatsappDisplay;
  return (
    <LegalPage
      title="Syarat & Ketentuan"
      updated={legal.updated}
      sections={[
        {
          id: 'umum',
          title: 'Ketentuan umum',
          body: (
            <>
              <p>
                Website urbanix.id (&quot;Urbanix Store&quot;) dikelola oleh {legal.company}, beralamat di {legal.address}.
                Dengan mengakses website ini dan/atau melakukan pemesanan, kamu dianggap telah membaca dan menyetujui
                Syarat &amp; Ketentuan ini.
              </p>
            </>
          ),
        },
        {
          id: 'produk-harga',
          title: 'Produk dan harga',
          body: (
            <ul>
              <li>Produk yang dijual adalah produk original. Foto dapat berupa ilustrasi; warna dan detail mengikuti produk asli.</li>
              <li>Harga dalam Rupiah dan <b>sudah termasuk PPN</b>, <b>belum termasuk ongkos kirim</b>.</li>
              <li>Harga, promo, dan stok dapat berubah sewaktu-waktu. Harga yang berlaku adalah harga pada saat pesanan dikonfirmasi oleh admin.</li>
              <li>Jika terjadi kesalahan harga atau stok yang jelas (mis. salah ketik), kami berhak membatalkan pesanan dan mengembalikan dana yang sudah dibayarkan sepenuhnya.</li>
            </ul>
          ),
        },
        {
          id: 'pemesanan',
          title: 'Pemesanan',
          body: (
            <ul>
              <li>
                <b>Pesan via WhatsApp:</b> setelah checkout, detail pesanan dikirim ke WhatsApp resmi kami ({wa}). Admin
                akan mengonfirmasi ketersediaan stok, ongkos kirim, dan total pembayaran.
              </li>
              <li>Pesanan dianggap sah setelah pembayaran kami terima dan dikonfirmasi admin.</li>
              <li>
                <b>Beli di Shopee:</b> transaksi terjadi di Shopee dan tunduk pada syarat, pembayaran, dan perlindungan
                pembeli Shopee.
              </li>
            </ul>
          ),
        },
        {
          id: 'pembayaran',
          title: 'Pembayaran',
          body: (
            <ul>
              <li>Pembayaran hanya ke rekening resmi atas nama {legal.company} yang diinformasikan oleh WhatsApp resmi kami ({wa}).</li>
              <li>
                Waspada penipuan: kami tidak pernah meminta pembayaran ke rekening pribadi atau melalui nomor selain
                nomor resmi di atas.
              </li>
              <li>Pesanan yang belum dibayar dalam {legal.paymentDeadline} sejak konfirmasi admin dapat dibatalkan otomatis.</li>
            </ul>
          ),
        },
        {
          id: 'voucher',
          title: 'Voucher dan promo',
          body: (
            <ul>
              <li>Setiap voucher memiliki syarat masing-masing (minimal belanja, maksimal potongan, metode pembelian, periode, dan kuota) yang tertera pada voucher.</li>
              <li>Maksimal 1 voucher diskon dan 1 voucher gratis ongkir per pesanan, kecuali dinyatakan lain.</li>
              <li>Voucher tidak dapat diuangkan. Potongan ongkir maksimal sebesar nilai voucher dan tidak melebihi ongkos kirim sebenarnya.</li>
              <li>Batas pemakaian per pembeli dihitung berdasarkan nomor WhatsApp. Kami berhak membatalkan voucher atau pesanan jika ditemukan penyalahgunaan.</li>
              <li>Harga promo berlaku sesuai periode promo dan kembali ke harga normal setelah promo berakhir.</li>
            </ul>
          ),
        },
        {
          id: 'pengiriman',
          title: 'Pengiriman',
          body: (
            <ul>
              <li>Pesanan dikirim melalui jasa ekspedisi pilihan. Nomor resi diinformasikan setelah paket dikirim.</li>
              <li>Estimasi waktu pengiriman mengikuti layanan ekspedisi dan dapat berbeda dari perkiraan.</li>
              <li>Kami menyarankan asuransi pengiriman untuk produk bernilai tinggi. Risiko kehilangan/kerusakan selama pengiriman mengikuti ketentuan ekspedisi dan asuransi yang dipilih.</li>
            </ul>
          ),
        },
        {
          id: 'pembatalan-retur',
          title: 'Pembatalan, pengembalian, dan garansi',
          body: (
            <ul>
              <li>Pesanan dapat dibatalkan sebelum paket dikirim dengan menghubungi admin.</li>
              <li>
                Pengajuan retur karena barang salah kirim, kurang, atau cacat dari pabrik dilakukan maksimal{' '}
                {legal.returnWindow} sejak paket diterima, disertai <b>video unboxing</b> tanpa jeda.
              </li>
              <li>Barang retur harus lengkap dengan kemasan, aksesori, dan kelengkapan aslinya.</li>
              <li>
                Garansi mengikuti ketentuan garansi resmi/distributor masing-masing produk. Kerusakan karena pemakaian,
                jatuh, terkena cairan, atau modifikasi tidak termasuk garansi.
              </li>
            </ul>
          ),
        },
        {
          id: 'tanggung-jawab',
          title: 'Batasan tanggung jawab',
          body: (
            <p>
              Kami berupaya menampilkan informasi yang akurat, namun tidak menjamin website bebas dari kesalahan atau
              gangguan. Tanggung jawab kami atas suatu pesanan terbatas pada nilai barang yang dibayarkan untuk pesanan
              tersebut, sejauh diizinkan oleh hukum yang berlaku.
            </p>
          ),
        },
        {
          id: 'perubahan',
          title: 'Perubahan ketentuan dan hukum yang berlaku',
          body: (
            <p>
              Syarat &amp; Ketentuan ini dapat diperbarui sewaktu-waktu; versi terbaru selalu tersedia di halaman ini.
              Ketentuan ini tunduk pada hukum Republik Indonesia.
            </p>
          ),
        },
        {
          id: 'kontak',
          title: 'Kontak',
          body: (
            <p>
              WhatsApp {wa} · Email {contact.email} · {contact.hours}
            </p>
          ),
        },
      ]}
    />
  );
}
