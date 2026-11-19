import { BackLink } from '@/components/Icons';
import ProductCard from '@/components/ProductCard';
import PromoCategoryFilter from '@/components/PromoCategoryFilter';
import { Bolt, Countdown } from '@/components/FlashSale';
import {
  API,
  fetchAll,
  getCategories,
  getStoreSettings,
  type Product,
} from '@/lib/api';
import { getT } from '@/lib/lang-server';
import SortSelect from '@/components/SortSelect';
import CatalogFilter from '@/components/CatalogFilter';
import { detectBrand } from '@/lib/seo';

type SearchParams = { category?: string; q?: string; promo?: string; flash?: string; urut?: string; merek?: string; harga?: string };

/** Rentang harga (harga yang dibayar, termasuk promo). */
const PRICE_RANGES = [
  { value: '0-100', label: '< Rp100 rb', min: 0, max: 100_000 },
  { value: '0-500', label: '< Rp500 rb', min: 0, max: 500_000 },
  { value: '100-500', label: 'Rp100 – 500 rb', min: 100_000, max: 500_000 },
  { value: '500-2000', label: 'Rp500 rb – 2 jt', min: 500_000, max: 2_000_000 },
  { value: '2000-5000', label: 'Rp2 – 5 jt', min: 2_000_000, max: 5_000_000 },
  { value: '5000-10000', label: 'Rp5 – 10 jt', min: 5_000_000, max: 10_000_000 },
  { value: '10000-', label: '> Rp10 jt', min: 10_000_000, max: Infinity },
];

const SORTS = ['relevan', 'rekomendasi', 'terlaris', 'terbaru', 'diskon', 'termurah', 'termahal', 'nama'] as const;
type Sort = (typeof SORTS)[number];

const priceOf = (p: Product) => Number(p.final_price ?? p.discount_price ?? p.price) || 0;
const inStock = (p: Product) => p.stock > 0 || (p.variations ?? []).some((v) => v.stock > 0);

/** Skor kecocokan pencarian: kata di awal nama > kata utuh di nama > di nama > SKU/kategori. */
function relevance(p: Product, words: string[], phrase: string) {
  const name = (p.name || '').toLowerCase();
  let score = name.startsWith(phrase) ? 60 : name.includes(phrase) ? 35 : 0;
  for (const w of words) {
    if (new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(name)) score += 12;
    else if (name.includes(w)) score += 6;
    else if ((p.sku || '').toLowerCase().includes(w)) score += 4;
    else score += 2; // cocok di kategori
  }
  return score;
}

function sortProducts(list: Product[], sort: Sort, words: string[], phrase: string) {
  const cmp: Record<Sort, (a: Product, b: Product) => number> = {
    relevan: (a, b) => relevance(b, words, phrase) - relevance(a, words, phrase),
    rekomendasi: () => 0,
    terlaris: (a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0) || (b.review_count ?? 0) - (a.review_count ?? 0),
    terbaru: (a, b) => b.id - a.id,
    diskon: (a, b) => (b.discount_percent ?? 0) - (a.discount_percent ?? 0),
    termurah: (a, b) => priceOf(a) - priceOf(b),
    termahal: (a, b) => priceOf(b) - priceOf(a),
    nama: (a, b) => a.name.localeCompare(b.name, 'id'),
  };
  // Urutan stabil; produk yang stoknya habis selalu di paling bawah.
  return list
    .map((p, i) => ({ p, i }))
    .sort((x, y) => Number(inStock(y.p)) - Number(inStock(x.p)) || cmp[sort](x.p, y.p) || x.i - y.i)
    .map((x) => x.p);
}

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
  if (params.flash === '1') {
    return {
      title: 'Flash Sale Kamera & Gear Kreator',
      description: 'Flash sale Urbanix Store: harga spesial dengan kuota terbatas untuk kamera, lensa, drone, audio, dan aksesori original.',
      alternates: { canonical: '/produk?flash=1' },
    };
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
  const flashOnly = params?.flash === '1';
  const promoOnly = params?.promo === '1' || flashOnly;

  const [productResult, categories, settings] = await Promise.all([
    fetchAll<Product>('products').then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const, value: [] as Product[] })
    ),
    getCategories(),
    getStoreSettings(),
  ]);
  const waNumber = (settings?.whatsapp_number ?? '').replace(/\D/g, '');

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

    const matchesPromo = flashOnly ? Boolean(product.flash) : !promoOnly || (product.discount_percent ?? 0) > 0;

    return matchesCategory && matchesSearch && matchesPromo;
  });

  // Filter merek & harga diterapkan setelah kategori/pencarian/promo; pilihan merek dihitung dari hasil itu.
  const brandOf = (p: Product) => detectBrand(p.name) || '';
  const brandCounts = new Map<string, number>();
  for (const p of filteredProducts) {
    const b = brandOf(p);
    if (b) brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
  }
  const brandOptions = Array.from(brandCounts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const selectedBrand = brandOptions.some(([b]) => b === params?.merek) ? (params?.merek as string) : '';
  const range = PRICE_RANGES.find((r) => r.value === params?.harga);
  const narrowed = filteredProducts.filter((p) => {
    if (selectedBrand && brandOf(p) !== selectedBrand) return false;
    if (range) {
      const price = Number(p.final_price ?? p.discount_price ?? p.price) || 0;
      if (price < range.min || price >= range.max) return false;
    }
    return true;
  });

  const defaultSort: Sort = searchQuery ? 'relevan' : promoOnly ? 'diskon' : 'rekomendasi';
  const sort: Sort = (SORTS as readonly string[]).includes(params?.urut || '') && (params?.urut !== 'relevan' || searchQuery)
    ? (params?.urut as Sort)
    : defaultSort;
  // Pencarian kosong: saran produk terlaris/terdiskon supaya pembeli tidak buntu
  const suggestions =
    narrowed.length === 0
      ? sortProducts(activeProducts, 'terlaris', [], '').filter((p) => (p.discount_percent ?? 0) > 0 || (p.sold_count ?? 0) > 0).slice(0, 8)
      : [];
  const sortedProducts = sortProducts(narrowed, sort, searchQuery.split(/\s+/).filter(Boolean), searchQuery);
  const sortOptions = [
    ...(searchQuery ? [{ value: 'relevan', label: t('Paling relevan') }] : []),
    ...(!searchQuery && !promoOnly ? [{ value: 'rekomendasi', label: t('Rekomendasi') }] : []),
    { value: 'terlaris', label: t('Terlaris') },
    { value: 'terbaru', label: t('Terbaru') },
    { value: 'diskon', label: t('Diskon terbesar') },
    { value: 'termurah', label: t('Harga terendah') },
    { value: 'termahal', label: t('Harga tertinggi') },
    { value: 'nama', label: t('Nama A–Z') },
  ];

  const flashEnds = flashOnly
    ? filteredProducts.map((p) => p.flash?.ends_at).filter((d): d is string => Boolean(d)).sort()[0] ?? null
    : null;

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
  const chipHref = (cat: string) => `/produk?promo=1${cat ? `&category=${cat}` : ''}${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}${params?.urut ? `&urut=${params.urut}` : ''}`;

  const title = flashOnly
    ? t('Flash Sale')
    : promoOnly
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
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {flashOnly && <Bolt size={26} />}
              {title}
            </h1>
            {flashOnly && flashEnds && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                {t('Berakhir dalam')}
                <Countdown endsAt={flashEnds} tone="light" />
              </p>
            )}
          </div>
        </div>

        <form
          action="/produk"
          method="GET"
          className="mt-5 flex max-w-2xl gap-2 rounded-2xl border border-slate-200 bg-surface p-2"
        >
          {selectedCategory && (
            <input type="hidden" name="category" value={selectedCategory} />
          )}
          {promoOnly && <input type="hidden" name={flashOnly ? 'flash' : 'promo'} value="1" />}
          {params?.urut && params.urut !== 'relevan' && <input type="hidden" name="urut" value={params.urut} />}
          {range && <input type="hidden" name="harga" value={range.value} />}

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

        {promoCats.length > 0 && !flashOnly && (
          <PromoCategoryFilter
            selected={selectedCategory}
            options={[
              { id: '', name: t('Semua kategori'), count: promoTotal, max: Math.max(0, ...promoCats.map((c) => c.max)), href: chipHref('') },
              ...promoCats.map((c) => ({ id: c.id, name: c.name, count: c.count, max: c.max, href: chipHref(c.id) })),
            ]}
          />
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {t('{n} produk', { n: narrowed.length })}
            </span>
            {(selectedCategory || searchQuery || promoOnly || selectedBrand || range) && (
              <BackLink href="/produk">{t('Tampilkan semua produk')}</BackLink>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {brandOptions.length > 1 && (
              <CatalogFilter
                param="merek"
                value={selectedBrand}
                label={t('Filter merek')}
                options={[{ value: '', label: t('Semua merek') }, ...brandOptions.map(([b, n]) => ({ value: b, label: `${b} (${n})` }))]}
              />
            )}
            {filteredProducts.length > 1 && (
              <CatalogFilter
                param="harga"
                value={range?.value ?? ''}
                label={t('Filter harga')}
                options={[{ value: '', label: t('Semua harga') }, ...PRICE_RANGES.map((r) => ({ value: r.value, label: t(r.label) }))]}
              />
            )}
            {narrowed.length > 1 && <SortSelect options={sortOptions} value={sort} />}
          </div>
        </div>

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
        ) : narrowed.length === 0 ? (
          <>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
            <p className="font-bold">{t('Produk belum ditemukan')}</p>
            <p className="mt-2 text-sm text-slate-500">
              {t('Coba kata kunci atau kategori yang berbeda.')}
            </p>
            {/* Jangan buntu: tawarkan kategori, produk terlaris, dan tanya admin */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {categories.slice(0, 8).map((c) => (
                <a key={c.id} href={`/produk?category=${c.id}`} className="rounded-full bg-mist px-3.5 py-2 text-sm font-semibold text-ink hover:bg-slate-200">
                  {c.name}
                </a>
              ))}
            </div>
            {searchQuery && waNumber && (
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo admin Urbanix, ada "${params?.q ?? ''}"?`)}`}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-surface hover:bg-slate-800"
              >
                {t('Tanya admin apakah ada “{q}”', { q: params?.q ?? '' })}
              </a>
            )}
          </div>
          {suggestions.length > 0 && (
            <section className="mt-10" aria-labelledby="judul-saran">
              <h2 id="judul-saran" className="text-lg font-extrabold">{t('Mungkin kamu suka')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                {suggestions.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )}
          </>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
