import Link from 'next/link';
import { money, type Category, type Product, type Review, type StoreSettings } from '@/lib/api';
import { productImg } from '@/lib/img';
import ShopeeReviewsLink from '@/components/ShopeeReviewsLink';

/* ------------------------------------------------------------ Kategori */

const CATEGORY_ART = new Set([
  'kamera', 'action-cam', 'drone', 'audio-mic', 'tas-case', 'lensa-filter', 'stabilizer-tripod',
  'lighting-studio', 'streaming-video', 'memory-gadget', 'aksesori-kamera', 'cctv-keamanan',
  'webcam-komputer', 'lainnya',
]);

/** "Audio & Mic" -> "audio-mic" (sama dengan slug kategori di backend). */
function categorySlug(category: Category) {
  const slug =
    category.slug ||
    category.name.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return CATEGORY_ART.has(slug) ? slug : 'lainnya';
}

export function CategoryStrip({ categories, products }: { categories: Category[]; products: Product[] }) {
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
        Belanja per kategori
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
              <span className="mt-0.5 text-[11px] text-slate-500">{tile.count} produk</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------ Flash sale */

export function FlashSale({ products, promoName }: { products: Product[]; promoName: string }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="judul-flash" className="mt-10 bg-sun-400">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="judul-flash" className="text-2xl font-extrabold tracking-tight text-cobalt-900 sm:text-3xl">
              {promoName}
            </h2>
            <p className="mt-1 text-sm font-medium text-cobalt-800">Potongan terbesar tampil paling depan.</p>
          </div>
          <Link
            href="/produk?promo=1"
            className="shrink-0 rounded-full bg-cobalt-800 px-4 py-2 text-sm font-bold text-white hover:bg-cobalt-900"
          >
            Lihat semua
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
                    <span className="mt-auto pt-2 text-xs font-bold text-cobalt-700 dark:text-sky-300">Hemat {money(normal - final)}</span>
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
  if (!whatsappNumber) return null;
  const steps = [
    'Masukkan produk ke keranjang.',
    'Di checkout, pilih Pesan via WhatsApp.',
    percent > 0 ? `Kirim chat ke admin. Total sudah dipotong ${percent}%.` : 'Kirim chat ke admin untuk konfirmasi ongkir.',
  ];

  return (
    <section id="cara-pesan" aria-labelledby="judul-wa" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-12 sm:px-6 lg:px-8">
      <div className="grid gap-6 rounded-[28px] bg-cobalt-800 p-6 text-white sm:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <h2 id="judul-wa" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {percent > 0 ? `Pesan via WhatsApp, hemat ${percent}%` : 'Pesan via WhatsApp'}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/80">
            Admin mengecek stok, menghitung ongkir, dan mengirim cara pembayaran langsung di chat.
            {percent > 0 && !appliesToPromo && ' Potongan tidak berlaku untuk produk yang sedang promo.'}
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-cobalt-900 hover:bg-sun-100"
          >
            Chat admin sekarang
          </a>
        </div>
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step} className="rounded-2xl bg-cobalt-900/60 p-4 ring-1 ring-white/10">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sun-400 text-sm font-extrabold text-cobalt-900">
                {i + 1}
              </span>
              <p className="mt-3 text-sm font-semibold leading-6">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ Ulasan */

function Stars({ value, size = 16 }: { value: number; size?: number }) {
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
  title = 'Kata pembeli kami',
}: {
  reviews: Review[];
  settings: StoreSettings | null;
  title?: string;
}) {
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
                <span>dari {settings.shopee_rating_count.toLocaleString('id-ID')} penilaian di Shopee</span>
              ) : (
                <span>rating toko di Shopee</span>
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
