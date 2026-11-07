import Link from 'next/link';
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
  type Product,
} from '@/lib/api';

async function getProduct(id: string): Promise<Product | null> {
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
  const reviews = await getReviews({ product: product.id, limit: 6 });

  return (
    <div className="px-4 pb-28 pt-4 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <BackLink href="/produk">Kembali ke katalog</BackLink>

        <ProductHero
          product={product}
          variants={variants}
          whatsappNumber={storeSettings?.whatsapp_number ?? ''}
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
