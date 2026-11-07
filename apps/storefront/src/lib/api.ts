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
    const response = await fetch(next, init);

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
};

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
