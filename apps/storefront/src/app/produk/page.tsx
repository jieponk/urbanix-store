import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import {
  API,
  fetchAll,
  getCategories,
  type Product,
} from '@/lib/api';

export const metadata = {
  title: 'Semua Produk',
};

type SearchParams = { category?: string; q?: string; promo?: string };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const params = await searchParams;
  const selectedCategory = params?.category || '';
  const searchQuery = (params?.q || '').trim().toLowerCase();
  const promoOnly = params?.promo === '1';

  const [productResult, categories] = await Promise.all([
    fetchAll<Product>('products').then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: [] as Product[] })
    ),
    getCategories(),
  ]);

  const activeProducts = productResult.value.filter(
    (product) => product.is_active !== false
  );

  const filteredProducts = activeProducts.filter((product) => {
    const matchesCategory =
      !selectedCategory || String(product.category) === selectedCategory;

    const matchesSearch =
      !searchQuery ||
      (product.name || '').toLowerCase().includes(searchQuery) ||
      (product.sku || '').toLowerCase().includes(searchQuery) ||
      (product.category_name || '').toLowerCase().includes(searchQuery);

    const matchesPromo = !promoOnly || (product.discount_percent ?? 0) > 0;

    return matchesCategory && matchesSearch && matchesPromo;
  });

  if (promoOnly) {
    filteredProducts.sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0));
  }

  const selectedCategoryName = categories.find(
    (category) => String(category.id) === selectedCategory
  )?.name;

  const title = promoOnly
    ? 'Produk promo'
    : selectedCategory
    ? selectedCategoryName || 'Produk kategori'
    : searchQuery
      ? 'Hasil pencarian'
      : 'Semua produk';

  return (
    <div className="text-ink">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {title}
            </h1>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {filteredProducts.length} produk
          </span>
        </div>

        <form
          action="/produk"
          method="GET"
          className="mt-5 flex max-w-2xl gap-2 rounded-2xl border border-slate-200 bg-surface p-2"
        >
          {selectedCategory && (
            <input type="hidden" name="category" value={selectedCategory} />
          )}
          {promoOnly && <input type="hidden" name="promo" value="1" />}

          <input
            type="search"
            name="q"
            defaultValue={params?.q || ''}
            placeholder="Cari kamera, lensa, aksesoris..."
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            aria-label="Cari produk"
          />

          <button
            type="submit"
            className="shrink-0 rounded-xl bg-ink px-4 py-3 text-xs font-bold text-surface transition hover:bg-slate-800 sm:px-6 sm:text-sm"
          >
            Cari
          </button>
        </form>

        {(selectedCategory || searchQuery || promoOnly) && (
          <Link
            href="/produk"
            className="mt-3 inline-block text-sm font-semibold text-ink hover:text-slate-900"
          >
            ← Tampilkan semua produk
          </Link>
        )}

        {!productResult.ok ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">Produk gagal dimuat</p>
            <p className="mt-2 text-sm text-slate-600">
              Pastikan backend Django berjalan dan API produk dapat diakses.
            </p>
            <p className="mt-2 break-all text-xs text-slate-500">
              API: {API}/products/
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold">Produk belum ditemukan</p>
            <p className="mt-2 text-sm text-slate-500">
              Coba kata kunci atau kategori yang berbeda.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
