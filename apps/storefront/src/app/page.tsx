import Link from 'next/link';
import { Fragment } from 'react';
import ShopVideos from '@/components/ShopVideos';
import { resolveLayout, type HomeKey } from '@/lib/homeLayout';
import BannerSlider, { type BannerSlide } from '@/components/BannerSlider';
import FeatureIcon from '@/components/FeatureIcon';
import { BestSellers, BrandCorner, CategoryStrip, FlashSale, ReviewsSection, WhatsappBand } from '@/components/HomeSections';
import NewsCard from '@/components/NewsCard';
import ProductCard from '@/components/ProductCard';
import PromoCountdown from '@/components/PromoCountdown';
import GearBackdrop from '@/components/inspirasi/GearBackdrop';
import { VoucherStrip } from '@/components/VoucherCard';
import { EventHero } from '@/components/EventMode';
import VoucherPopup from '@/components/VoucherPopup';
import BannerPopup from '@/components/BannerPopup';
import { getEventState } from '@/lib/event-server';
import {
  API,
  getActiveProducts,
  getBanners,
  getCategories,
  getNews,
  getReviews,
  getStoreSettings,
  getVideos,
  getVouchers,
  promoSummary,
  type Product,
} from '@/lib/api';
import { findPublicImage, listPublicImages, publicUrl } from '@/lib/assets';
import { siteConfig } from '@/lib/siteConfig';
import { BRANDS, detectBrand } from '@/lib/seo';
import { productImg } from '@/lib/img';
import { getT } from '@/lib/lang-server';
import TablerIcon from '@/components/TablerIcon';

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

/** Pakai versi 640/1024/1280 px di public/banners/_sizes bila tersedia (HP tidak perlu mengunduh 1600 px). */
function bannerSrcSet(file: string): string | undefined {
  const base = file.replace(/\.[^.]+$/, '');
  const sizes = listPublicImages('banners/_sizes');
  const parts = [640, 1024, 1280]
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
  const t = getT();
  const isNext = direction === 'next';

  return (
    <Link
      href={`/?hal=${page}#produk-pilihan`}
      scroll={false}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-900 hover:bg-mist hover:text-slate-900"
    >
      {!isNext && (
        <TablerIcon name="chevron-left" size={18} stroke={2.5} />
      )}
      {isNext ? t('Berikutnya') : t('Sebelumnya')}
      {isNext && (
        <TablerIcon name="chevron-right" size={18} stroke={2.5} />
      )}
    </Link>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const t = getT();
  const params = await searchParams;

  let allProducts: Product[] = [];
  let productError = false;

  try {
    allProducts = await getActiveProducts();
  } catch {
    productError = true;
  }

  const [categories, settings, reviews, vouchers, news, apiBanners, videos] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getReviews({ limit: 6 }),
    getVouchers(),
    getNews({ limit: 24 }),
    getBanners(),
    getVideos(),
  ]);
  // Beranda: hanya berita terbaru yang punya gambar (berita tanpa gambar tetap ada di menu Berita).
  const homeNews = (news?.results ?? []).filter((n) => Boolean(n.image_url)).slice(0, 4);

  const totalPages = Math.max(1, Math.ceil(allProducts.length / PER_PAGE));
  const requestedPage = parseInt(params?.hal || '1', 10) || 1;
  const page = Math.min(totalPages, Math.max(1, requestedPage));
  const products = allProducts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const promo = promoSummary(allProducts);
  const { event } = await getEventState();
  const promoProducts = allProducts
    .filter((p) => (p.discount_percent ?? 0) > 0)
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, 12);

  // Flash sale berjalan: diutamakan di deretan promo (hitung mundur ke yang paling cepat selesai)
  const flashProducts = allProducts
    .filter((p) => p.flash && (p.flash.left == null || p.flash.left > 0))
    .sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0))
    .slice(0, 12);
  const flashEnds = flashProducts
    .map((p) => p.flash?.ends_at)
    .filter((d): d is string => Boolean(d))
    .sort()[0] ?? null;

  // Pesan via WhatsApp bisa dimatikan di Pengaturan: diskon & popup WA ikut disembunyikan.
  const waOrder = settings?.methods?.whatsapp ?? false;
  const waPercent = waOrder ? Number(settings?.whatsapp_discount_percent) || 0 : 0;
  const waNumber = settings?.whatsapp_number ?? '';
  const waOnPromo = settings?.whatsapp_discount_on_promo ?? false;

  // Banner dari Seller Center diutamakan; kalau belum ada, pakai gambar di folder public/banners.
  const slides: BannerSlide[] = apiBanners.length
    ? apiBanners.map((b) => ({ src: b.image, mobileSrc: b.mobile_image || undefined, alt: b.title, href: b.link_url || undefined }))
    : loadBannerSlides();
  const { features, featuresTitle } = siteConfig;

  // Brand Corner: merek yang punya produk (urut jumlah), logo resmi bila ada filenya di public/brands
  const brandCount = new Map<string, number>();
  for (const p of allProducts) {
    const b = detectBrand(p.name);
    if (b) brandCount.set(b, (brandCount.get(b) || 0) + 1);
  }
  const brands = Array.from(brandCount.entries())
    .sort((a, b) => b[1] - a[1] || BRANDS.indexOf(a[0]) - BRANDS.indexOf(b[0]))
    .slice(0, 8)
    .map(([name, count]) => ({ name, count, logo: findPublicImage('brands', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) ?? undefined }));

  // Kotak kanan banner event: 2 produk promo dengan potongan terbesar + harga promo termurah
  const heroTiles = promoProducts
    .filter((p) => p.image_url && p.stock > 0)
    .slice(0, 2)
    .map((p) => ({ id: p.id, name: p.name, image: productImg(p.image_url, 300), price: Number(p.final_price ?? p.price) || 0 }));
  const minPromoPrice = Math.min(...promoProducts.map((p) => Number(p.final_price ?? p.price) || Infinity));

  // Bagian beranda; urutan & tampil/sembunyi diatur di Seller Center → Dekor toko → Tata letak beranda.
  const blocks: Record<HomeKey, React.ReactNode> = {
    voucher: <>
      {/* 2. Voucher yang bisa diklaim */}
      {vouchers.length > 0 && (
        <section aria-labelledby="judul-voucher" className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
          <h2 id="judul-voucher" className="mb-3 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
            {event ? t('Klaim voucher {e}', { e: event.big }) : t('Voucher toko')}
          </h2>
          <VoucherStrip vouchers={vouchers} />
          <p className="mt-2 text-xs text-slate-500">
            {t('Klaim dulu, voucher otomatis tersedia saat checkout. Harga sudah termasuk PPN.')}
          </p>
        </section>
      )}
    </>,
    flash: <>
      {/* 3. Flash sale / produk promo (panel putih) */}
      {flashProducts.length > 0 ? (
        <FlashSale products={flashProducts} promoName={promo?.name ?? ''} flash endsAt={flashEnds} />
      ) : (
        promo && <FlashSale products={promoProducts} promoName={promo.name} />
      )}
    </>,
    kategori: <>
      {/* 4. Kategori bergambar */}
      <div className="relative isolate">
        <GearBackdrop />
        <CategoryStrip categories={categories} products={allProducts} />
      </div>
    </>,
    brand: <BrandCorner brands={brands} />,
    laris: <BestSellers products={allProducts} />,
    video: <ShopVideos videos={videos} />,
    chat: <>
      {/* 4. Cara pesan via WhatsApp + diskon */}
      <WhatsappBand percent={waPercent} whatsappNumber={waNumber} appliesToPromo={waOnPromo} />
    </>,
    produk: <>
      {/* 5. Produk pilihan: 8 produk (4 + 4) dengan tombol halaman */}
      <section id="produk-pilihan" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{t('Produk pilihan')}</h2>
          <Link href="/produk" className="shrink-0 text-sm font-bold text-ink hover:text-slate-900">
            {t('Lihat semua produk')}
          </Link>
        </div>

        {productError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">{t('Produk gagal dimuat')}</p>
            <p className="mt-2 text-sm text-slate-600">Pastikan backend Django berjalan dan API produk dapat diakses.</p>
            <p className="mt-2 break-all text-xs text-slate-500">API: {API}/products/</p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold">{t('Produk belum tersedia')}</p>
            <p className="mt-2 text-sm text-slate-500">{t('Silakan cek kembali sebentar lagi.')}</p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav aria-label={t('Halaman produk')} className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
    </>,
    ulasan: <>
      {/* 6. Ulasan asli pembeli */}
      <ReviewsSection reviews={reviews} settings={settings} />
    </>,
    berita: <>
      {/* Berita terbaru (hanya yang bergambar). Artikel Urbanix ada di menu Inspirasi. */}
      {homeNews.length > 0 && (
        <section aria-labelledby="judul-berita" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-3">
            <h2 id="judul-berita" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {t('Berita kamera & fotografi')}
            </h2>
            <Link href="/berita" className="shrink-0 text-sm font-bold text-ink hover:underline">
              {t('Lihat semua')}
            </Link>
          </div>
          <div className="-mx-4 mt-5 grid auto-cols-[78%] grid-flow-col gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {homeNews.map((article) => (
              <NewsCard key={article.id} article={article} compact />
            ))}
          </div>
        </section>
      )}
    </>,
    keunggulan: <>
      {/* 7. Keunggulan toko: daftar ringkas, bukan kartu */}
      <section aria-labelledby="judul-keunggulan" className="relative isolate mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <GearBackdrop />
        <h2 id="judul-keunggulan" className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          {t(featuresTitle)}
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink ring-1 ring-slate-200">
                <FeatureIcon name={feature.icon} size={22} />
              </span>
              <span>
                <span className="block font-bold text-ink">{t(feature.title)}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{t(feature.text)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>,
  };
  const layout = resolveLayout(settings?.home_layout);

  return (
    <div className="pb-4">
      {settings?.show_whatsapp_popup &&
        (settings.popup_mode === 'banner'
          ? settings.popup_banner && <BannerPopup banner={settings.popup_banner} />
          : settings.popup_voucher && <VoucherPopup voucher={settings.popup_voucher} extras={vouchers} />)}

      {/* 0. Mode Event otomatis (12.12, tanggal kembar, payday): banner event di paling atas */}
      {/* Susunan beranda mengikuti mockup Mode Event: banner → voucher → flash sale → kategori → zona hemat →
          Brand Corner → paling laris → cara pesan → produk pilihan → ulasan → berita → keunggulan. */}
      {event && (
        <>
          <h1 className="sr-only">{t('Urbanix Store: toko kamera, lensa, drone & gear kreator original bergaransi')}</h1>
          <EventHero
            event={event}
            maxDiscount={promo?.maxDiscount ?? 0}
            promoCount={promo?.count ?? 0}
            tiles={heroTiles}
            minPrice={Number.isFinite(minPromoPrice) ? minPromoPrice : 0}
            waPercent={waPercent}
          />
        </>
      )}

      <div className="relative isolate pb-2">
      <GearBackdrop className="-bottom-10" />
      {/* 1. Banner + panel promo. Saat event berjalan, banner event di atas menggantikannya (seperti mockup). */}
      {!event && (
      <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className={`grid gap-4 ${promo ? 'lg:grid-cols-[1.75fr_1fr]' : ''}`}>
          {slides.length > 0 ? (
            <>
              {/* Judul utama halaman untuk Google & pembaca layar (banner berupa gambar) */}
              <h1 className="sr-only">{t('Urbanix Store: toko kamera, lensa, drone & gear kreator original bergaransi')}</h1>
              <BannerSlider slides={slides} />
            </>
          ) : (
            <div className="flex flex-col justify-center rounded-xl bg-surface p-8 ring-1 ring-slate-200 sm:p-12">
              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                {t('Kamera, lensa, dan gear kreator dalam satu toko.')}
              </h1>
              <Link href="/produk" className="mt-6 w-fit rounded-full bg-ink px-6 py-3 text-sm font-bold text-surface hover:bg-slate-800">
                {t('Belanja sekarang')}
              </Link>
            </div>
          )}
          {promo && (
            <PromoCountdown name={promo.name} maxDiscount={promo.maxDiscount} count={promo.count} endsAt={promo.endsAt} />
          )}
        </div>
      </section>
      )}

      </div>

      {layout.filter((item) => item.visible).map((item) => (
        <Fragment key={item.key}>{blocks[item.key]}</Fragment>
      ))}
    </div>
  );
}
