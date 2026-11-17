import Link from 'next/link';
import { money, type Category, type Product, type Review, type StoreSettings } from '@/lib/api';
import { productImg } from '@/lib/img';
import ShopeeReviewsLink from '@/components/ShopeeReviewsLink';
import { getT } from '@/lib/lang-server';

/* ------------------------------------------------------------ Kategori */

const CATEGORY_ART = new Set([
  'kamera', 'action-cam', 'drone', 'audio-mic', 'tas-case', 'lensa-filter', 'stabilizer-tripod',
  'lighting-studio', 'streaming-video', 'memory-gadget', 'aksesori-kamera', 'cctv-keamanan',
  'webcam-komputer', 'lainnya',
]);

/** Ilustrasi kategori di public/categories (dipakai juga di halaman promo). */
export function categoryArt(category: Category) {
  return `/categories/${categorySlug(category)}.svg`;
}

/** "Audio & Mic" -> "audio-mic" (sama dengan slug kategori di backend). */
function categorySlug(category: Category) {
  const slug =
    category.slug ||
    category.name.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return CATEGORY_ART.has(slug) ? slug : 'lainnya';
}

export function CategoryStrip({ categories, products }: { categories: Category[]; products: Product[] }) {
  const t = getT();
  // Sampul kategori = ilustrasi di public/categories/<slug>.svg
  const tiles = categories
    .map((category) => ({
      ...category,
      count: products.filter((p) => p.category === category.id).length,
      art: `/categories/${categorySlug(category)}.svg`,
    }))
    .filter((tile) => tile.count > 0)
    .sort((a, b) => b.count - a.count);

  if (tiles.length === 0) return null;

  return (
    <section aria-labelledby="judul-kategori" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <h2 id="judul-kategori" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
        {t('Belanja per kategori')}
      </h2>
      <ul className="scroll-row -mx-4 mt-5 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-y-6 sm:overflow-visible sm:px-0 lg:grid-cols-7">
        {tiles.map((tile) => (
          <li key={tile.id} className="w-[88px] shrink-0 sm:w-auto">
            <Link
              href={`/produk?category=${tile.id}`}
              className="group flex flex-col items-center rounded-2xl px-1 py-2 text-center"
            >
              <img
                src={tile.art}
                alt=""
                width={96}
                height={96}
                loading="lazy"
                className="h-[72px] w-[72px] transition-transform duration-200 group-hover:-translate-y-1 sm:h-24 sm:w-24"
              />
              <span className="mt-2 text-[13px] font-bold leading-tight text-ink group-hover:underline sm:text-sm">
                {tile.name}
              </span>
              <span className="mt-0.5 text-[11px] text-slate-500">{t('{n} produk', { n: tile.count })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ Flash sale */

export function FlashSale({ products, promoName }: { products: Product[]; promoName: string }) {
  const t = getT();
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="judul-flash" className="mt-10 bg-cobalt-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="judul-flash" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              <span aria-hidden="true" className="h-6 w-1.5 bg-sun-400" />
              {promoName}
            </h2>
            <p className="mt-1 text-sm font-medium text-white/65">{t('Potongan terbesar tampil paling depan.')}</p>
          </div>
          <Link
            href="/produk?promo=1"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-bold text-cobalt-900 transition hover:bg-white/85"
          >
            {t('Lihat semua')}
          </Link>
        </div>

        <ul className="scroll-row -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          {products.map((product) => {
            const normal = Number(product.price) || 0;
            const final = Number(product.final_price ?? product.price) || 0;
            return (
              <li key={product.id} className="w-[46%] shrink-0 sm:w-56">
                <Link
                  href={`/produk/${product.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <span className="relative block aspect-square bg-white p-3">
                    <img src={productImg(product.image_url, 300)} alt={product.name} loading="lazy" className="h-full w-full object-contain" />
                    <span className="absolute left-2 top-2 rounded-lg bg-sale-600 px-2 py-1 text-sm font-extrabold text-white">
                      -{product.discount_percent}%
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col p-3 pt-1">
                    <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{product.name.replace(/^URBANIX\s*-\s*/i, '')}</span>
                    <span className="mt-2 text-base font-extrabold text-sale-600">{money(final)}</span>
                    <span className="text-xs text-slate-400 line-through">{money(normal)}</span>
                    <span className="mt-auto pt-2 text-xs font-bold text-sale-600">{t('Hemat {x}', { x: money(normal - final) })}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Cara pesan via WhatsApp */

export function WhatsappBand({ percent, whatsappNumber, appliesToPromo }: { percent: number; whatsappNumber: string; appliesToPromo: boolean }) {
  const t = getT();
  if (!whatsappNumber) return null;
  const steps = [
    { icon: <StepCart />, title: t('Masukkan ke keranjang'), text: t('Pilih produk dan varian yang kamu mau.') },
    { icon: <StepForm />, title: t('Pilih "Pesan via WhatsApp"'), text: t('Di checkout, isi alamat lalu pilih cara pesan ini.') },
    {
      icon: <StepChat />,
      title: t('Kirim chat ke admin'),
      text: percent > 0 ? t('Total otomatis dipotong {n}%. Admin konfirmasi ongkir & pembayaran.', { n: percent }) : t('Admin konfirmasi ongkir & pembayaran.'),
    },
  ];

  return (
    <section id="cara-pesan" aria-labelledby="judul-wa" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-12 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-2xl bg-cobalt-900 p-6 text-white sm:p-8 lg:p-10">
        {/* Aksen latar: gelembung chat samar */}
        <svg aria-hidden="true" viewBox="0 0 200 200" className="wa-float pointer-events-none absolute -right-10 -top-10 -z-10 h-56 w-56 text-white/[0.04] sm:h-72 sm:w-72">
          <path fill="currentColor" d="M100 10a90 90 0 0 0-78 135L10 190l46-12A90 90 0 1 0 100 10z" />
        </svg>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.45fr] lg:items-center">
          <div>
            <div className="flex items-center gap-4">
              <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <span aria-hidden="true" className="wa-ring absolute inset-0 rounded-full bg-emerald-500/40" />
                <span aria-hidden="true" className="wa-ring wa-ring-2 absolute inset-0 rounded-full bg-emerald-500/30" />
                <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-900/40">
                  <WaLogo />
                </span>
              </span>
              {percent > 0 && (
                <span className="wa-pop rounded-full bg-sun-500 px-3 py-1 text-sm font-extrabold text-white">
                  {t('Hemat {n}%', { n: percent })}
                </span>
              )}
            </div>
            <h2 id="judul-wa" className="mt-5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {percent > 0 ? (
                <>
                  {t('Pesan via WhatsApp,')} <span className="text-sun-400">{t('lebih hemat {n}%', { n: percent })}</span>
                </>
              ) : (
                t('Pesan via WhatsApp')
              )}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/75">
              {t('Admin mengecek stok, menghitung ongkir, dan mengirim cara pembayaran langsung di chat.')}
              {percent > 0 && !appliesToPromo && ' ' + t('Potongan tidak berlaku untuk produk yang sedang promo.')}
            </p>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-600"
            >
              <WaLogo size={18} />
              {t('Chat admin sekarang')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>

          <ol className="relative grid gap-4 sm:grid-cols-3 sm:gap-5">
            {/* Garis penghubung yang "mengalir" */}
            <svg aria-hidden="true" className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-2 sm:block" preserveAspectRatio="none" viewBox="0 0 100 2">
              <line x1="0" y1="1" x2="100" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="wa-flow text-white/25" />
            </svg>
            {steps.map((step, i) => (
              <li key={i} className="relative flex gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:flex-col sm:gap-3 sm:bg-transparent sm:p-0 sm:text-center sm:ring-0">
                <span className="relative mx-0 flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl bg-white text-cobalt-900 sm:mx-auto">
                  {step.icon}
                  <span className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-sun-500 text-xs font-extrabold text-white ring-4 ring-cobalt-900">
                    {i + 1}
                  </span>
                </span>
                <span>
                  <span className="block text-sm font-extrabold">{step.title}</span>
                  <span className="mt-1 block text-[13px] leading-5 text-white/65">{step.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Ikon chat generik (bukan logo WhatsApp; logo bermerek hanya dari file resmi). */
function WaLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-white">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
      <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" strokeWidth="2.6" />
    </svg>
  );
}

/* Ikon langkah: bergerak halus terus-menerus (mati otomatis bila pengguna memilih kurangi gerakan) */
const stepSvg = { width: 40, height: 40, viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

function StepCart() {
  return (
    <svg {...stepSvg}>
      <rect className="wa-drop" x="20" y="6" width="10" height="10" rx="2" fill="#ff3b4e" stroke="none" />
      <path d="M5 12h5l4.5 20h21L40 18H16" />
      <circle cx="18" cy="39" r="2.6" />
      <circle cx="32" cy="39" r="2.6" />
    </svg>
  );
}

function StepForm() {
  return (
    <svg {...stepSvg}>
      <rect x="9" y="5" width="30" height="38" rx="4" />
      <path d="M16 15h16M16 22h10" />
      <circle cx="24" cy="33" r="6" fill="#22c55e" stroke="none" className="wa-pulse" />
      <path d="m21 33 2.2 2.2L27.5 31" stroke="#fff" strokeWidth="2.4" pathLength={1} className="wa-check" />
    </svg>
  );
}

function StepChat() {
  return (
    <svg {...stepSvg}>
      <path d="M8 10h32a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H20l-8 7v-7H8a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" />
      <circle className="wa-dot" cx="16" cy="21.5" r="2.4" fill="currentColor" stroke="none" />
      <circle className="wa-dot wa-dot-2" cx="24" cy="21.5" r="2.4" fill="currentColor" stroke="none" />
      <circle className="wa-dot wa-dot-3" cx="32" cy="21.5" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ------------------------------------------------------------ Ulasan */

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span role="img" className="flex gap-0.5" aria-label={`${value} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z"
            fill={i <= Math.round(value) ? '#ffc93c' : '#dfe3ee'}
          />
        </svg>
      ))}
    </span>
  );
}

export function ReviewsSection({
  reviews,
  settings,
  title: titleProp,
}: {
  reviews: Review[];
  settings: StoreSettings | null;
  title?: string;
}) {
  const t = getT();
  const title = titleProp ?? t('Kata pembeli kami');
  const rating = Number(settings?.shopee_rating) || 0;
  const url = settings?.shopee_reviews_url;
  if (reviews.length === 0 && !rating && !url && !settings?.shopee_store_url) return null;

  return (
    <section aria-labelledby="judul-ulasan" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="judul-ulasan" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h2>
          {rating > 0 && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="text-2xl font-extrabold text-ink">{rating.toFixed(1)}</span>
              <Stars value={rating} />
              {settings?.shopee_rating_count ? (
                <span>{t('dari {n} penilaian di Shopee', { n: settings.shopee_rating_count.toLocaleString('id-ID') })}</span>
              ) : (
                <span>{t('rating toko di Shopee')}</span>
              )}
            </p>
          )}
        </div>
        <ShopeeReviewsLink
          reviewsUrl={url}
          storeUrl={settings?.shopee_store_url}
          className="text-sm font-bold text-ink hover:underline"
        />
      </div>

      {reviews.length > 0 && (
        <ul className="scroll-row -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {reviews.map((review) => (
            <li key={review.id} className="w-[82%] shrink-0 rounded-2xl bg-surface p-5 ring-1 ring-slate-200 sm:w-auto">
              <div className="flex items-center justify-between gap-3">
                <Stars value={review.rating} />
                <span className="text-xs text-slate-400">via {review.source}</span>
              </div>
              {review.text && <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-700">{review.text}</p>}
              <p className="mt-3 text-sm font-bold text-ink">{review.name}</p>
              {review.product_name && (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {review.product_id ? (
                    <Link href={`/produk/${review.product_id}`} className="hover:text-slate-900">
                      {review.product_name.replace(/^URBANIX\s*-\s*/i, '')}
                    </Link>
                  ) : (
                    review.product_name
                  )}
                  {review.variation_name && `, ${review.variation_name}`}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
