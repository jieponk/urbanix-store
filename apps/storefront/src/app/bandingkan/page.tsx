import Link from 'next/link';
import { LoadCompareFromDevice, RemoveFromCompare, SyncCompare } from '@/components/CompareControls';
import { API, type Product } from '@/lib/api';
import { productImg } from '@/lib/img';
import { getT } from '@/lib/lang-server';
import { money, weightText } from '@/lib/money';
import { parseDescription, splitKeyValue } from '@/lib/productDescription';
import { cardProductName, detectBrand } from '@/lib/seo';

export const metadata = { title: 'Bandingkan produk', robots: { index: false, follow: true } };

type SearchParams = { ids?: string };

async function load(id: number): Promise<Product | null> {
  try {
    const r = await fetch(`${API}/products/${id}/`, { next: { revalidate: 120 } } as RequestInit);
    return r.ok ? ((await r.json()) as Product) : null;
  } catch {
    return null;
  }
}

/** Spesifikasi "Kunci: Nilai" dari deskripsi (bagian Spesifikasi). */
function specs(p: Product): Map<string, string> {
  const out = new Map<string, string>();
  for (const section of parseDescription(p.description).specs) {
    for (const block of section.blocks) {
      const lines = block.type === 'list' ? block.items : [block.text];
      for (const line of lines) {
        const kv = splitKeyValue(line);
        if (kv && kv.key.length <= 40 && !out.has(kv.key.toLowerCase())) out.set(kv.key.toLowerCase(), `${kv.key}\u0000${kv.value}`);
      }
    }
  }
  return out;
}

export default async function ComparePage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const t = getT();
  const params = (await searchParams) || {};
  const ids = Array.from(new Set((params.ids || '').split(',').map((s) => parseInt(s, 10)).filter((n) => n > 0))).slice(0, 3);
  const products = (await Promise.all(ids.map(load))).filter((p): p is Product => Boolean(p));

  if (products.length < 2) {
    return (
      <div className="px-4 py-12 sm:px-6">
        {ids.length === 0 && <LoadCompareFromDevice />}
        <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <h1 className="text-xl font-extrabold text-ink">{t('Bandingkan produk')}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t('Buka halaman produk lalu tekan “Bandingkan” di 2–3 produk yang lagi kamu galauin.')}
          </p>
          <Link href="/produk" className="mt-5 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-surface">
            {t('Pilih produk')}
          </Link>
        </div>
      </div>
    );
  }

  const specMaps = products.map(specs);
  // Baris spesifikasi yang dimiliki minimal 2 produk (supaya bisa dibandingkan), maks. 14 baris.
  const counts = new Map<string, number>();
  specMaps.forEach((m) => m.forEach((_v, k) => counts.set(k, (counts.get(k) || 0) + 1)));
  const specKeys = Array.from(counts.entries()).filter(([, n]) => n >= 2).map(([k]) => k).slice(0, 14);
  const label = (k: string) => (specMaps.find((m) => m.has(k))?.get(k) || k).split('\u0000')[0];
  const val = (m: Map<string, string>, k: string) => (m.get(k) || '').split('\u0000')[1] || '–';

  const price = (p: Product) => Number(p.final_price ?? p.price) || 0;
  const cheapest = Math.min(...products.map(price));
  const inStock = (p: Product) => p.stock > 0 || (p.variations ?? []).some((v) => v.stock > 0);

  const rows: { label: string; cells: React.ReactNode[] }[] = [
    { label: t('Harga'), cells: products.map((p) => (
      <span key={p.id} className={`font-extrabold ${price(p) === cheapest ? 'text-sale-600' : 'text-ink'}`}>
        {money(price(p))}
        {price(p) === cheapest && <span className="ml-1 rounded bg-sale-50 px-1.5 py-0.5 text-[10px] font-extrabold text-sale-700">{t('Termurah')}</span>}
      </span>
    )) },
    { label: t('Merek'), cells: products.map((p) => detectBrand(p.name) || '–') },
    { label: t('Kategori'), cells: products.map((p) => p.category_name || '–') },
    { label: t('Stok'), cells: products.map((p) => (inStock(p) ? t('Tersedia') : t('Habis'))) },
    { label: t('Varian'), cells: products.map((p) => (p.variations?.length ? t('{n} pilihan', { n: p.variations.length }) : '–')) },
    { label: t('Ulasan pembeli'), cells: products.map((p) => (p.review_count && p.rating_avg != null ? `★ ${p.rating_avg.toFixed(1)} (${p.review_count})` : '–')) },
    { label: t('Terjual (web)'), cells: products.map((p) => (p.sold_count ? String(p.sold_count) : '–')) },
    { label: t('Berat kirim'), cells: products.map((p) => (p.package?.ship_weight_grams ? weightText(p.package.ship_weight_grams) : '–')) },
    ...specKeys.map((k) => ({ label: label(k), cells: specMaps.map((m) => val(m, k)) })),
  ];

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-12">
      <SyncCompare ids={products.map((p) => p.id)} />
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Bandingkan produk')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('Spesifikasi diambil dari deskripsi produk. Cek detail di halaman masing-masing.')}</p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="w-36 p-3 text-left align-bottom text-xs font-semibold text-slate-500">{t('Produk')}</th>
                {products.map((p) => (
                  <th key={p.id} scope="col" className="p-3 text-left align-top font-normal">
                    <Link href={`/produk/${p.id}`} className="group block">
                      <img src={productImg(p.image_url, 300)} alt="" width={160} height={160} className="h-32 w-full rounded-xl bg-white object-contain ring-1 ring-slate-200" />
                      <span className="mt-2 line-clamp-3 font-bold leading-snug text-ink group-hover:underline">{cardProductName(p.name)}</span>
                    </Link>
                    <RemoveFromCompare id={p.id} ids={products.map((x) => x.id)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-slate-100">
                  <th scope="row" className="p-3 text-left align-top text-xs font-semibold text-slate-500">{row.label}</th>
                  {row.cells.map((cell, i) => (
                    <td key={i} className="p-3 align-top text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
