import Link from 'next/link';
import { BackLink } from '@/components/Icons';
import ProductCard from '@/components/ProductCard';
import {
  API,
  fetchAll,
  getCategories,
  type Product,
} from '@/lib/api';
import { getT } from '@/lib/lang-server';

type SearchParams = { category?: string; q?: string; promo?: string };

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  // Halaman hasil pencarian tidak perlu diindeks Google (isinya duplikat halaman lain).
  if ((params.q || '').trim()) {
    // Kata pencarian sengaja TIDAK ditulis di judul: mencegah spam "link pencarian berisi kata judi" di Google.
    return { title: 'Hasil pencarian produk', robots: { index: false, follow: true } };
  }
  if (params.category) {
    const category = (await getCategories()).find((c) => String(c.id) === String(params.category));
    if (category) {
      return {
        title: `Jual ${category.name} Original Bergaransi`,
        description: `Belanja ${category.name} original bergaransi di Urbanix Store. Harga transparan sudah termasuk PPN, kirim dari Jakarta, pesan via WhatsApp atau Shopee.`,
        alternates: { canonical: `/produk?category=${category.id}` },
      };
    }
  }
  if (params.promo === '1') {
    return {
      title: 'Promo Kamera, Lensa & Gear Kreator',
      description: 'Daftar produk yang sedang promo di Urbanix Store: kamera, lensa, drone, audio, dan aksesori original bergaransi.',
      alternates: { canonical: '/produk?promo=1' },
    };
  }
  return {
    title: 'Semua Produk: Kamera, Lensa, Drone & Aksesori',
    description: 'Katalog lengkap Urbanix Store: kamera, lensa, drone, audio, lighting, dan aksesori kreator original bergaransi. Harga sudah termasuk PPN.',
    alternates: { canonical: '/produk' },
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const t = getT();
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
      searchQuery
        .split(/\s+/)
        .every((word) =>
          `${product.name || ''} ${product.sku || ''} ${product.category_name || ''}`
            .toLowerCase()
            .includes(word)
        );

    const matchesPromo = !promoOnly || (product.discount_percent ?? 0) > 0;

    return matchesCategory && matchesSearch && matchesPromo;
  });

  if (promoOnly) {
    filteredProducts.sort((a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0));
  }

  const selectedCategoryName = categories.find(
    (category) => String(category.id) === selectedCategory
  )?.name;

  // Promo: kategori yang punya produk diskon (jumlah + diskon terbesar), untuk pilihan cepat
  const promoCats = promoOnly
    ? categories
        .map((c) => {
          const items = activeProducts.filter((p) => String(p.category) === String(c.id) && (p.discount_percent ?? 0) > 0);
          return { id: String(c.id), name: c.name, count: items.length, max: Math.max(0, ...items.map((p) => p.discount_percent ?? 0)) };
        })
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
    : [];
  const promoTotal = promoOnly ? activeProducts.filter((p) => (p.discount_percent ?? 0) > 0).length : 0;
  const chipHref = (cat: string) => `/produk?promo=1${cat ? `&category=${cat}` : ''}${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`;

  const title = promoOnly
    ? selectedCategoryName
      ? t('Promo {name}', { name: selectedCategoryName })
      : t('Produk promo')
    : selectedCategory
    ? selectedCategoryName || t('Produk kategori')
    : searchQuery
      ? t('Hasil pencarian')
      : t('Semua produk');

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
            {t('{n} produk', { n: filteredProducts.length })}
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
            placeholder={t('Cari kamera, lensa, aksesoris...')}
            className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            aria-label={t('Cari produk')}
          />

          <button
            type="submit"
            className="shrink-0 rounded-xl bg-ink px-4 py-3 text-xs font-bold text-surface transition hover:bg-slate-800 sm:px-6 sm:text-sm"
          >
            {t('Cari')}
          </button>
        </form>

        {promoCats.length > 0 && (
          <nav aria-label={t('Promo per kategori')} className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {[{ id: '', name: t('Semua promo'), count: promoTotal, max: 0 }, ...promoCats].map((c) => {
                const on = selectedCategory === c.id;
                return (
                  <li key={c.id || 'all'}>
                    <Link
                      href={chipHref(c.id)}
                      aria-current={on ? 'page' : undefined}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                        on ? 'border-ink bg-ink text-surface' : 'border-slate-200 bg-surface text-ink hover:border-slate-400'
                      }`}
                    >
                      {c.name}
                      <span className={`text-xs ${on ? 'text-surface/70' : 'text-slate-500'}`}>{c.count}</span>
                      {c.max > 0 && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${on ? 'bg-sun-500 text-white' : 'bg-sale-50 text-sale-600'}`}>
                          {t('s/d {n}%', { n: c.max })}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {(selectedCategory || searchQuery || promoOnly) && (
          <div className="mt-3">
            <BackLink href="/produk">{t('Tampilkan semua produk')}</BackLink>
          </div>
        )}

        {!productResult.ok ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">{t('Produk gagal dimuat')}</p>
            <p className="mt-2 text-sm text-slate-600">
              {t('Pastikan backend Django berjalan dan API produk dapat diakses.')}
            </p>
            <p className="mt-2 break-all text-xs text-slate-500">
              API: {API}/products/
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold">{t('Produk belum ditemukan')}</p>
            <p className="mt-2 text-sm text-slate-500">
              {t('Coba kata kunci atau kategori yang berbeda.')}
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
