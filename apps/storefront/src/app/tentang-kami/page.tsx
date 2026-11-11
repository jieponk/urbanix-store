import Link from 'next/link';
import FeatureIcon from '@/components/FeatureIcon';
import { getActiveProducts, getCategories, getStoreSettings } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'Tentang Kami',
  description:
    'Urbanix Store: toko gear kreator di Jakarta untuk kamera, lensa, drone, audio, dan aksesori original bergaransi. Capture Your Style.',
  alternates: { canonical: '/tentang-kami' },
};

export default async function AboutPage() {
  const [categories, settings, products] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getActiveProducts().catch(() => []),
  ]);
  const { legal, features, contact } = siteConfig;
  const whatsapp = (settings?.whatsapp_number || contact.whatsappNumber).replace(/\D/g, '');
  const rating = settings?.shopee_rating ? Number(settings.shopee_rating) : null;

  const stats = [
    products.length > 0 && { value: `${products.length}+`, label: 'produk siap kirim' },
    categories.length > 0 && { value: String(categories.length), label: 'kategori gear' },
    rating && { value: rating.toFixed(1), label: `rating toko di Shopee${settings?.shopee_rating_count ? ` (${settings.shopee_rating_count.toLocaleString('id-ID')} penilaian)` : ''}` },
  ].filter(Boolean) as { value: string; label: string }[];

  // Satu produk per kategori untuk kolase foto di bagian pembuka.
  const seen = new Set<number>();
  const showcase = products
    .filter((p) => p.image_url && !seen.has(p.category) && seen.add(p.category))
    .slice(0, 4);

  return (
    <div>
      {/* Pembuka */}
      <section className="relative overflow-hidden bg-cobalt-900 px-4 py-16 text-white sm:px-6 sm:py-24 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-sun-400 ring-1 ring-white/15">
              Tentang Urbanix
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Setiap cerita layak diabadikan dengan <span className="text-brand-500">gear yang tepat.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              Urbanix Store adalah toko perlengkapan kreator dari Jakarta. Kami membantu fotografer, videografer,
              dan content creator mendapatkan kamera, lensa, drone, audio, dan aksesori original, dengan harga
              transparan dan layanan yang cepat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/produk" className="rounded-xl bg-brand-500 px-6 py-3 font-bold text-white hover:brightness-95">
                Lihat produk
              </Link>
              <a href="#cerita" className="rounded-xl px-6 py-3 font-bold text-white ring-1 ring-white/30 hover:bg-white/10">
                Baca cerita kami
              </a>
            </div>
          </div>

          {showcase.length >= 2 && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {showcase.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/produk/${p.id}`}
                  className={`group rounded-2xl bg-white p-4 shadow-2xl shadow-black/30 transition hover:-translate-y-1 ${i % 2 === 1 ? 'translate-y-6' : ''}`}
                >
                  <span className="block aspect-square">
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />
                  </span>
                  <span className="mt-2 block truncate text-xs font-bold uppercase tracking-wider text-slate-500">
                    {p.category_name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Angka */}
      {stats.length > 0 && (
        <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
          <dl className="mx-auto grid max-w-4xl divide-y divide-slate-200 rounded-2xl bg-surface shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-5 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd>
                  <span className="block text-3xl font-extrabold text-cobalt-800 dark:text-sky-300">{s.value}</span>
                  <span className="text-sm text-slate-600">{s.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Cerita */}
      <section id="cerita" className="scroll-mt-28 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Cerita kami</h2>
            <div className="mt-5 space-y-4 text-[17px] leading-8 text-slate-700">
              <p>
                Urbanix lahir dari satu keyakinan sederhana: karya yang bagus dimulai dari alat yang tepat. Kami
                melihat banyak kreator kesulitan memilih gear: bingung soal keaslian, harga yang berbeda-beda,
                dan pertanyaan yang lama dijawab.
              </p>
              <p>
                Karena itu kami memilih produk dengan teliti, menampilkan harga dan promo apa adanya, dan
                menjawab pertanyaanmu secepat mungkin, dari pertimbangan sebelum membeli sampai urusan garansi
                setelahnya.
              </p>
              <blockquote className="border-l-4 border-brand-500 pl-5 text-xl font-bold leading-8 text-ink">
                “Capture Your Style” adalah janji kami: apa pun gaya berkaryamu, kami bantu siapkan
                perlengkapannya.
              </blockquote>
            </div>
          </div>

          <div className="rounded-3xl bg-mist p-6 sm:p-8">
            <h2 className="text-lg font-extrabold text-ink">Yang kami sediakan</h2>
            {categories.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/produk?category=${c.id}`}
                      className="inline-block rounded-full bg-surface px-3.5 py-1.5 text-sm font-semibold text-ink ring-1 ring-slate-200 hover:ring-ink"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-600">Kamera, lensa, drone, audio, lighting, dan aksesori kreator.</p>
            )}
          </div>
        </div>
      </section>

      {/* Janji */}
      <section className="bg-mist px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Janji kami untukmu</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-surface p-6 ring-1 ring-slate-200">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-cobalt-900 text-sun-400">
                  <FeatureIcon name={f.icon} size={24} />
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cara belanja */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Belanja dengan cara yang kamu suka</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="flex gap-5 rounded-2xl p-6 ring-1 ring-slate-200 transition hover:shadow-lg hover:ring-slate-300">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                <FeatureIcon name="chat" size={24} />
              </span>
              <div>
              <h3 className="text-lg font-extrabold text-ink">Langsung di website</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Pilih produk dan varian, pakai voucher, lalu pesanan terkirim otomatis ke WhatsApp admin kami.
                Admin akan mengonfirmasi stok, ongkir, dan pembayaran.
              </p>
              </div>
            </div>
            <div className="flex gap-5 rounded-2xl p-6 ring-1 ring-slate-200 transition hover:shadow-lg hover:ring-slate-300">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                <FeatureIcon name="box" size={24} />
              </span>
              <div>
              <h3 className="text-lg font-extrabold text-ink">Lewat toko Shopee kami</h3>
              <p className="mt-2 leading-7 text-slate-600">
                Lebih nyaman berbelanja di Shopee? Setiap produk punya tombol menuju halaman yang sama di toko
                Shopee resmi Urbanix.
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Info perusahaan + ajakan */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl bg-cobalt-900 p-8 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sun-400">Dikelola oleh</p>
            <p className="mt-2 text-2xl font-extrabold">{legal.company}</p>
            <p className="mt-2 max-w-xl text-white/75">{legal.address}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/produk" className="rounded-xl bg-brand-500 px-6 py-3 font-bold text-white hover:brightness-95">
              Mulai belanja
            </Link>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white px-6 py-3 font-bold text-cobalt-900 hover:bg-sun-100"
              >
                Chat admin
              </a>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
