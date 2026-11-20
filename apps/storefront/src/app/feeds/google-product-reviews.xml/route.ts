import { getReviewFeed, type FeedReview } from '@/lib/api';
import { SITE_URL, cleanProductName, detectBrand, publicSku, xmlEscape } from '@/lib/seo';

/**
 * Feed ulasan produk untuk Google Merchant Center (program Product Ratings → bintang di Google Shopping).
 * Alamat: /feeds/google-product-reviews.xml — didaftarkan di Merchant Center sebagai feed ulasan produk (ambil terjadwal).
 * Isinya hanya ulasan pembeli terverifikasi (ProductReview dari pesanan urbanix.id), bukan salinan ulasan Shopee.
 * Ulasan tanpa teks dilewati karena Google mewajibkan isi ulasan.
 * Format: https://www.google.com/shopping/reviews/schema/product/2.4/product_reviews.xsd
 */
export const revalidate = 3600;

const tag = (name: string, value: string, attrs = '') => `<${name}${attrs}>${xmlEscape(value)}</${name}>`;

function review(r: FeedReview): string {
  const url = `${SITE_URL}/produk/${r.product_id}`;
  const brand = detectBrand(r.product_name);
  const sku = publicSku(r.product_sku);
  const ids = [
    sku ? `<skus>${tag('sku', sku)}</skus>` : '',
    brand ? `<brands>${tag('brand', brand)}</brands>` : '',
  ].join('');
  return `    <review>
      ${tag('review_id', `urbanix-${r.id}`)}
      <reviewer>${tag('name', r.name || 'Pembeli', ' is_anonymous="false"')}</reviewer>
      ${tag('review_timestamp', new Date(r.created_at).toISOString())}
      ${tag('content', r.body.trim())}
      ${tag('review_url', `${url}#ulasan`, ' type="group"')}
      <ratings>${tag('overall', String(r.rating), ' min="1" max="5"')}</ratings>
      <products>
        <product>
          ${ids ? `<product_ids>${ids}</product_ids>` : ''}
          ${tag('product_name', cleanProductName(r.product_name).slice(0, 150))}
          ${tag('product_url', url)}
        </product>
      </products>
      <is_spam>false</is_spam>
    </review>`;
}

export async function GET() {
  const reviews = (await getReviewFeed()).filter((r) => r.body && r.body.trim());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.4/product_reviews.xsd">
  <version>2.4</version>
  <publisher>
    <name>Urbanix Store</name>
    <favicon>${SITE_URL}/icon.png</favicon>
  </publisher>
  <reviews>
${reviews.map(review).join('\n')}
  </reviews>
</feed>`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
