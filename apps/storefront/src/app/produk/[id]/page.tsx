import Link from 'next/link';
import ProductBuyButtons from '@/components/ProductBuyButtons';
import ProductInfoSections from '@/components/ProductInfoSections';
import { API, fetchAll, money, type Product } from '@/lib/api';

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
  const product = await getProduct(id);

  if (!product) {
    return (
      <div className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-black text-slate-900">
            Produk tidak ditemukan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Produk ini mungkin sudah tidak tersedia, atau server produk sedang
            tidak dapat diakses.
          </p>
          <Link
            href="/produk"
            className="mt-6 inline-block rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700"
          >
            Lihat semua produk
          </Link>
        </div>
      </div>
    );
  }

  const price = Number(product.price) || 0;
  const discountPrice = Number(product.discount_price) || 0;
  const hasDiscount = discountPrice > 0 && discountPrice < price;
  const finalPrice = hasDiscount ? discountPrice : price;
  const discountPercent = hasDiscount
    ? Math.round(((price - discountPrice) / price) * 100)
    : 0;
  const stock = Number(product.stock) || 0;
  const variationCount = product.variations?.length ?? 0;

  return (
    <div className="bg-slate-50 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/produk"
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

          {/* Judul, harga, dan tombol beli */}
          <section className="min-w-0 py-1 sm:py-3">
            <p className="text-xs font-semibold text-orange-600 sm:text-sm">
              {product.category_name || 'Produk'}
            </p>

            <h1 className="mt-3 break-words text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              {product.name}
            </h1>

            {product.sku && (
              <p className="mt-3 text-xs text-slate-400">SKU: {product.sku}</p>
            )}

            <div className="mt-6 border-y border-slate-200 py-5">
              {hasDiscount && (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="line-through">{money(price)}</span>
                  <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    -{discountPercent}%
                  </span>
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

              {variationCount > 1 && (
                <p className="mt-2 text-xs text-slate-500">
                  Produk ini punya {variationCount} varian dengan harga bisa
                  berbeda.{' '}
                  <a
                    href="#info-produk"
                    className="font-semibold text-orange-600 hover:underline"
                  >
                    Lihat daftar varian
                  </a>
                </p>
              )}
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

        {/* Informasi produk: susunan sama untuk semua produk */}
        <div id="info-produk" className="mt-8 scroll-mt-24 sm:mt-10">
          <ProductInfoSections
            name={product.name}
            description={product.description}
            variations={product.variations}
          />
        </div>
      </div>
    </div>
  );
}
