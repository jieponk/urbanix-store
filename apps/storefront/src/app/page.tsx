
import Link from 'next/link';

type Product = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  category: number;
  category_name: string;
  description: string;
  price: string | number;
  discount_price: string | number | null;
  stock: number;
  image_url: string;
  is_active: boolean;
};

type Category = {
  id: number;
  name: string;
  slug?: string;
};

type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

async function fetchAll<T>(endpoint: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = `${API}/${endpoint}/`;
  let pageCount = 0;

  while (next && pageCount < 100) {
    const response = await fetch(next, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`API ${endpoint} gagal: HTTP ${response.status}`);
    }

    const data: ApiPage<T> | T[] = await response.json();

    if (Array.isArray(data)) {
      items.push(...data);
      break;
    }

    items.push(...data.results);
    next = data.next;
    pageCount++;
  }

  return items;
}

async function getStoreData() {
  const [productResult, categoryResult] = await Promise.allSettled([
    fetchAll<Product>('products'),
    fetchAll<Category>('categories'),
  ]);

  return {
    products:
      productResult.status === 'fulfilled' ? productResult.value : [],
    categories:
      categoryResult.status === 'fulfilled' ? categoryResult.value : [],
    productError: productResult.status === 'rejected',
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?:
    | { category?: string; q?: string }
    | Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params?.category || '';
  const searchQuery = (params?.q || '').trim().toLowerCase();

  const { products, categories, productError } = await getStoreData();

  const activeProducts = products.filter(
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

  const categoryHref = (id: string) => {
    const query = new URLSearchParams();
    if (id) query.set('category', id);
    if (params?.q) query.set('q', params.q);
    const value = query.toString();
    return value ? `/?${value}#katalog` : '/#katalog';
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Hero dan pencarian */}
      <section className="bg-[#171717] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-orange-400 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              URBANIX STORE
            </span>

            <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Gear terbaik.
              <br />
              <span className="text-orange-500">Cerita dimulai.</span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
              Temukan perlengkapan kamera dan gear kreator untuk setiap
              momen yang ingin kamu abadikan.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-300 sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="text-orange-400">✓</span> Katalog produk
              </span>
              <span className="flex items-center gap-2">
                <span className="text-orange-400">✓</span> Harga transparan
              </span>
              <span className="flex items-center gap-2">
                <span className="text-orange-400">✓</span> Belanja praktis
              </span>
            </div>
          </div>

          <form
            action="/"
            method="GET"
            className="mt-7 flex max-w-2xl gap-2 rounded-2xl bg-white p-2 shadow-lg sm:mt-9"
          >
            {selectedCategory && (
              <input type="hidden" name="category" value={selectedCategory} />
            )}

            <span className="flex items-center pl-2 text-slate-400">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </span>

            <input
              type="search"
              name="q"
              defaultValue={params?.q || ''}
              placeholder="Cari kamera, lensa, aksesoris..."
              className="min-w-0 flex-1 bg-transparent px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              aria-label="Cari produk"
            />

            <button
              type="submit"
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-orange-700 sm:px-6 sm:text-sm"
            >
              Cari
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-7 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        {/* Kategori */}
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
                Temukan gear kamu
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                Jelajahi kategori
              </h2>
            </div>
            <span className="pb-1 text-xs text-slate-500">
              {categories.length} kategori
            </span>
          </div>

          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <Link
              href={categoryHref('')}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                !selectedCategory
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange-400'
              }`}
            >
              Semua produk
            </Link>

            {categories.map((category) => (
              <Link
                key={category.id}
                href={categoryHref(String(category.id))}
                className={`max-w-56 shrink-0 truncate rounded-full border px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                  selectedCategory === String(category.id)
                    ? 'border-orange-600 bg-orange-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-orange-400'
                }`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Katalog */}
        <section id="katalog" className="scroll-mt-5 pt-8 sm:pt-10">
          <div className="flex items-end justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
                Pilihan untukmu
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
                {selectedCategory
                  ? selectedCategoryName || 'Produk kategori'
                  : searchQuery
                    ? 'Hasil pencarian'
                    : 'Semua produk'}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {filteredProducts.length} produk
            </span>
          </div>

          {productError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-700">
                Produk gagal dimuat
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Pastikan backend Django berjalan dan API produk dapat diakses.
              </p>
              <p className="mt-2 break-all text-xs text-slate-500">
                API: {API}/products/
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
              <p className="font-bold">Produk belum ditemukan</p>
              <p className="mt-2 text-sm text-slate-500">
                Coba kata kunci atau kategori yang berbeda.
              </p>
              <Link
                href="/#katalog"
                className="mt-4 inline-flex rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                Lihat semua produk
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product) => {
                const originalPrice = Number(product.price) || 0;
                const discountedPrice = Number(product.discount_price) || 0;

                const hasDiscount =
                  discountedPrice > 0 &&
                  discountedPrice < originalPrice;

                const finalPrice = hasDiscount
                  ? discountedPrice
                  : originalPrice;

                const discountPercent = hasDiscount
                  ? Math.round(
                      ((originalPrice - discountedPrice) / originalPrice) *
                        100
                    )
                  : 0;

                return (
                  <Link
                    key={product.id}
                    href={`/produk/${product.id}`}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-slate-200/60"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#f7f7f7] p-3 sm:p-5">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
                          Gambar tidak tersedia
                        </div>
                      )}

                      {hasDiscount && (
                        <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-1 text-[10px] font-extrabold text-white sm:left-3 sm:top-3">
                          -{discountPercent}%
                        </span>
                      )}

                      {product.stock <= 0 && (
                        <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-900/85 px-2 py-2 text-center text-[10px] font-bold text-white sm:inset-x-3 sm:bottom-3">
                          Stok habis
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-3 sm:p-4">
                      <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">
                        {product.category_name || 'Produk'}
                      </p>

                      <h3 className="mt-1 line-clamp-2 min-h-10 text-xs font-bold leading-5 text-slate-800 transition group-hover:text-orange-700 sm:text-sm">
                        {product.name}
                      </h3>

                      <div className="mt-3">
                        {hasDiscount && (
                          <p className="text-[10px] text-slate-400 line-through sm:text-xs">
                            {money(originalPrice)}
                          </p>
                        )}

                        <p className="break-words text-sm font-extrabold leading-5 tracking-tight text-slate-950 sm:text-base">
                          {money(finalPrice)}
                        </p>
                      </div>

                      <div className="mt-auto pt-3">
                        <span
                          className={`block rounded-lg py-2.5 text-center text-[10px] font-bold transition sm:text-xs ${
                            product.stock > 0
                              ? 'bg-orange-50 text-orange-700 group-hover:bg-orange-600 group-hover:text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {product.stock > 0 ? 'Lihat produk →' : 'Lihat detail'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Penutup halaman */}
        <section className="mt-10 rounded-2xl bg-slate-100 px-5 py-6 sm:mt-14 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
              Urbanix Store
            </p>
            <h2 className="mt-2 text-lg font-extrabold tracking-tight sm:text-xl">
              Siap menemukan gear berikutnya?
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Jelajahi katalog dan pilih perlengkapan yang sesuai kebutuhanmu.
            </p>
          </div>
          <Link
            href="/#katalog"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600 sm:mt-0"
          >
            Jelajahi katalog →
          </Link>
        </section>
      </div>
    </main>
  );
}
