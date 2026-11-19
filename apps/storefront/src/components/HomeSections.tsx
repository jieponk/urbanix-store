import Link from 'next/link';
import { money, type Category, type Product, type Review, type StoreSettings } from '@/lib/api';
import { productImg } from '@/lib/img';
import ShopeeReviewsLink from '@/components/ShopeeReviewsLink';
import { Bolt, Countdown, QuotaBar } from '@/components/FlashSale';
import { getT } from '@/lib/lang-server';
import WaTypingPrompt from '@/components/WaTypingPrompt';
import SimpleIcon, { SIMPLE_ICONS, simpleIconFor } from '@/components/SimpleIcon';

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

/** Pesan ke admin tetap Bahasa Indonesia; label tampilan diterjemahkan. */
const WA_QUESTIONS = [
  { label: 'Kamera buat vlog?', message: 'Halo admin Urbanix, aku cari kamera buat vlog. Budget-ku sekitar Rp…, ada saran?' },
  { label: 'Lensa yang cocok?', message: 'Halo admin Urbanix, aku mau cari lensa yang cocok buat kameraku (…). Ada rekomendasi?' },
  { label: 'Mic buat konten?', message: 'Halo admin Urbanix, aku butuh mic buat bikin konten. Yang cocok apa ya?' },
  { label: 'Apakah stok ready?', message: 'Halo admin Urbanix, apakah stok produk … ready?' },
  { label: 'Bisa dikirim hari ini?', message: 'Halo admin Urbanix, kalau aku order sekarang, apakah bisa dikirim hari ini?' },
];

export function WhatsappBand({ percent, whatsappNumber, appliesToPromo }: { percent: number; whatsappNumber: string; appliesToPromo: boolean }) {
  const t = getT();
  if (!whatsappNumber) return null;
  const message = encodeURIComponent('Halo admin Urbanix, aku mau tanya-tanya soal gear dulu 🙌');
  // Hal yang bisa ditanyakan; dibuat seperti chip obrolan, bukan tata cara.
  const questions = WA_QUESTIONS.map((q) => ({ label: t(q.label), message: q.message }));

  return (
    <section id="cara-pesan" aria-labelledby="judul-wa" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-12 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-2xl bg-cobalt-900 p-5 text-white sm:p-8 lg:p-10">
        {/* Aksen latar: gelembung chat samar */}
        <svg aria-hidden="true" viewBox="0 0 200 200" className="wa-float pointer-events-none absolute -right-10 -top-10 -z-10 h-48 w-48 text-white/[0.05] sm:h-72 sm:w-72">
          <path fill="currentColor" d="M100 10a90 90 0 0 0-78 135L10 190l46-12A90 90 0 1 0 100 10z" />
        </svg>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex items-start gap-4">
            <span className="relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
              <span aria-hidden="true" className="wa-ring absolute inset-0 rounded-full bg-emerald-500/40" />
              <span aria-hidden="true" className="wa-ring wa-ring-2 absolute inset-0 rounded-full bg-emerald-500/30" />
              <span className="wa-wiggle relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-900/40 sm:h-14 sm:w-14">
                <WaLogo />
              </span>
            </span>
            <div className="min-w-0">
              <h2 id="judul-wa" className="text-xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                {t('Butuh bantuan pilih gear?')}{' '}
                <span className="text-sun-300">{t('Chat aja dulu.')}</span>
              </h2>
              <p className="mt-2 max-w-xl text-[13px] leading-6 text-white/75 sm:text-[15px]">
                {percent > 0
                  ? t('Ngobrol langsung sama admin, bukan bot. Kita bantu cariin yang pas sama budget & konten kamu. Kalau cocok, order via WhatsApp langsung hemat {n}%.', { n: percent })
                  : t('Ngobrol langsung sama admin, bukan bot. Kita bantu cariin yang pas sama budget & konten kamu.')}
                {percent > 0 && !appliesToPromo && ' ' + t('(Potongan tidak berlaku untuk produk promo.)')}
              </p>
              <WaTypingPrompt whatsappNumber={whatsappNumber} questions={questions} />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            {percent > 0 && (
              <span className="wa-pop self-start rounded-full bg-white px-3 py-1 text-sm font-extrabold text-cobalt-900 lg:self-end">
                {t('Hemat {n}%', { n: percent })}
              </span>
            )}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-600"
            >
              <WaLogo size={18} />
              {t('Chat admin sekarang')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Logo WhatsApp (Simple Icons), putih di atas lingkaran hijau. */
function WaLogo({ size = 28 }: { size?: number }) {
  return <SimpleIcon name="whatsapp" color="current" size={size} className="text-white" />;
}

/* Ikon langkah: bergerak halus terus-menerus (mati otomatis bila pengguna memilih kurangi gerakan) */
const stepSvg = { width: 40, height: 40, viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };




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

const finalPrice = (p: Product) => Number(p.final_price ?? p.discount_price ?? p.price) || 0;

/* ------------------------------------------------------------ Brand Corner */

const FULL_COLOR_LOGOS = new Set(['kodak']);

/**
 * Logo cadangan dari Simple Icons (merek tanpa file logo resmi). Logo berupa tulisan (Sony, Nikon, Fujifilm)
 * ditampilkan lebar; logo berupa simbol (Insta360, Leica, Xiaomi) ditemani nama mereknya.
 */
export function BrandFallback({ name }: { name: string }) {
  const icon = simpleIconFor(name)!;
  const dark = SIMPLE_ICONS[icon].hex === '000000';
  const tint = dark ? 'text-ink' : '';
  if ('mark' in SIMPLE_ICONS[icon]) {
    return (
      <span className={`inline-flex items-center gap-2 ${tint}`}>
        <SimpleIcon name={icon} size={26} color={dark ? 'current' : 'brand'} />
        <span className="text-[16px] font-extrabold tracking-tight text-ink">{name}</span>
      </span>
    );
  }
  return <SimpleIcon name={icon} size={104} color={dark ? 'current' : 'brand'} className={`-my-8 ${tint} dark:brightness-125`} title={name} />;
}

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
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {brands.map((b) => (
          <li key={b.name}>
            <Link
              href={`/produk?merek=${encodeURIComponent(b.name)}`}
              className="group flex h-[88px] flex-col items-center justify-center gap-2 rounded-2xl bg-surface px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-slate-200 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300"
              title={t('{n} produk {brand}', { n: b.count, brand: b.name })}
            >
              {b.logo ? (
                <img src={b.logo} alt={b.name} loading="lazy" className={`w-full object-contain transition duration-300 group-hover:scale-105 ${
                    // Logo kotak berwarna penuh (Kodak) tetap apa adanya & sedikit lebih tinggi; logo hitam dibalik jadi putih di mode gelap
                    // (invert + hue-rotate menjaga warna aksen seperti oranye Vanguard/K&F dan merah Lexar).
                    FULL_COLOR_LOGOS.has(b.name.toLowerCase())
                      ? 'h-12 max-w-[60px]'
                      : 'h-9 max-w-[150px] sm:h-10 sm:max-w-[170px] dark:hue-rotate-180 dark:invert'
                  }`} />
              ) : simpleIconFor(b.name) ? (
                <BrandFallback name={b.name} />
              ) : (
                <span className="text-[17px] font-extrabold tracking-tight text-ink">{b.name}</span>
              )}
              <span className="text-[11px] font-semibold text-slate-500">{t('{n} produk', { n: b.count })}</span>
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
