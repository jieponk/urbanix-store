export type Product = {
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
 * Produk untuk beranda: hanya halaman pertama dari API (tidak mengambil
 * seluruh katalog), lalu dipilih yang aktif, ada stok, dan punya gambar.
 */
export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const response = await fetch(`${API}/products/`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`API products gagal: HTTP ${response.status}`);
  }

  const data: ApiPage<Product> | Product[] = await response.json();
  const list = Array.isArray(data) ? data : data.results;

  return list
    .filter((p) => p.is_active !== false && p.stock > 0 && p.image_url)
    .slice(0, limit);
}
