import Link from 'next/link';
import BannerSlider, { type BannerSlide } from '@/components/BannerSlider';
import FeatureIcon from '@/components/FeatureIcon';
import { CategoryStrip, FlashSale, ReviewsSection, WhatsappBand } from '@/components/HomeSections';
import ProductCard from '@/components/ProductCard';
import PromoCountdown from '@/components/PromoCountdown';
import WhatsappPromoPopup from '@/components/WhatsappPromoPopup';
import {
  API,
  getActiveProducts,
  getCategories,
  getReviews,
  getStoreSettings,
  promoSummary,
  type Product,
} from '@/lib/api';
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
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
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

  const [categories, settings, reviews] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getReviews({ limit: 6 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PER_PAGE));
  const requestedPage = parseInt(params?.hal || '1', 10) || 1;
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  const products = allProducts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const promo = promoSummary(allProducts);
  const promoProducts = allProducts
    .filter((p) => (p.discount_percent ?? 0) > 0)
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, 12);

  const waPercent = Number(settings?.whatsapp_discount_percent) || 0;
  const waNumber = settings?.whatsapp_number ?? '';
  const waOnPromo = settings?.whatsapp_discount_on_promo ?? false;

  const slides = loadBannerSlides();
  const { features, featuresTitle } = siteConfig;

  return (
    <div className="pb-4">
      {settings?.show_whatsapp_popup && waNumber && (
        <WhatsappPromoPopup percent={waPercent} whatsappNumber={waNumber} appliesToPromo={waOnPromo} />
      )}

      {/* 1. Banner + panel promo */}
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className={`grid gap-4 ${promo ? 'lg:grid-cols-[1.75fr_1fr]' : ''}`}>
          {slides.length > 0 ? (
            <BannerSlider slides={slides} />
          ) : (
            <div className="flex flex-col justify-center rounded-[28px] bg-white p-8 ring-1 ring-slate-200 sm:p-12">
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Kamera, lensa, dan gear kreator dalam satu toko.
              </h1>
              <Link href="/produk" className="mt-6 w-fit rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600">
                Belanja sekarang
              </Link>
            </div>
          )}
          {promo && (
            <PromoCountdown name={promo.name} maxDiscount={promo.maxDiscount} count={promo.count} endsAt={promo.endsAt} />
          )}
        </div>
      </section>

      {/* 2. Kategori bergambar */}
      <CategoryStrip categories={categories} products={allProducts} />

      {/* 3. Produk promo, potongan terbesar dulu */}
      {promo && <FlashSale products={promoProducts} promoName={promo.name} />}

      {/* 4. Cara pesan via WhatsApp + diskon */}
      <WhatsappBand percent={waPercent} whatsappNumber={waNumber} appliesToPromo={waOnPromo} />

      {/* 5. Produk pilihan: 8 produk (4 + 4) dengan tombol halaman */}
      <section id="produk-pilihan" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Produk pilihan</h2>
          <Link href="/produk" className="shrink-0 text-sm font-bold text-brand-600 hover:text-brand-700">
            Lihat semua produk
          </Link>
        </div>

        {productError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">Produk gagal dimuat</p>
            <p className="mt-2 text-sm text-slate-600">Pastikan backend Django berjalan dan API produk dapat diakses.</p>
            <p className="mt-2 break-all text-xs text-slate-500">API: {API}/products/</p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold">Produk belum tersedia</p>
            <p className="mt-2 text-sm text-slate-500">Silakan cek kembali sebentar lagi.</p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label="Halaman produk" className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {page > 1 && <PageLink page={page - 1} direction="prev" />}
                <span className="px-2 text-sm font-semibold text-slate-500">
                  Halaman {page} dari {totalPages}
                </span>
                {page < totalPages && <PageLink page={page + 1} direction="next" />}
              </nav>
            )}
          </>
        )}
      </section>

      {/* 6. Ulasan asli pembeli */}
      <ReviewsSection reviews={reviews} settings={settings} />

      {/* 7. Keunggulan toko: daftar ringkas, bukan kartu */}
      <section aria-labelledby="judul-keunggulan" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 id="judul-keunggulan" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {featuresTitle}
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <FeatureIcon name={feature.icon} size={22} />
              </span>
              <span>
                <span className="block font-bold text-ink">{feature.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
