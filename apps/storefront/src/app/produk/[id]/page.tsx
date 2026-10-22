import ProductBuyButtons from '@/components/ProductBuyButtons';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type Product = {
  id: number | string;
  name: string;
  slug?: string;
  sku?: string;
  category?: number;
  category_name?: string;
  description?: string | null;
  price: string | number;
  discount_price?: string | number | null;
  stock?: number;
  image_url?: string | null;
};

type ProductPageResponse = {
  count: number;
  next: string | null;
  results: Product[];
};

const API = (
  process.env.API_URL || 'http://127.0.0.1:8000/api/v1'
).replace(/\/+$/, '');

const money = (value: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

async function fetchJson(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
  });

  if (!response.ok) {
    console.error(
      `[Detail Produk] API ${response.status}: ${url}`
    );
    return null;
  }

  return response.json();
}

async function getProduct(id: string): Promise<Product | null> {
  // 1. Coba mengambil produk langsung berdasarkan ID.
  const detailUrl = `${API}/products/${encodeURIComponent(id)}/`;

  try {
    const data = await fetchJson(detailUrl);

    if (
      data &&
      !Array.isArray(data) &&
      String(data.id) === id
    ) {
      return data as Product;
    }
  } catch (error) {
    console.error('[Detail Produk] Gagal mengambil detail:', error);
  }

  // 2. Jika endpoint detail gagal, cari dari daftar produk.
  let next: string | null = `${API}/products/`;
  let pages = 0;

  while (next && pages < 100) {
    try {
      const data = await fetchJson(next);

      if (!data) {
        return null;
      }

      const products: Product[] = Array.isArray(data)
        ? data
        : (data as ProductPageResponse).results ?? [];

      const found = products.find(
        (product) => String(product.id) === id
      );

      if (found) {
        return found;
      }

      if (Array.isArray(data)) {
        break;
      }

      next = (data as ProductPageResponse).next;

      // Pastikan URL pagination tetap menuju server API yang benar.
      if (next) {
        const parsedNext = new URL(next, API);
        const apiOrigin = new URL(API).origin;

        if (parsedNext.origin !== apiOrigin) {
          console.error(
            '[Detail Produk] URL pagination berasal dari host berbeda:',
            parsedNext.origin
          );
          return null;
        }

        next = parsedNext.toString();
      }

      pages++;
    } catch (error) {
      console.error('[Detail Produk] Gagal membaca daftar:', error);
      return null;
    }
  }

  console.error(`[Detail Produk] Produk ID ${id} tidak ditemukan.`);
  return null;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">
        Halaman detail berhasil dibuka
      </h1>

      <p className="mt-4">
        ID produk: {id}
      </p>

      <p className="mt-2">
        Data produk tidak berhasil ditemukan oleh frontend.
      </p>

      <a
        className="mt-4 inline-block text-blue-600 underline"
        href={`http://127.0.0.1:8000/api/v1/products/${encodeURIComponent(id)}/`}
        target="_blank"
        rel="noreferrer"
      >
        Periksa API detail produk
      </a>
    </main>
  );
}

  const price = Number(product.price) || 0;
  const discountPrice = Number(product.discount_price) || 0;

  const hasDiscount =
    product.discount_price !== null &&
    product.discount_price !== undefined &&
    discountPrice > 0 &&
    discountPrice < price;

  const finalPrice = hasDiscount ? discountPrice : price;
  const stock = Number(product.stock) || 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/#katalog"
          className="inline-flex items-center text-sm font-semibold text-slate-500 transition hover:text-orange-600"
        >
          <span className="mr-2">←</span>
          Kembali ke katalog
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10 lg:gap-14">
          {/* Gambar produk */}
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <p className="text-sm text-slate-400">
                Gambar produk tidak tersedia
              </p>
            )}
          </div>

          {/* Informasi produk */}
          <section className="min-w-0 py-1 sm:py-3">
            <p className="text-xs font-semibold text-orange-600 sm:text-sm">
              {product.category_name || 'Produk'}
            </p>

            <h1 className="mt-3 break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {product.name}
            </h1>

            {product.sku && (
              <p className="mt-3 text-xs text-slate-400">
                SKU: {product.sku}
              </p>
            )}

            <div className="mt-6 border-y border-slate-200 py-5">
              {hasDiscount && (
                <p className="text-sm text-slate-400 line-through">
                  {money(price)}
                </p>
              )}

              <p className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                {money(finalPrice)}
              </p>

              <p
                className={`mt-3 text-sm font-semibold ${
                  stock > 0 ? 'text-emerald-700' : 'text-slate-500'
                }`}
              >
                {stock > 0
                  ? `Stok tercatat tersedia (${stock})`
                  : 'Stok tercatat habis'}
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-base font-bold">
                Deskripsi Produk
              </h2>

              <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                {product.description?.trim() ||
                  'Deskripsi produk belum tersedia.'}
              </p>
            </div>

            <ProductBuyButtons
  id={String(product.id)}
  name={product.name}
  price={finalPrice}
  imageUrl={product.image_url ?? null}
  stock={stock}
/>

<Link
  href="/cart"
  className="mt-4 inline-flex items-center text-sm font-semibold text-slate-600 underline"
>
  Lihat Keranjang Belanja
</Link>
          </section>
        </div>
      </div>
    </main>
  );
}
