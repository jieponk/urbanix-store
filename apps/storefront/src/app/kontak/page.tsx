import Link from 'next/link';
import FeatureIcon, { type FeatureIconName } from '@/components/FeatureIcon';
import { getStoreSettings } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'Kontak',
  description: 'Hubungi Urbanix Store lewat WhatsApp atau email. Jam operasional, alamat kantor, dan info rekening resmi.',
  alternates: { canonical: '/kontak' },
};

function displayPhone(number: string) {
  const local = number.replace(/\D/g, '').replace(/^62/, '0');
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

const faqs = [
  {
    q: 'Bagaimana cara cek stok atau tanya rekomendasi gear?',
    a: 'Chat admin lewat WhatsApp dengan menyebutkan nama produk atau kebutuhanmu. Admin akan membantu mengecek stok dan memberi pilihan yang cocok.',
  },
  {
    q: 'Ke rekening mana saya membayar?',
    a: `Hanya ke rekening resmi atas nama ${siteConfig.legal.company}, yang diinformasikan admin lewat WhatsApp resmi setelah pesanan dikonfirmasi.`,
  },
  {
    q: 'Bagaimana cara cek status pesanan?',
    a: 'Buka tautan halaman pesanan yang muncul setelah checkout, atau kirim nomor pesananmu ke admin lewat WhatsApp.',
  },
  {
    q: 'Barang yang saya terima bermasalah, harus bagaimana?',
    a: `Hubungi admin maksimal ${siteConfig.legal.returnWindow} sejak paket diterima dan sertakan video unboxing. Ketentuan lengkapnya ada di Syarat & Ketentuan.`,
  },
];

export default async function ContactPage() {
  const settings = await getStoreSettings();
  const { contact, legal } = siteConfig;
  const whatsapp = (settings?.whatsapp_number || contact.whatsappNumber).replace(/\D/g, '');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(legal.address)}`;
  const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(legal.address)}&output=embed`;

  const channels: { icon: FeatureIconName; label: string; value: string; note: string; href: string; cta: string; accent: string }[] = [];
  if (whatsapp) {
    channels.push({
      icon: 'chat',
      label: 'WhatsApp',
      value: displayPhone(whatsapp),
      note: 'Cara tercepat: tanya stok, rekomendasi, dan konfirmasi pesanan.',
      href: `https://wa.me/${whatsapp}`,
      cta: 'Mulai chat',
      accent: 'bg-emerald-700 text-white',
    });
  }
  channels.push({
    icon: 'doc',
    label: 'Email',
    value: contact.email,
    note: 'Untuk kerja sama, penawaran, dan pertanyaan yang lebih panjang.',
    href: `mailto:${contact.email}`,
    cta: 'Kirim email',
    accent: 'bg-cobalt-800 text-white',
  });
  if (settings?.shopee_store_url) {
    channels.push({
      icon: 'box',
      label: 'Toko Shopee',
      value: 'Urbanix di Shopee',
      note: 'Lebih nyaman belanja di Shopee? Produk yang sama tersedia di sana.',
      href: settings.shopee_store_url,
      cta: 'Kunjungi toko',
      accent: 'bg-brand-600 text-white',
    });
  }

  return (
    <div>
      {/* Pembuka */}
      <section className="relative overflow-hidden bg-cobalt-900 px-4 pb-24 pt-12 text-white sm:px-6 sm:pb-32 sm:pt-16 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span className="mx-2">/</span>
            <span className="text-white/90">Kontak</span>
          </nav>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-sun-400">Hubungi kami</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ada pertanyaan? Admin kami siap membantu.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">
            Tanya stok, minta rekomendasi gear, atau cek pesanan. Pilih cara yang paling nyaman untukmu.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white/85 ring-1 ring-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {contact.hours}
          </p>
        </div>
      </section>

      {/* Saluran kontak */}
      <section className="relative -mt-16 px-4 sm:-mt-20 sm:px-6 lg:px-8">
        <div className={`mx-auto grid max-w-6xl gap-4 ${channels.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith('http') ? '_blank' : undefined}
              rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group flex flex-col rounded-2xl bg-surface p-6 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-2xl"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.accent}`}>
                <FeatureIcon name={c.icon} size={24} />
              </span>
              <span className="mt-4 text-sm font-bold uppercase tracking-wider text-slate-500">{c.label}</span>
              <span className="mt-1 break-all text-xl font-extrabold text-ink">{c.value}</span>
              <span className="mt-2 flex-1 text-sm leading-6 text-slate-600">{c.note}</span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                {c.cta}
                <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Kantor + jam */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200">
            <iframe
              title="Peta lokasi kantor Urbanix Store"
              src={mapsEmbed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-64 w-full border-0 sm:h-80"
            />
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Kantor</p>
                <p className="mt-1 text-lg font-extrabold text-ink">{legal.company}</p>
                <p className="mt-1 max-w-md leading-7 text-slate-600">{legal.address}</p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-xl bg-mist px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 hover:ring-ink"
              >
                Buka di Google Maps
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl bg-surface p-6 ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mist text-ink">
                  <FeatureIcon name="bolt" size={20} />
                </span>
                <p className="text-lg font-extrabold text-ink">Jam operasional admin</p>
              </div>
              <p className="mt-4 text-2xl font-extrabold text-ink">{contact.hours}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Pesan di luar jam ini tetap bisa dikirim dan akan dibalas pada jam kerja berikutnya.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <FeatureIcon name="shield" size={20} />
                </span>
                <p className="text-lg font-extrabold text-amber-900">Waspada penipuan</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-amber-900">
                Info rekening hanya diberikan lewat WhatsApp resmi {whatsapp ? displayPhone(whatsapp) : 'kami'}, atas
                nama <b>{legal.company}</b>. Kami tidak pernah meminta transfer ke rekening pribadi atau dari nomor
                lain. Ragu? Tanyakan dulu ke admin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pertanyaan umum */}
      <section className="bg-mist px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Pertanyaan yang sering ditanyakan</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-surface ring-1 ring-slate-200 open:ring-ink">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-lg transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 leading-7 text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-600">
            Baca juga{' '}
            <Link href="/syarat-ketentuan" className="font-bold text-ink underline">Syarat &amp; Ketentuan</Link> dan{' '}
            <Link href="/kebijakan-privasi" className="font-bold text-ink underline">Kebijakan Privasi</Link>.
          </p>
        </div>
      </section>
    </div>
  );
}
