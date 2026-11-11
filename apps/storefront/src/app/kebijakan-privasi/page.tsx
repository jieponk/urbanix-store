import LegalPage from '@/components/legal/LegalPage';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'Kebijakan Privasi',
  description: 'Bagaimana Urbanix Store mengumpulkan, menggunakan, dan melindungi data pribadi pembeli.',
  alternates: { canonical: '/kebijakan-privasi' },
};

export default function PrivacyPage() {
  const { legal, contact } = siteConfig;
  return (
    <LegalPage
      title="Kebijakan Privasi"
      updated={legal.updated}
      sections={[
        {
          id: 'pengantar',
          title: 'Pengantar',
          body: (
            <p>
              Kebijakan ini menjelaskan bagaimana {legal.company} (&quot;Urbanix Store&quot;, &quot;kami&quot;) mengumpulkan,
              menggunakan, menyimpan, dan melindungi data pribadi kamu saat menggunakan urbanix.id, sesuai dengan
              Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.
            </p>
          ),
        },
        {
          id: 'data',
          title: 'Data yang kami kumpulkan',
          body: (
            <ul>
              <li><b>Data pesanan</b> yang kamu isi saat checkout: nama, nomor HP/WhatsApp, email (opsional), alamat pengiriman, catatan, isi pesanan, dan voucher yang dipakai.</li>
              <li><b>Data teknis</b>: alamat IP, jenis perangkat/browser, dan waktu akses yang tercatat otomatis di log server dan layanan keamanan (Cloudflare).</li>
              <li><b>Penyimpanan di browser kamu</b> (localStorage): isi keranjang, voucher yang diklaim, dan pilihan tema terang/gelap. Data ini tetap di perangkatmu dan baru dikirim ke kami saat kamu checkout.</li>
              <li>Kami tidak memakai cookie iklan atau pelacak pihak ketiga. Cookie hanya dipakai untuk login admin toko.</li>
            </ul>
          ),
        },
        {
          id: 'penggunaan',
          title: 'Cara kami menggunakan data',
          body: (
            <ul>
              <li>Memproses dan mengonfirmasi pesanan, pembayaran, dan pengiriman.</li>
              <li>Menghubungi kamu terkait pesanan melalui WhatsApp, telepon, atau email.</li>
              <li>Memvalidasi voucher, termasuk batas pemakaian per nomor WhatsApp.</li>
              <li>Menangani retur, garansi, dan keluhan.</li>
              <li>Menyusun laporan penjualan internal serta menjaga keamanan website dan mencegah penipuan.</li>
            </ul>
          ),
        },
        {
          id: 'berbagi',
          title: 'Berbagi data dengan pihak lain',
          body: (
            <>
              <p>Kami <b>tidak menjual</b> data pribadimu. Data hanya dibagikan sebatas yang diperlukan kepada:</p>
              <ul>
                <li>Jasa ekspedisi (nama, nomor HP, alamat) untuk mengirim pesanan.</li>
                <li>Penyedia pembayaran, jika kamu memilih pembayaran online.</li>
                <li>Penyedia infrastruktur: server di Indonesia (Biznet Gio) dan layanan keamanan/jaringan (Cloudflare).</li>
                <li>WhatsApp (Meta) saat kamu mengirim pesanan atau pesan ke nomor kami.</li>
                <li>Instansi berwenang bila diwajibkan oleh hukum.</li>
              </ul>
              <p>Jika kamu memilih &quot;Beli di Shopee&quot;, transaksi berlangsung di Shopee dan tunduk pada kebijakan privasi Shopee.</p>
            </>
          ),
        },
        {
          id: 'penyimpanan',
          title: 'Penyimpanan dan keamanan',
          body: (
            <ul>
              <li>Data disimpan di server yang berlokasi di Indonesia dan dikirim melalui koneksi terenkripsi (HTTPS).</li>
              <li>Akses ke data pesanan dibatasi hanya untuk admin toko yang berwenang.</li>
              <li>Data pesanan disimpan selama diperlukan untuk transaksi, garansi, dan kewajiban hukum (misalnya pembukuan dan perpajakan), lalu dihapus atau dianonimkan.</li>
            </ul>
          ),
        },
        {
          id: 'hak',
          title: 'Hak kamu',
          body: (
            <>
              <p>Sesuai UU Pelindungan Data Pribadi, kamu berhak untuk:</p>
              <ul>
                <li>meminta informasi dan salinan data pribadimu yang kami simpan;</li>
                <li>memperbaiki data yang tidak akurat;</li>
                <li>meminta penghapusan data, sepanjang tidak bertentangan dengan kewajiban hukum kami;</li>
                <li>menarik persetujuan atas pemrosesan data tertentu.</li>
              </ul>
              <p>Ajukan permintaan melalui kontak di bawah. Kami akan menanggapi dalam waktu yang wajar.</p>
            </>
          ),
        },
        {
          id: 'anak',
          title: 'Pengguna di bawah umur',
          body: <p>Pembelian sebaiknya dilakukan oleh orang dewasa atau dengan pendampingan orang tua/wali.</p>,
        },
        {
          id: 'perubahan',
          title: 'Perubahan kebijakan',
          body: <p>Kebijakan ini dapat diperbarui sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini dengan tanggal pembaruan di atas.</p>,
        },
        {
          id: 'kontak',
          title: 'Kontak',
          body: (
            <p>
              {legal.company}, {legal.address}
              <br />
              WhatsApp {contact.whatsappDisplay} · Email {contact.email}
            </p>
          ),
        },
      ]}
    />
  );
}
