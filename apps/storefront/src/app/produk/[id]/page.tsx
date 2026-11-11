import Link from 'next/link';
import { cache } from 'react';
import { BackLink } from '@/components/Icons';
import { ReviewsSection } from '@/components/HomeSections';
import ProductHero from '@/components/ProductHero';
import ProductInfoSections from '@/components/ProductInfoSections';
import {
  API,
  buyableVariations,
  fetchAll,
  getReviews,
  getStoreSettings,
  getVouchers,
  type Product,
} from '@/lib/api';
import { SITE_URL, plainText } from '@/lib/seo';

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
  const description =
    plainText(product.description, 155) || `${product.name} original bergaransi di Urbanix Store.`;
  const images = product.image_url ? [{ url: product.image_url, alt: product.name }] : undefined;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/produk/${product.id}` },
    openGraph: { type: 'website', title: product.name, description, url: `/produk/${product.id}`, images },
    twitter: { card: 'summary_large_image', title: product.name, description, images: images?.map((i) => i.url) },
  };
}

/** Data terstruktur Google (Product + Offer) agar harga & stok bisa tampil di hasil pencarian. */
function productJsonLd(product: Product) {
  const price = Number(product.final_price ?? product.price) || 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    image: [product.image_url, ...(product.images ?? [])].filter(Boolean).slice(0, 6),
    description: plainText(product.description, 500),
    category: product.category_name,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/produk/${product.id}`,
      priceCurrency: 'IDR',
      price: Math.round(price),
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'Urbanix Store' },
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
  const [reviews, vouchers] = await Promise.all([
    getReviews({ product: product.id, limit: 6 }),
    getVouchers(),
  ]);

  return (
    <div className="px-4 pb-28 pt-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <BackLink href="/produk">Kembali ke katalog</BackLink>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(product)).replace(/</g, '\\u003c') }}
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

        {reviews.length > 0 && (
          <div className="-mx-4 sm:-mx-6 lg:-mx-8">
            <ReviewsSection reviews={reviews} settings={storeSettings} title="Ulasan produk ini" />
          </div>
        )}
      </div>
    </div>
  );
}
