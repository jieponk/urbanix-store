import Link from 'next/link';
import { money, type Category, type Product, type Review, type StoreSettings } from '@/lib/api';
import { productImg } from '@/lib/img';
import ShopeeReviewsLink from '@/components/ShopeeReviewsLink';
import { Bolt, Countdown, QuotaBar } from '@/components/FlashSale';
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

/**
 * Deretan produk promo. Bila ada flash sale berjalan (flash=true): judul petir + hitung mundur,
 * dan tiap kartu punya bar sisa kuota.
 */
export function FlashSale({ products, promoName, flash = false, endsAt = null }: { products: Product[]; promoName: string; flash?: boolean; endsAt?: string | null }) {
  const t = getT();
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="judul-flash" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      {/* Panel putih ala mockup Mode Event: petir merah, hitung mundur, kartu bergaris */}
      <div className="rounded-3xl bg-surface p-4 ring-1 ring-slate-200 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="judul-flash" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">
              {flash ? <span className="text-sale-600"><Bolt size={26} /></span> : <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-sale-600" />}
              {flash ? t('Flash Sale') : promoName}
            </h2>
            {flash && endsAt ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                {t('Berakhir dalam')}
                <Countdown endsAt={endsAt} tone="light" />
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-slate-500">{t('Potongan terbesar tampil paling depan.')}</p>
            )}
          </div>
          <Link
            href={flash ? '/produk?flash=1' : '/produk?promo=1'}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-surface transition hover:opacity-90"
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
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
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
                    {product.flash?.quota != null ? (
                      <span className="mt-auto block pt-2.5">
                        <QuotaBar flash={product.flash} />
                      </span>
                    ) : (
                      <span className="mt-auto pt-2 text-xs font-bold text-sale-600">{t('Hemat {x}', { x: money(normal - final) })}</span>
                    )}
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
                <span className="wa-pop rounded-full bg-sun-400 px-3 py-1 text-sm font-extrabold text-white">
                  {t('Hemat {n}%', { n: percent })}
                </span>
              )}
            </div>
            <h2 id="judul-wa" className="mt-5 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
              {percent > 0 ? (
                <>
                  {t('Pesan via WhatsApp,')} <span className="text-sun-300">{t('lebih hemat {n}%', { n: percent })}</span>
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

          {/* HP: tiga langkah dalam satu baris yang bisa digeser (tidak terlalu tinggi); PC: tiga kolom */}
          <ol className="relative -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0">
            {/* Garis penghubung yang "mengalir" */}
            <svg aria-hidden="true" className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-2 sm:block" preserveAspectRatio="none" viewBox="0 0 100 2">
              <line x1="0" y1="1" x2="100" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="wa-flow text-white/25" />
            </svg>
            {steps.map((step, i) => (
              <li key={i} className="relative flex w-[80%] shrink-0 snap-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 sm:w-auto sm:flex-col sm:gap-3 sm:bg-transparent sm:p-0 sm:text-center sm:ring-0">
                <span className="relative mx-0 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-cobalt-900 sm:mx-auto sm:h-[72px] sm:w-[72px]">
                  {step.icon}
                  <span className="absolute -left-2.5 -top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-sun-400 text-[13px] font-extrabold text-white shadow-md ring-4 ring-cobalt-900">
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
      <rect className="wa-drop" x="20" y="6" width="10" height="10" rx="2" fill="#e30220" stroke="none" />
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

/* ------------------------------------------------------------ Zona hemat (dari mockup Mode Event) */

const finalPrice = (p: Product) => Number(p.final_price ?? p.discount_price ?? p.price) || 0;

/** 4 kotak pintasan belanja menurut harga & promo. Hanya zona yang ada produknya yang tampil. */
export function PriceZones({ products }: { products: Product[] }) {
  const t = getT();
  const inStock = products.filter((p) => p.stock > 0);
  const under100 = inStock.filter((p) => finalPrice(p) < 100_000).length;
  const under500 = inStock.filter((p) => finalPrice(p) < 500_000).length;
  const promo = inStock.filter((p) => (p.discount_percent ?? 0) > 0);
  const maxOff = Math.max(0, ...promo.map((p) => p.discount_percent ?? 0));
  const sold = inStock.filter((p) => (p.sold_count ?? 0) > 0).length;
  const zones = [
    { href: '/produk?harga=0-100', label: t('Di bawah'), value: t('100 ribu'), note: t('{n} produk · aksesori & memori', { n: under100 }), show: under100 > 0 },
    { href: '/produk?harga=0-500', label: t('Di bawah'), value: t('500 ribu'), note: t('{n} produk · mic, tripod, lighting', { n: under500 }), show: under500 > 0 },
    { href: '/produk?promo=1', label: t('Diskon'), value: t('s/d {n}%', { n: maxOff }), note: t('{n} produk lagi promo', { n: promo.length }), show: promo.length > 0, hot: true },
    { href: '/produk?urut=terlaris', label: t('Pilihan pembeli'), value: t('Terlaris'), note: t('Yang paling sering dibeli'), show: sold > 0 },
  ].filter((z) => z.show);
  if (zones.length < 2) return null;
  return (
    <section aria-labelledby="judul-zona" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <h2 id="judul-zona" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t('Zona hemat')}</h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {zones.map((z) => (
          <li key={z.href}>
            <Link
              href={z.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-surface p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg sm:p-5"
            >
              <span className="text-xs font-bold text-slate-500 sm:text-[13px]">{z.label}</span>
              <span className={`mt-0.5 text-2xl font-extrabold tracking-tight sm:text-[28px] ${z.hot ? 'text-sale-600' : 'text-ink'}`}>{z.value}</span>
              <span className="mt-1 text-xs leading-snug text-slate-500 sm:text-[13px]">{z.note}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-extrabold text-ink">
                {t('Lihat')} <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ Brand Corner */

/** Merek yang ada produknya. Logo resmi dipakai bila file ada di public/brands, selain itu nama merek. */
export function BrandCorner({ brands }: { brands: { name: string; count: number; logo?: string }[] }) {
  const t = getT();
  if (brands.length < 3) return null;
  return (
    <section aria-labelledby="judul-brand" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <h2 id="judul-brand" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t('Brand Corner')}</h2>
        <Link href="/produk" className="shrink-0 text-sm font-bold text-ink hover:underline">{t('Semua produk')}</Link>
      </div>
      <ul className="scroll-row -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
        {brands.map((b) => (
          <li key={b.name} className="w-[132px] shrink-0 sm:w-auto">
            <Link
              href={`/produk?merek=${encodeURIComponent(b.name)}`}
              className="group flex h-[76px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 transition hover:border-slate-400 hover:shadow-md"
              title={t('{n} produk {brand}', { n: b.count, brand: b.name })}
            >
              {b.logo ? (
                <img src={b.logo} alt={b.name} loading="lazy" className="h-7 w-auto max-w-[110px] object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0" />
              ) : (
                <span className="text-[15px] font-extrabold tracking-tight text-slate-600 transition group-hover:text-slate-900">{b.name}</span>
              )}
              <span className="mt-1 text-[11px] font-semibold text-slate-400">{t('{n} produk', { n: b.count })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ Paling laris */

/** Produk dengan penjualan terbanyak di web (angka asli dari pesanan). Disembunyikan bila belum ada penjualan. */
export function BestSellers({ products }: { products: Product[] }) {
  const t = getT();
  const best = products
    .filter((p) => (p.sold_count ?? 0) > 0)
    .sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0))
    .slice(0, 4);
  if (best.length < 2) return null;
  return (
    <section aria-labelledby="judul-laris" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <h2 id="judul-laris" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t('Paling laris')}</h2>
        <Link href="/produk?urut=terlaris" className="shrink-0 text-sm font-bold text-ink hover:underline">{t('Lihat semua')}</Link>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {best.map((p, i) => {
          const normal = Number(p.price) || 0;
          const final = finalPrice(p);
          return (
            <li key={p.id}>
              <Link href={`/produk/${p.id}`} className="group flex h-full gap-3 rounded-2xl border border-slate-200 bg-surface p-3 transition hover:border-slate-300 hover:shadow-lg">
                <span className="relative shrink-0">
                  <img src={productImg(p.image_url, 200)} alt="" loading="lazy" width={84} height={84} className="h-[84px] w-[84px] rounded-xl bg-white object-contain p-1 ring-1 ring-slate-100" />
                  <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[11px] font-extrabold text-surface">{i + 1}</span>
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink group-hover:underline">{p.name.replace(/^URBANIX\s*-\s*/i, '')}</span>
                  <span className={`mt-1 text-[15px] font-extrabold ${final < normal ? 'text-sale-600' : 'text-ink'}`}>{money(final)}</span>
                  <span className="mt-auto text-xs text-slate-500">
                    {t('Terjual {n}', { n: p.sold_count ?? 0 })}
                    {p.review_count && p.rating_avg != null ? ` · ★ ${p.rating_avg.toFixed(1)}` : ''}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
