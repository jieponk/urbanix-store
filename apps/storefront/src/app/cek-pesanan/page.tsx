import Link from 'next/link';
import FeatureIcon, { type FeatureIconName } from '@/components/FeatureIcon';
import OrderLookup from '@/components/OrderLookup';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'Cek Pesanan',
  description: 'Cek status pesanan, lacak pengiriman, dan unduh invoice belanjamu di Urbanix Store.',
  alternates: { canonical: '/cek-pesanan' },
};

const features: { icon: FeatureIconName; title: string; text: string }[] = [
  { icon: 'list', title: 'Status pesanan', text: 'Lihat apakah pesananmu menunggu, diproses, dikirim, atau selesai.' },
  { icon: 'box', title: 'Lacak pengiriman', text: 'Kurir dan nomor resi muncul begitu paket dikirim admin.' },
  { icon: 'doc', title: 'Invoice', text: 'Lihat, cetak, atau simpan invoice sebagai PDF kapan saja.' },
];

export default function CheckOrderPage() {
  const wa = siteConfig.contact.whatsappNumber.replace(/\D/g, '');
  return (
    <div>
      <section className="relative overflow-hidden bg-cobalt-900 px-4 pb-28 pt-12 text-white sm:px-6 sm:pb-32 sm:pt-16 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sun-400">Cek pesanan</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Lacak pesanan &amp; unduh invoice</h1>
          <p className="mt-4 text-lg leading-8 text-white/75">Masukkan nomor pesananmu untuk melihat status, resi, dan invoice.</p>
        </div>
      </section>

      <section className="relative -mt-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <OrderLookup />
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-surface p-5 ring-1 ring-slate-200">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                <FeatureIcon name={f.icon} size={20} />
              </span>
              <p className="mt-3 font-extrabold text-ink">{f.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-600">
          Lupa nomor pesanan?{' '}
          {wa ? (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-bold text-ink underline">
              Tanya admin lewat WhatsApp
            </a>
          ) : (
            <Link href="/kontak" className="font-bold text-ink underline">Hubungi kami</Link>
          )}{' '}
          dengan menyebutkan nama dan nomor HP yang dipakai saat memesan.
        </p>
      </section>
    </div>
  );
}
