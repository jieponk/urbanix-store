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
      eyebrow="Aturan belanja"
      title="Syarat & Ketentuan"
      intro="Aturan main belanja di Urbanix Store, dari pemesanan, pembayaran, dan voucher sampai pengiriman, retur, dan garansi. Dibuat ringkas supaya mudah dipahami."
      updated={legal.updated}
      highlights={[
        { icon: 'shield', title: 'Produk original', text: 'Semua produk original dengan garansi sesuai ketentuan resmi.' },
        { icon: 'tag', title: 'Harga termasuk PPN', text: 'Harga sudah termasuk PPN, belum termasuk ongkos kirim.' },
        { icon: 'lock', title: 'Rekening resmi PT', text: `Bayar hanya ke rekening atas nama ${legal.company}.` },
        { icon: 'box', title: `Retur ${legal.returnWindow}`, text: 'Wajib video unboxing. Ongkir retur ditanggung toko untuk kesalahan kami.' },
      ]}
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
              <li>Kami mengirim ke <b>{legal.shipArea}</b> dari Jakarta melalui jasa ekspedisi pilihan.</li>
              <li>
                Pesanan diproses dan dikirim maksimal <b>{legal.shipProcessing}</b> setelah pembayaran dikonfirmasi.
                Nomor resi diinformasikan lewat WhatsApp/email dan bisa dicek di halaman Cek Pesanan.
              </li>
              <li>Ongkos kirim mengikuti tarif ekspedisi ke alamat tujuan dan dikonfirmasi admin sebelum pembayaran.</li>
              <li>Estimasi waktu sampai mengikuti layanan ekspedisi yang dipilih.</li>
              <li>
                Untuk produk bernilai tinggi kami sarankan asuransi pengiriman. Kehilangan/kerusakan selama pengiriman
                ditangani sesuai ketentuan ekspedisi dan asuransi.
              </li>
            </ul>
          ),
        },
        {
          id: 'pembatalan-retur',
          title: 'Pembatalan, pengembalian barang & dana',
          body: (
            <>
              <p>
                <b>Pembatalan:</b> pesanan dapat dibatalkan sebelum paket dikirim dengan menghubungi admin. Bila sudah
                dibayar, dana dikembalikan penuh maksimal {legal.refundTime}.
              </p>
              <p>
                <b>Pengembalian (retur) diterima bila:</b>
              </p>
              <ul>
                <li>barang yang diterima salah (produk, varian, atau warna tidak sesuai pesanan);</li>
                <li>barang kurang atau tidak lengkap;</li>
                <li>barang rusak atau cacat dari pabrik saat diterima.</li>
              </ul>
              <p>
                <b>Syarat utama:</b> pengajuan maksimal <b>{legal.returnWindow} sejak paket diterima</b> (sesuai status
                ekspedisi) dan wajib melampirkan <b>video unboxing</b> utuh tanpa jeda/potongan, dimulai dari paket
                masih tersegel. Tanpa video unboxing, pengajuan retur tidak dapat diproses.
              </p>
              <p><b>Cara mengajukan:</b></p>
              <ol>
                <li>Hubungi admin lewat WhatsApp resmi, sebutkan nomor pesanan, kirim video unboxing dan foto kendala.</li>
                <li>Admin memeriksa pengajuan maksimal {legal.reviewTime}.</li>
                <li>
                  Bila disetujui, kirim barang kembali lengkap dengan kemasan, aksesori, dan kelengkapan aslinya.{' '}
                  <b>Ongkos kirim retur ditanggung Urbanix Store</b> untuk kesalahan dari pihak kami.
                </li>
                <li>
                  Setelah barang retur kami terima dan periksa, kamu bisa memilih <b>barang pengganti</b> (bila stok
                  tersedia) atau <b>pengembalian dana penuh</b> sebesar harga barang, ditransfer ke rekening atas nama
                  pembeli maksimal {legal.refundTime}.
                </li>
              </ol>
              <p>
                Retur karena berubah pikiran, salah memilih produk/varian oleh pembeli, atau kerusakan akibat pemakaian
                tidak dapat diterima.
              </p>
            </>
          ),
        },
        {
          id: 'garansi',
          title: 'Garansi',
          body: (
            <ul>
              <li>Garansi mengikuti ketentuan garansi resmi/distributor masing-masing produk, sesuai yang tertera di halaman produk.</li>
              <li>Klaim garansi dilakukan dengan kartu/nota garansi. Admin kami siap membantu mengarahkan ke pusat servis resmi.</li>
              <li>Kerusakan karena pemakaian, jatuh, terkena cairan, atau modifikasi tidak termasuk garansi.</li>
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
