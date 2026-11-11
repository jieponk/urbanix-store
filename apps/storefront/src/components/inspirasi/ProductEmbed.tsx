import Link from 'next/link';
import { money, type Product } from '@/lib/api';
import { productImg } from '@/lib/img';

/** Kartu produk yang disisipkan di tengah artikel ([[produk:ID]]). */
export default function ProductEmbed({ product }: { product?: Product }) {
  if (!product) return null;
  const normal = Number(product.price) || 0;
  const final = Number(product.final_price ?? product.discount_price) || normal;
  const discount = final > 0 && final < normal;
  const pct = discount ? product.discount_percent || Math.round(((normal - final) / normal) * 100) : 0;

  return (
    <aside className="not-prose my-9 overflow-hidden rounded-3xl bg-surface shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
      <div className="flex flex-col sm:flex-row">
        <Link href={`/produk/${product.id}`} className="relative flex aspect-square shrink-0 items-center justify-center bg-[#f7f7f7] p-5 sm:aspect-auto sm:w-52">
          {product.image_url && (
            <img src={productImg(product.image_url, 450)} alt={product.name} loading="lazy" className="h-full max-h-48 w-full object-contain" />
          )}
          {discount && (
            <span className="absolute left-3 top-3 rounded-md bg-sale-600 px-2 py-1 text-xs font-extrabold text-white">-{pct}%</span>
          )}
        </Link>
        <div className="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-500">Produk di artikel ini</p>
          <Link href={`/produk/${product.id}`} className="line-clamp-2 text-lg font-extrabold leading-snug text-ink hover:underline">
            {product.name}
          </Link>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={`text-xl font-extrabold ${discount ? 'text-sale-600' : 'text-ink'}`}>{money(final)}</span>
            {discount && <span className="text-sm text-slate-500 line-through">{money(normal)}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/produk/${product.id}`} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
              Lihat produk
            </Link>
            {product.stock <= 0 && <span className="self-center text-sm font-semibold text-slate-500">Stok sedang habis</span>}
          </div>
        </div>
      </div>
    </aside>
  );
}
