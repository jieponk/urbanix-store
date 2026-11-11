import { fetchAll, getArticles, getCategories, type ArticleCard, type Product } from '@/lib/api';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export default async function sitemap() {
  const now = new Date();
  const pages = ['', '/produk', '/produk?promo=1', '/inspirasi', '/berita', '/tentang-kami', '/kontak', '/cek-pesanan', '/syarat-ketentuan', '/kebijakan-privasi'].map((path) => ({
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

  const articles: ArticleCard[] = [];
  for (let page = 1; page <= 20; page++) {
    const data = await getArticles({ page, limit: 48 });
    if (!data) break;
    articles.push(...data.results);
    if (page >= data.pages) break;
  }

  const categories = await getCategories();

  return [
    ...pages,
    ...categories.map((c) => ({
      url: `${SITE_URL}/produk?category=${c.id}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/inspirasi/${a.slug}`,
      lastModified: a.published_at ? new Date(a.published_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
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
