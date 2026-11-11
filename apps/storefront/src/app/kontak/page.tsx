import Link from 'next/link';
import { getStoreSettings } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'Kontak',
  description: 'Hubungi Urbanix Store lewat WhatsApp atau email. Jam operasional, alamat, dan info rekening resmi.',
  alternates: { canonical: '/kontak' },
};

function displayPhone(number: string) {
  const local = number.replace(/\D/g, '').replace(/^62/, '0');
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

export default async function ContactPage() {
  const settings = await getStoreSettings();
  const { contact, legal } = siteConfig;
  const whatsapp = (settings?.whatsapp_number || contact.whatsappNumber).replace(/\D/g, '');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(legal.address)}`;
  const card = 'rounded-2xl bg-surface p-6 ring-1 ring-slate-200';

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Hubungi kami</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Tanya stok, minta rekomendasi gear, atau cek pesanan. Admin kami siap membantu.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl bg-emerald-600 p-6 text-white transition hover:bg-emerald-700 md:col-span-2"
            >
              <p className="text-sm font-bold uppercase tracking-wider text-white/80">WhatsApp (paling cepat)</p>
              <p className="mt-2 text-3xl font-extrabold">{displayPhone(whatsapp)}</p>
              <p className="mt-2 text-white/85">Klik untuk mulai chat dengan {contact.person} →</p>
            </a>
          )}

          <div className={card}>
            <p className="text-sm font-bold text-slate-500">Email</p>
            <a href={`mailto:${contact.email}`} className="mt-1 block text-lg font-bold text-ink hover:underline">
              {contact.email}
            </a>
          </div>

          <div className={card}>
            <p className="text-sm font-bold text-slate-500">Jam operasional admin</p>
            <p className="mt-1 text-lg font-bold text-ink">{contact.hours}</p>
            <p className="mt-1 text-sm text-slate-500">Pesan di luar jam ini dibalas pada jam kerja berikutnya.</p>
          </div>

          <div className={card}>
            <p className="text-sm font-bold text-slate-500">Kantor</p>
            <p className="mt-1 font-bold text-ink">{legal.company}</p>
            <p className="mt-1 text-slate-600">{legal.address}</p>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-ink underline">
              Lihat di Google Maps
            </a>
          </div>

          {settings?.shopee_store_url && (
            <div className={card}>
              <p className="text-sm font-bold text-slate-500">Toko Shopee resmi</p>
              <p className="mt-1 text-slate-600">Belanja juga bisa lewat toko Shopee kami.</p>
              <a
                href={settings.shopee_store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:brightness-95"
              >
                Kunjungi Urbanix di Shopee
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
          <p className="font-extrabold text-amber-900">Waspada penipuan</p>
          <p className="mt-2 text-sm leading-6 text-amber-900/90">
            Info rekening pembayaran hanya diberikan lewat WhatsApp resmi di atas, atas nama {legal.company}. Kami
            tidak pernah meminta transfer ke rekening pribadi atau dari nomor lain. Ragu? Tanyakan dulu ke admin.
          </p>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Baca juga <Link href="/syarat-ketentuan" className="font-semibold underline">Syarat &amp; Ketentuan</Link> dan{' '}
          <Link href="/kebijakan-privasi" className="font-semibold underline">Kebijakan Privasi</Link>.
        </p>
      </div>
    </div>
  );
}
