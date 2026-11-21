import { cardProductName } from '@/lib/seo';
import { NextResponse } from 'next/server';
import { getActiveProducts, getCategories, type Product } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Merek yang disarankan saat kotak cari masih kosong (urutan sama dengan deretan merek di beranda). */
const POPULAR_BRANDS = ['DJI', 'Insta360', 'Sony', 'Canon', 'Nikon', 'Fujifilm', 'Hollyland', 'Kodak'];

const cleanName = (name: string) => name.replace(/^URBANIX\s*[-–]\s*/i, '').replace(/\s+/g, ' ').trim();

/**
 * Saran kata kunci dari nama produk: potongan nama sampai kata yang cocok + 2 kata berikutnya.
 * "dji os" -> "DJI Osmo Pocket 3", "DJI Osmo Action 5 Pro" (tanpa duplikat).
 */
function keywordSuggestions(products: Product[], words: string[], limit = 6) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of products) {
    const parts = cleanName(p.name).split(' ');
    const lower = parts.map((w) => w.toLowerCase());
    let last = -1;
    for (const w of words) {
      const idx = lower.findIndex((x, i) => i > last - 1 && x.includes(w));
      if (idx < 0) {
        last = -1;
        break;
      }
      last = Math.max(last, idx);
    }
    if (last < 0) continue;
    const phrase = parts.slice(0, Math.min(parts.length, last + 3)).join(' ').replace(/[,(\-–]+$/, '').trim();
    const key = phrase.toLowerCase();
    if (phrase.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(phrase);
    if (out.length >= limit) break;
  }
  return out;
}

/** Saran pencarian: kata kunci, kategori, dan produk (dengan foto & harga). Tanpa q: kategori & merek populer. */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase().slice(0, 80);
  const [products, categories] = await Promise.all([
    getActiveProducts().catch(() => [] as Product[]),
    getCategories().catch(() => []),
  ]);

  if (q.length < 2) {
    const counts = new Map<number, number>();
    for (const p of products) counts.set(p.category, (counts.get(p.category) || 0) + 1);
    const popularCategories = categories
      .map((c) => ({ id: c.id, name: c.name, count: counts.get(c.id) || 0 }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return NextResponse.json(
      { results: [], total: 0, suggestions: [], categories: popularCategories, brands: POPULAR_BRANDS },
      { headers: { 'Cache-Control': 'public, max-age=120' } }
    );
  }

  const words = q.split(/\s+/).filter(Boolean);
  const matches = products.filter((p) => {
    const text = `${p.name} ${p.sku} ${p.category_name}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  // Nama yang diawali kata kunci tampil lebih dulu.
  const starts = (p: Product) => cleanName(p.name).toLowerCase().startsWith(q);
  matches.sort((a, b) => Number(!starts(a)) - Number(!starts(b)));

  const matchedCategories = categories
    .map((c) => ({
      id: c.id,
      name: c.name,
      count: matches.filter((p) => p.category === c.id).length,
      nameMatch: words.every((w) => c.name.toLowerCase().includes(w)),
    }))
    .filter((c) => c.count > 0 || c.nameMatch)
    .sort((a, b) => Number(b.nameMatch) - Number(a.nameMatch) || b.count - a.count)
    .slice(0, 4)
    .map(({ id, name, count }) => ({ id, name, count }));

  const results = matches.slice(0, 6).map((p) => {
    const price = Number(p.price) || 0;
    const final = Number(p.final_price ?? p.discount_price) || 0;
    return {
      id: p.id,
      name: cardProductName(p.name),
      category: p.category_name,
      image: p.image_url,
      price: final > 0 && final < price ? final : price,
      original: final > 0 && final < price ? price : null,
    };
  });

  return NextResponse.json(
    { results, total: matches.length, suggestions: keywordSuggestions(matches, words), categories: matchedCategories, brands: [] },
    { headers: { 'Cache-Control': 'public, max-age=30' } }
  );
}
