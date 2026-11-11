import { fetchAll, type Product } from '@/lib/api';
import { SITE_URL, plainText, xmlEscape } from '@/lib/seo';
import { siteConfig } from '@/lib/siteConfig';

export const revalidate = 1800;

const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString('id-ID')}`;

/** RSS produk terbaru & promo Urbanix Store (untuk pembaca RSS, agregator, dan integrasi). */
export async function GET() {
  let products: Product[] = [];
  try {
    products = await fetchAll<Product>('products', { next: { revalidate: 1800 } } as RequestInit);
  } catch {
    products = [];
  }
  const latest = products
    .filter((p) => p.is_active !== false && p.stock > 0)
    .sort((a, b) => b.id - a.id)
    .slice(0, 40);

  const items = latest
    .map((p) => {
      const price = Number(p.final_price ?? p.price) || 0;
      const normal = Number(p.price) || 0;
      const priceText = price < normal ? `${rupiah(price)} (normal ${rupiah(normal)})` : rupiah(price);
      const link = `${SITE_URL}/produk/${p.id}`;
      const description = `${priceText}. ${plainText(p.description, 300)}`;
      return `    <item>
      <title>${xmlEscape(p.name)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <category>${xmlEscape(p.category_name || 'Produk')}</category>
      <description>${xmlEscape(description)}</description>${
        p.image_url ? `\n      <enclosure url="${xmlEscape(p.image_url)}" type="image/jpeg" length="0" />` : ''
      }
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(siteConfig.name)} | Produk terbaru</title>
    <link>${SITE_URL}</link>
    <description>${xmlEscape(siteConfig.motto)}</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
  });
}
