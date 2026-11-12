import { fetchAll, type Product } from '@/lib/api';
import { SITE_URL, cleanProductName, detectBrand, plainText, xmlEscape } from '@/lib/seo';

/**
 * Feed produk untuk Google Merchant Center (produk tampil gratis di Google Shopping).
 * Alamat: /feeds/google-merchant.xml — didaftarkan sekali di Merchant Center sebagai "scheduled fetch".
 * Satu baris per produk; harga = harga yang tampil di halaman produk (termasuk promo).
 */
export const revalidate = 3600;

// Barang tambahan/jasa yang bukan produk jualan untuk Google Shopping.
const NOT_FOR_SHOPPING = /bubble\s*wrap|kertas\s*kado|gift\s*wrap|add-?on|packing\s*tambahan|extra\s*packing/i;

const idr = (value: number) => `${Math.round(value)} IDR`;
const cleanTitle = (name: string) => cleanProductName(name).slice(0, 150);

function item(p: Product): string {
  const normal = Number(p.price) || 0;
  const final = Number(p.final_price ?? p.discount_price) || normal;
  const onSale = final > 0 && final < normal;
  const brand = detectBrand(p.name);
  const images = (p.images ?? []).filter(Boolean).slice(0, 10);
  const link = `${SITE_URL}/produk/${p.id}`;
  const fields: [string, string | undefined][] = [
    ['g:id', String(p.id)],
    ['g:title', cleanTitle(p.name)],
    ['g:description', plainText(p.description, 4900) || cleanTitle(p.name)],
    ['g:link', link],
    ['g:image_link', p.image_url],
    ...images.map((img): [string, string] => ['g:additional_image_link', img]),
    ['g:availability', p.stock > 0 ? 'in_stock' : 'out_of_stock'],
    ['g:price', idr(onSale ? normal : final)],
    ['g:sale_price', onSale ? idr(final) : undefined],
    [
      'g:sale_price_effective_date',
      onSale && p.promo_ends_at ? `${new Date().toISOString().slice(0, 19)}+00:00/${new Date(p.promo_ends_at).toISOString().slice(0, 19)}+00:00` : undefined,
    ],
    ['g:condition', 'new'],
    ['g:brand', brand],
    // Tanpa GTIN; produk tanpa merek jelas ditandai tidak punya ID global agar tidak dianggap data kurang.
    ['g:identifier_exists', brand ? undefined : 'no'],
    ['g:product_type', p.category_name || undefined],
  ];
  const body = fields
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `      <${k}>${xmlEscape(String(v))}</${k}>`)
    .join('\n');
  return `    <item>\n${body}\n    </item>`;
}

export async function GET() {
  let products: Product[] = [];
  try {
    products = await fetchAll<Product>('products', { next: { revalidate: 3600 } } as RequestInit);
  } catch {
    products = [];
  }
  const items = products
    .filter((p) => p.is_active !== false && p.image_url && Number(p.final_price ?? p.price) > 0)
    .filter((p) => !NOT_FOR_SHOPPING.test(p.name))
    .map(item)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Urbanix Store</title>
    <link>${SITE_URL}</link>
    <description>Kamera, lensa, drone, audio, dan aksesori kreator original bergaransi.</description>
${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
