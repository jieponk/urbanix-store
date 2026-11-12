import Link from 'next/link';
import BannerSlider, { type BannerSlide } from '@/components/BannerSlider';
import FeatureIcon from '@/components/FeatureIcon';
import { CategoryStrip, FlashSale, ReviewsSection, WhatsappBand } from '@/components/HomeSections';
import NewsCard from '@/components/NewsCard';
import ProductCard from '@/components/ProductCard';
import PromoCountdown from '@/components/PromoCountdown';
import { VoucherStrip } from '@/components/VoucherCard';
import WhatsappPromoPopup from '@/components/WhatsappPromoPopup';
import {
  API,
  getActiveProducts,
  getBanners,
  getCategories,
  getNews,
  getReviews,
  getStoreSettings,
  getVouchers,
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
    srcSet: bannerSrcSet(file),
  }));
}

/** Pakai versi 640/1024 px di public/banners/_sizes bila tersedia (HP tidak perlu mengunduh 1600 px). */
function bannerSrcSet(file: string): string | undefined {
  const base = file.replace(/\.[^.]+$/, '');
  const sizes = listPublicImages('banners/_sizes');
  const parts = [640, 1024]
    .filter((w) => sizes.includes(`${base}-${w}.webp`))
    .map((w) => `/banners/_sizes/${encodeURIComponent(`${base}-${w}.webp`)} ${w}w`);
  return parts.length ? [...parts, `${publicUrl('banners', file)} 1600w`].join(', ') : undefined;
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
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-900 hover:bg-mist hover:text-slate-900"
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

  const [categories, settings, reviews, vouchers, news, apiBanners] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getReviews({ limit: 6 }),
    getVouchers(),
    getNews({ limit: 24 }),
    getBanners(),
  ]);
  // Beranda: hanya berita terbaru yang punya gambar (berita tanpa gambar tetap ada di menu Berita).
  const homeNews = (news?.results ?? []).filter((n) => Boolean(n.image_url)).slice(0, 4);

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

  // Banner dari Seller Center diutamakan; kalau belum ada, pakai gambar di folder public/banners.
  const slides: BannerSlide[] = apiBanners.length
    ? apiBanners.map((b) => ({ src: b.image, mobileSrc: b.mobile_image || undefined, alt: b.title, href: b.link_url || undefined }))
    : loadBannerSlides();
  const { features, featuresTitle } = siteConfig;

  return (
    <div className="pb-4">
      {settings?.show_whatsapp_popup && waNumber && (
        <WhatsappPromoPopup
          percent={waPercent}
          whatsappNumber={waNumber}
          appliesToPromo={waOnPromo}
          voucher={settings.popup_voucher ?? null}
        />
      )}

      {/* 1. Banner + panel promo */}
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className={`grid gap-4 ${promo ? 'lg:grid-cols-[1.75fr_1fr]' : ''}`}>
          {slides.length > 0 ? (
            <BannerSlider slides={slides} />
          ) : (
            <div className="flex flex-col justify-center rounded-[28px] bg-surface p-8 ring-1 ring-slate-200 sm:p-12">
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Kamera, lensa, dan gear kreator dalam satu toko.
              </h1>
              <Link href="/produk" className="mt-6 w-fit rounded-full bg-ink px-6 py-3 text-sm font-bold text-surface hover:bg-slate-800">
                Belanja sekarang
              </Link>
            </div>
          )}
          {promo && (
            <PromoCountdown name={promo.name} maxDiscount={promo.maxDiscount} count={promo.count} endsAt={promo.endsAt} />
          )}
        </div>
      </section>

      {/* Voucher yang bisa diklaim */}
      {vouchers.length > 0 && (
        <section aria-labelledby="judul-voucher" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h2 id="judul-voucher" className="mb-3 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            Voucher toko
          </h2>
          <VoucherStrip vouchers={vouchers} />
          <p className="mt-2 text-xs text-slate-500">
            Klaim dulu, voucher otomatis tersedia saat checkout. Harga sudah termasuk PPN.
          </p>
        </section>
      )}

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
          <Link href="/produk" className="shrink-0 text-sm font-bold text-ink hover:text-slate-900">
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

      {/* Berita terbaru (hanya yang bergambar). Artikel Urbanix ada di menu Inspirasi. */}
      {homeNews.length > 0 && (
        <section aria-labelledby="judul-berita" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <h2 id="judul-berita" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              Berita kamera & fotografi
            </h2>
            <Link href="/berita" className="shrink-0 text-sm font-bold text-ink hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="-mx-4 mt-5 grid auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {homeNews.map((article) => (
              <NewsCard key={article.id} article={article} compact />
            ))}
          </div>
        </section>
      )}

      {/* 7. Keunggulan toko: daftar ringkas, bukan kartu */}
      <section aria-labelledby="judul-keunggulan" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 id="judul-keunggulan" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {featuresTitle}
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink ring-1 ring-slate-200">
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
