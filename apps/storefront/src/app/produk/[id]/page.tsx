import Link from 'next/link';
import { cache } from 'react';
import { BackLink } from '@/components/Icons';
import { ReviewsSection } from '@/components/HomeSections';
import ProductReviews from '@/components/ProductReviews';
import ProductHero from '@/components/ProductHero';
import ProductInfoSections from '@/components/ProductInfoSections';
import {
  API,
  buyableVariations,
  fetchAll,
  getProductReviews,
  getReviews,
  type ProductReviewPage,
  getStoreSettings,
  getVouchers,
  type Product,
} from '@/lib/api';
import { SITE_URL, breadcrumbJsonLd, cleanProductName, detectBrand, jsonLd, plainText, shorten } from '@/lib/seo';

const getProduct = cache(async function getProduct(id: string): Promise<Product | null> {
  // 1. Ambil langsung berdasarkan ID.
  try {
    const response = await fetch(
      `${API}/products/${encodeURIComponent(id)}/`,
      { cache: 'no-store' }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && !Array.isArray(data) && String(data.id) === id) {
        return data as Product;
      }
    }
  } catch (error) {
    console.error('[Detail Produk] Gagal mengambil detail:', error);
  }

  // 2. Cadangan: cari dari daftar produk.
  try {
    const all = await fetchAll<Product>('products');
    return all.find((product) => String(product.id) === id) ?? null;
  } catch (error) {
    console.error('[Detail Produk] Gagal membaca daftar:', error);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Produk tidak ditemukan', robots: { index: false } };
  const price = Number(product.final_price ?? product.price) || 0;
  const priceText = price ? `Rp${Math.round(price).toLocaleString('id-ID')}` : '';
  const name = cleanProductName(product.name);
  // Nama dipendekkan agar harga selalu terlihat di cuplikan Google.
  const lead = `Jual ${shorten(name, 70)} original bergaransi${priceText ? `, harga ${priceText}` : ''}. Kirim dari Jakarta, pesan via WhatsApp atau Shopee.`;
  const description = plainText(`${lead} ${plainText(product.description, 300)}`, 158);
  const title = shorten(name, 65);
  const images = product.image_url ? [{ url: product.image_url, alt: product.name }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: `/produk/${product.id}` },
    openGraph: { type: 'website', title: name, description, url: `/produk/${product.id}`, images },
    twitter: { card: 'summary_large_image', title: name, description, images: images?.map((i) => i.url) },
  };
}

/** Data terstruktur Google (Product + Offer) agar harga, stok & merek bisa tampil di hasil pencarian. */
function productJsonLd(product: Product, reviews?: ProductReviewPage | null) {
  const price = Number(product.final_price ?? product.price) || 0;
  const brand = detectBrand(product.name);
  const promoEnd = product.promo_ends_at && (product.discount_percent ?? 0) > 0 ? product.promo_ends_at.slice(0, 10) : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanProductName(product.name),
    sku: product.sku,
    ...(brand ? { brand: { '@type': 'Brand', name: brand } } : {}),
    image: [product.image_url, ...(product.images ?? [])].filter(Boolean).slice(0, 6),
    description: plainText(product.description, 500) || product.name,
    category: product.category_name,
    url: `${SITE_URL}/produk/${product.id}`,
    // Bintang hanya dari ulasan pembeli terverifikasi yang tampil di halaman ini (bukan salinan Shopee).
    ...(reviews && reviews.summary.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviews.summary.average,
            reviewCount: reviews.summary.count,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.results.slice(0, 5).map((r) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: r.name },
            datePublished: r.created_at.slice(0, 10),
            reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            ...(r.body ? { reviewBody: r.body } : {}),
          })),
        }
      : {}),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/produk/${product.id}`,
      priceCurrency: 'IDR',
      price: Math.round(price),
      // Harga berlaku mulai hari ini; bila promo, sampai promo berakhir (selain itu ±1 tahun ke depan).
      validFrom: new Date().toISOString().slice(0, 10),
      priceValidUntil: promoEnd || new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#toko` },
      // Sama dengan pengaturan Google Merchant Center: tarif tetap Rp20.000, proses 0–2 hari, kirim 1–7 hari.
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: { '@type': 'MonetaryAmount', value: 20000, currency: 'IDR' },
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'ID' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
          businessDays: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
              (d) => `https://schema.org/${d}`
            ),
          },
        },
      },
      // Sesuai Syarat & Ketentuan: laporan kendala barang maks. 2×24 jam dengan video unboxing.
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'ID',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 2,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
        merchantReturnLink: `${SITE_URL}/syarat-ketentuan#pembatalan-retur`,
      },
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const [product, storeSettings] = await Promise.all([
    getProduct(id),
    getStoreSettings(),
  ]);

  if (!product) {
    return (
      <div className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-surface p-8 text-center">
          <h1 className="text-xl font-black text-slate-900">
            Produk tidak ditemukan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Produk ini mungkin sudah tidak tersedia, atau server produk sedang
            tidak dapat diakses.
          </p>
          <Link
            href="/produk"
            className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-slate-800"
          >
            Lihat semua produk
          </Link>
        </div>
      </div>
    );
  }

  const variants = buyableVariations(product);
  const [reviews, vouchers, buyerReviews] = await Promise.all([
    getReviews({ product: product.id, limit: 6 }),
    getVouchers(),
    getProductReviews(product.id),
  ]);

  return (
    <div className="px-4 pb-28 pt-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <BackLink href="/produk">Kembali ke katalog</BackLink>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(productJsonLd(product, buyerReviews))}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(
            breadcrumbJsonLd([
              { name: 'Beranda', path: '/' },
              ...(product.category_name
                ? [{ name: product.category_name, path: `/produk?category=${product.category}` }]
                : [{ name: 'Produk', path: '/produk' }]),
              { name: cleanProductName(product.name), path: `/produk/${product.id}` },
            ])
          )}
        />

        <ProductHero
          product={product}
          variants={variants}
          whatsappNumber={storeSettings?.whatsapp_number ?? ''}
          vouchers={vouchers}
        />

        <Link
          href="/cart"
          className="mt-4 inline-flex items-center text-sm font-semibold text-slate-600 underline"
        >
          Lihat Keranjang Belanja
        </Link>

        {/* Informasi produk: susunan sama untuk semua produk */}
        <div id="info-produk" className="mt-8 scroll-mt-24 sm:mt-10">
          <ProductInfoSections
            name={product.name}
            description={product.description}
            variations={product.variations}
          />
        </div>

        {buyerReviews && buyerReviews.summary.count > 0 && (
          <ProductReviews productId={product.id} initial={buyerReviews} />
        )}

        {reviews.length > 0 && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <ReviewsSection reviews={reviews} settings={storeSettings} title="Ulasan produk ini di Shopee" />
          </div>
        )}
      </div>
    </div>
  );
}
