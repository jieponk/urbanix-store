export type Variation = {
  variation_id: string;
  name: string;
  sku: string;
  price: string | number;
  /** Harga setelah promo "Potong harga" (sama dengan price bila tidak ada promo). */
  final_price?: string | number;
  discount_percent?: number;
  stock: number;
  image_url?: string;
};

export type Product = {
  variations?: Variation[];
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
  /** Gambar lainnya (tanpa gambar utama), urutan sesuai slide Shopee. */
  images?: string[];
  /** Harga dibayar (untuk produk bervarian: varian termurah setelah promo). */
  final_price?: string | number;
  discount_percent?: number;
  promo_name?: string;
  promo_ends_at?: string | null;
  is_active: boolean;
};

export type Category = {
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

export const API = (
  process.env.API_URL || 'http://127.0.0.1:8000/api/v1'
).replace(/\/+$/, '');

export const money = (value: string | number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export async function fetchAll<T>(
  endpoint: string,
  init: RequestInit = { cache: 'no-store' }
): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = `${API}/${endpoint}/`;
  let pageCount = 0;

  while (next && pageCount < 100) {
    const response: Response = await fetch(next, init);

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

/** Daftar kategori untuk menu header. Kalau API gagal, menu kategori disembunyikan. */
export async function getCategories(): Promise<Category[]> {
  try {
    return await fetchAll<Category>('categories', {
      next: { revalidate: 300 },
    } as RequestInit);
  } catch {
    return [];
  }
}

/**
 * Produk untuk beranda: semua produk yang aktif, ada stok, dan punya gambar.
 * Dicache 60 detik agar beranda tidak memanggil API di setiap kunjungan.
 */
export async function getActiveProducts(): Promise<Product[]> {
  const all = await fetchAll<Product>('products', {
    next: { revalidate: 60 },
  } as RequestInit);

  return all.filter(
    (p) => p.is_active !== false && p.stock > 0 && p.image_url
  );
}

/**
 * Varian yang harus dipilih pembeli (sama dengan aturan backend):
 * produk dengan satu varian tanpa nama dianggap produk biasa.
 */
export function buyableVariations(product: Product): Variation[] {
  const variations = product.variations ?? [];
  if (variations.length > 1 || (variations.length === 1 && variations[0].name.trim())) {
    return variations;
  }
  return [];
}

export type StoreSettings = {
  whatsapp_number: string;
  shopee_store_url: string;
  methods: { midtrans: boolean; whatsapp: boolean; shopee: boolean };
  whatsapp_discount_percent: string;
  whatsapp_discount_on_promo: boolean;
  show_whatsapp_popup: boolean;
  shopee_rating: string | null;
  shopee_rating_count: number | null;
  shopee_reviews_url: string;
  review_count: number;
  popup_voucher?: import('./vouchers').VoucherInfo | null;
};

export type Review = {
  id: number;
  name: string;
  rating: number;
  text: string;
  product_id: number | null;
  product_name: string;
  variation_name: string;
  date: string | null;
  source: string;
};

/** Ulasan asli pembeli yang ditandai "Tampilkan di website" di admin. */
export async function getReviews(params: { product?: number; limit?: number } = {}): Promise<Review[]> {
  const query = new URLSearchParams();
  if (params.product) query.set('product', String(params.product));
  if (params.limit) query.set('limit', String(params.limit));
  try {
    const response = await fetch(`${API}/reviews/?${query}`, { next: { revalidate: 120 } } as RequestInit);
    return response.ok ? ((await response.json()) as Review[]) : [];
  } catch {
    return [];
  }
}

/** Ringkasan promo yang sedang berjalan, dihitung dari data produk. */
export function promoSummary(products: Product[]) {
  const promo = products.filter((p) => (p.discount_percent ?? 0) > 0);
  if (promo.length === 0) return null;
  const ends = promo
    .map((p) => p.promo_ends_at)
    .filter((d): d is string => Boolean(d))
    .sort();
  const names = Array.from(new Set(promo.map((p) => p.promo_name).filter(Boolean)));
  return {
    name: names[0] || 'Promo',
    count: promo.length,
    maxDiscount: Math.max(...promo.map((p) => p.discount_percent ?? 0)),
    endsAt: ends.length ? ends[ends.length - 1] : null,
  };
}

/** Pengaturan toko dari admin Django (nomor WhatsApp, dll.). Dicache 60 detik. */
export async function getStoreSettings(): Promise<StoreSettings | null> {
  try {
    const response = await fetch(`${API}/store-settings/`, {
      next: { revalidate: 60 },
    } as RequestInit);
    return response.ok ? ((await response.json()) as StoreSettings) : null;
  } catch {
    return null;
  }
}

/** Voucher publik yang sedang berlaku (untuk diklaim). */
export async function getVouchers(): Promise<import('./vouchers').VoucherInfo[]> {
  try {
    const response = await fetch(`${API}/vouchers/`, { next: { revalidate: 60 } } as RequestInit);
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
}

export type NewsArticle = {
  id: number;
  title: string;
  summary: string;
  url: string;
  image_url: string;
  source: string;
  source_id: number;
  published_at: string;
  is_translated: boolean;
  is_pinned: boolean;
};

export type NewsPage = {
  count: number;
  page: number;
  pages: number;
  results: NewsArticle[];
  sources: { id: number; name: string; site_url: string }[];
};

/** Berita kamera & fotografi (diambil dari RSS, diterjemahkan di backend). */
export async function getNews(params: { page?: number; limit?: number; source?: string } = {}): Promise<NewsPage | null> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.source) query.set('source', params.source);
  try {
    const response = await fetch(`${API}/news/?${query}`, { next: { revalidate: 300 } } as RequestInit);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export type NewsDetail = NewsArticle & {
  source_site: string;
  original_title: string;
  related_brand: string;
  related_products: Product[];
  more: NewsArticle[];
};

export async function getNewsDetail(id: string): Promise<NewsDetail | null> {
  if (!/^\d+$/.test(id)) return null;
  try {
    const response = await fetch(`${API}/news/${id}/`, { next: { revalidate: 300 } } as RequestInit);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export type ApiBanner = { id: number; title: string; image: string; mobile_image: string; link_url: string };

/** Banner beranda dari Seller Center (gambar disajikan lewat /media/... di storefront). */
export async function getBanners(): Promise<ApiBanner[]> {
  try {
    const response = await fetch(`${API}/banners/`, { next: { revalidate: 60 } } as RequestInit);
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
}

/* ---------------------------------------------------------------- Artikel Urbanix (Inspirasi) */
export type ArticleCard = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover: string;
  category: { name: string; slug: string } | null;
  author_name: string;
  published_at: string | null;
  reading_minutes: number;
  is_pinned: boolean;
  tags: string[];
  comment_count: number | null;
};

export type ArticleComment = {
  id: number;
  name: string;
  body: string;
  gif_url?: string;
  created_at: string;
  is_staff_reply: boolean;
  reactions?: Record<string, number>;
  my_reaction?: string;
  replies?: ArticleComment[];
};

export type ArticleDetail = ArticleCard & {
  body: string;
  updated_at: string;
  allow_comments: boolean;
  products: Record<string, Product>;
  related_products: Product[];
  comments: ArticleComment[];
  more: ArticleCard[];
};

export type ArticlePage = { count: number; page: number; pages: number; results: ArticleCard[] };

export async function getArticles(
  params: { page?: number; limit?: number; category?: string; label?: string } = {}
): Promise<ArticlePage | null> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) query.set(k, String(v));
  try {
    const response = await fetch(`${API}/articles/?${query}`, { next: { revalidate: 60 } } as RequestInit);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

export async function getArticleCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  try {
    const response = await fetch(`${API}/article-categories/`, { next: { revalidate: 300 } } as RequestInit);
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
}

export async function getArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    const response = await fetch(`${API}/articles/${encodeURIComponent(slug)}/`, { cache: 'no-store' });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
