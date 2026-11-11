import { NextResponse } from 'next/server';
import { getActiveProducts } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Saran pencarian untuk kotak cari di header (muncul saat pembeli mengetik). */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [], total: 0 });

  const products = await getActiveProducts().catch(() => []);
  const words = q.split(/\s+/).filter(Boolean);
  const matches = products.filter((p) => {
    const text = `${p.name} ${p.sku} ${p.category_name}`.toLowerCase();
    return words.every((w) => text.includes(w));
  });
  // Nama yang diawali kata kunci tampil lebih dulu.
  matches.sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)));

  const results = matches.slice(0, 6).map((p) => {
    const price = Number(p.price) || 0;
    const final = Number(p.final_price ?? p.discount_price) || 0;
    return {
      id: p.id,
      name: p.name,
      category: p.category_name,
      image: p.image_url,
      price: final > 0 && final < price ? final : price,
      original: final > 0 && final < price ? price : null,
    };
  });

  return NextResponse.json(
    { results, total: matches.length },
    { headers: { 'Cache-Control': 'public, max-age=30' } }
  );
}
