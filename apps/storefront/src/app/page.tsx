import Link from 'next/link';
import BannerSlider, { type BannerSlide } from '@/components/BannerSlider';
import FeatureIcon from '@/components/FeatureIcon';
import ProductCard from '@/components/ProductCard';
import { API, getActiveProducts, type Product } from '@/lib/api';
import { listPublicImages, publicUrl } from '@/lib/assets';
import { siteConfig } from '@/lib/siteConfig';

const PER_PAGE = 8;

type SearchParams = { hal?: string };

function loadBannerSlides(): BannerSlide[] {
  return listPublicImages('banners').map((file) => ({
    src: publicUrl('banners', file),
    alt: file
      .replace(/\.[^.]+$/, '')
      .replace(/^\d+[-_.\s]*/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Banner promo',
    href: siteConfig.bannerLinks[file],
  }));
}

function PageLink({
  page,
  direction,
}: {
  page: number;
  direction: 'prev' | 'next';
}) {
  const isNext = direction === 'next';

  return (
    <Link
      href={`/?hal=${page}#produk-pilihan`}
      scroll={false}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"
    >
      {!isNext && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      )}
      {isNext ? 'Berikutnya' : 'Sebelumnya'}
      {isNext && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      )}
    </Link>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const params = await searchParams;

  let allProducts: Product[] = [];
  let productError = false;

  try {
    allProducts = await getActiveProducts();
  } catch {
    productError = true;
  }

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PER_PAGE));
  const requestedPage = parseInt(params?.hal || '1', 10) || 1;
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  const products = allProducts.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  // Produk yang sedang promo "Potong harga" (diskon terbesar dulu), maks. 8.
  const promoProducts = allProducts
    .filter((p) => (p.discount_percent ?? 0) > 0)
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, 8);

  const slides = loadBannerSlides();
  const { features, featuresTitle, highlights } = siteConfig;

  return (
    <div className="bg-white text-slate-900">
      {/* 1. Banner: slideshow dari folder public/banners, atau banner teks bawaan */}
      {slides.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <BannerSlider slides={slides} />
        </section>
      ) : (
        <section className="bg-gradient-to-br from-[#171717] via-[#1f1f1f] to-[#2b1608] text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-orange-400 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                URBANIX STORE
              </span>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Gear terbaik.
                <br />
                <span className="text-orange-500">Cerita dimulai.</span>
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
                Temukan perlengkapan kamera dan gear kreator untuk setiap
                momen yang ingin kamu abadikan.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/produk"
                  className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                >
                  Belanja sekarang
                </Link>
                <Link
                  href="#produk-pilihan"
                  className="rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Lihat pilihan kami
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sedang promo: hanya muncul bila ada promo "Potong harga" yang berjalan */}
      {promoProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-red-50 via-orange-50 to-white p-4 ring-1 ring-red-100 sm:p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600 sm:text-xs">
                  Potong harga
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Sedang promo</h2>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {promoProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 2. Produk pilihan: 8 produk (4 + 4) dengan tombol halaman */}
      <section
        id="produk-pilihan"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
              Pilihan untukmu
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              Produk pilihan
            </h2>
          </div>
          <Link
            href="/produk"
            className="shrink-0 text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            Lihat semua →
          </Link>
        </div>

        {productError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">Produk gagal dimuat</p>
            <p className="mt-2 text-sm text-slate-600">
              Pastikan backend Django berjalan dan API produk dapat diakses.
            </p>
            <p className="mt-2 break-all text-xs text-slate-500">
              API: {API}/products/
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold">Produk belum tersedia</p>
            <p className="mt-2 text-sm text-slate-500">
              Silakan cek kembali sebentar lagi.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Halaman produk"
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
              >
                {page > 1 && <PageLink page={page - 1} direction="prev" />}
                <span className="px-2 text-sm font-semibold text-slate-500">
                  Halaman {page} dari {totalPages}
                </span>
                {page < totalPages && (
                  <PageLink page={page + 1} direction="next" />
                )}
              </nav>
            )}
          </>
        )}
      </section>

      {/* 3. Keunggulan toko */}
      <section className="bg-orange-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
              Keunggulan kami
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {featuresTitle}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-orange-100 bg-white p-5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <FeatureIcon name={feature.icon} />
                </span>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Teks berjalan: pelayanan toko */}
      <section
        aria-label="Keunggulan Urbanix Store"
        className="overflow-hidden border-y border-slate-200 bg-white py-4"
      >
        <div className="marquee-track flex w-max text-sm font-semibold text-slate-700">
          {[...highlights, ...highlights].map((text, index) => (
            <span
              key={index}
              aria-hidden={index >= highlights.length}
              className="flex items-center gap-3 whitespace-nowrap pr-12"
            >
              <span className="text-orange-500">★</span>
              {text}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
