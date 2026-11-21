import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { getT } from '@/lib/lang-server';
import TablerIcon, { type TablerName } from '@/components/TablerIcon';
import { ArrowRight } from '@/components/inspirasi/InspoIcons';

export const metadata = {
  title: 'Kerja Sama Brand',
  description:
    'Ajak Urbanix Store berkolaborasi: distribusi produk, kampanye promo, konten & ulasan, serta event komunitas kreator. Hubungi partnership@urbanix.id.',
  alternates: { canonical: '/kerja-sama' },
};

const FORMS: { icon: TablerName; title: string; text: string }[] = [
  {
    icon: 'building-store',
    title: 'Distribusi & penjualan',
    text: 'Produk resmi brand kamu dijual di urbanix.id dan toko Shopee kami, dengan foto, deskripsi, dan harga yang kami jaga.',
  },
  {
    icon: 'discount',
    title: 'Kampanye & promo bersama',
    text: 'Flash sale, voucher, bundling, atau peluncuran produk baru yang tampil di beranda dan kanal kami.',
  },
  {
    icon: 'file-text',
    title: 'Konten & ulasan',
    text: 'Artikel tips, ulasan yang jujur, dan kabar produk terbaru di halaman Inspirasi Urbanix.',
  },
  {
    icon: 'camera',
    title: 'Event & komunitas',
    text: 'Workshop, demo produk, atau kolaborasi bersama kreator dan komunitas fotografi & videografi.',
  },
];

const STEPS = [
  'Kirim email berisi profil brand, katalog atau price list, dan bentuk kerja sama yang kamu inginkan.',
  'Tim kami mempelajari penawaranmu dan membalas lewat email untuk diskusi lebih lanjut.',
  'Kita sepakati detailnya, lalu kolaborasi siap berjalan.',
];

export default function PartnershipPage() {
  const t = getT();
  const { contact, legal } = siteConfig;
  const subject = encodeURIComponent('Kerja sama brand – [nama brand]');
  const body = encodeURIComponent(
    'Halo tim Urbanix,\n\nNama brand/perusahaan:\nKategori produk:\nBentuk kerja sama yang diinginkan:\nKontak (nama & nomor):\n\nTerlampir profil dan katalog kami.\n\nTerima kasih.'
  );
  const mailto = `mailto:${contact.partnershipEmail}?subject=${subject}&body=${body}`;

  return (
    <div>
      {/* Pembuka */}
      <section className="relative overflow-hidden bg-cobalt-900 px-4 pb-20 pt-12 text-white sm:px-6 sm:pb-24 sm:pt-16 lg:px-8">
        <span aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sale-600/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60">
            <Link href="/" className="hover:text-white">{t('Beranda')}</Link>
            <span className="mx-2">/</span>
            <span className="text-white/90">{t('Kerja sama brand')}</span>
          </nav>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-sun-300">{t('Partnership')}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t('Tumbuh bersama Urbanix')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">
            {t('Kami terbuka untuk brand kamera, audio, lighting, dan aksesori kreator yang ingin menjangkau pembeli di urbanix.id dan Shopee.')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-extrabold text-cobalt-900 transition hover:bg-white/90"
            >
              <TablerIcon name="mail" size={18} stroke={2.2} />
              {t('Ajukan kerja sama')}
            </a>
            <span className="inline-flex items-center rounded-full px-2 py-3 text-sm font-semibold text-white/80">
              {contact.partnershipEmail}
            </span>
          </div>
        </div>
      </section>

      {/* Bentuk kerja sama */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Bentuk kerja sama')}</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            {t('Pilih yang paling cocok, atau gabungkan beberapa. Kami juga terbuka untuk ide lain.')}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FORMS.map((f) => (
              <div key={f.title} className="rounded-2xl bg-surface p-6 ring-1 ring-slate-200">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mist text-ink">
                  <TablerIcon name={f.icon} size={24} stroke={1.9} />
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-ink">{t(f.title)}</h3>
                <p className="mt-1.5 leading-7 text-slate-600">{t(f.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alur */}
      <section className="bg-mist px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Cara mengajukan')}</h2>
            <p className="mt-2 text-slate-600">
              {t('Urbanix Store dikelola oleh {company}.', { company: legal.company })}
            </p>
          </div>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-4 rounded-2xl bg-surface p-5 ring-1 ring-slate-200">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-extrabold text-surface">
                  {i + 1}
                </span>
                <p className="pt-1.5 leading-7 text-ink">{t(step)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Ajakan */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl bg-cobalt-900 p-8 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <p className="text-2xl font-extrabold tracking-tight">{t('Siap berkolaborasi?')}</p>
            <p className="mt-1 text-white/75">
              {t('Kirim penawaranmu ke {email}.', { email: contact.partnershipEmail })}
            </p>
          </div>
          <a
            href={mailto}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sale-600 px-6 py-3 text-sm font-extrabold text-white transition hover:bg-sale-700"
          >
            {t('Kirim email')}
            <ArrowRight size={16} />
          </a>
        </div>
      </section>
    </div>
  );
}
