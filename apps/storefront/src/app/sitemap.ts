import { fetchAll, type Product } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const pages = ['', '/produk', '/produk?promo=1', '/berita', '/tentang-kami', '/kontak', '/cek-pesanan', '/syarat-ketentuan', '/kebijakan-privasi'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path.startsWith('/produk') ? ('daily' as const) : ('monthly' as const),
    priority: path === '' ? 1 : path === '/produk' ? 0.9 : 0.5,
  }));

  let products: Product[] = [];
  try {
    products = await fetchAll<Product>('products', { next: { revalidate: 3600 } } as RequestInit);
  } catch {
    products = [];
  }

  return [
    ...pages,
    ...products
      .filter((p) => p.is_active !== false)
      .map((p) => ({
        url: `${SITE_URL}/produk/${p.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
  ];
}
