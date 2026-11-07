import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import {
  API,
  fetchAll,
  getCategories,
  type Product,
} from '@/lib/api';

export const metadata = {
  title: 'Semua Produk - URBANIX STORE',
};

type SearchParams = { category?: string; q?: string };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const params = await searchParams;
  const selectedCategory = params?.category || '';
  const searchQuery = (params?.q || '').trim().toLowerCase();

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

    return matchesCategory && matchesSearch;
  });

  const selectedCategoryName = categories.find(
    (category) => String(category.id) === selectedCategory
  )?.name;

  const title = selectedCategory
    ? selectedCategoryName || 'Produk kategori'
    : searchQuery
      ? 'Hasil pencarian'
      : 'Semua produk';

  return (
    <div className="bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
              Katalog
            </p>
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
          className="mt-5 flex max-w-2xl gap-2 rounded-2xl border border-slate-200 bg-white p-2"
        >
          {selectedCategory && (
            <input type="hidden" name="category" value={selectedCategory} />
          )}

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
            className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-orange-700 sm:px-6 sm:text-sm"
          >
            Cari
          </button>
        </form>

        {(selectedCategory || searchQuery) && (
          <Link
            href="/produk"
            className="mt-3 inline-block text-sm font-semibold text-orange-600 hover:text-orange-700"
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
