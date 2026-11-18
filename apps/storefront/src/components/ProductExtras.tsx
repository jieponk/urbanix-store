import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { ArrowRight } from '@/components/inspirasi/InspoIcons';
import type { ArticleCard, Product } from '@/lib/api';
import { getT } from '@/lib/lang-server';

/** "Masih galau? Baca dulu" — artikel Inspirasi yang membahas produk ini. */
export function RelatedArticles({ articles }: { articles: ArticleCard[] }) {
  const t = getT();
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="judul-artikel-produk" className="mt-6 rounded-2xl bg-mist p-4 sm:p-5">
      <h2 id="judul-artikel-produk" className="text-sm font-extrabold text-ink">{t('Masih galau? Baca dulu ini')}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {articles.map((a) => (
          <li key={a.id}>
            <Link href={`/inspirasi/${a.slug}`} className="group flex items-center gap-3 rounded-xl bg-surface p-2.5 ring-1 ring-slate-200 transition hover:ring-ink">
              {a.cover && (
                <img src={a.cover} alt="" width={96} height={50} loading="lazy" className="h-12 w-[92px] shrink-0 rounded-md object-cover" />
              )}
              <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-ink line-clamp-2">{a.title}</span>
              <ArrowRight size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Lengkapi gear-mu" — aksesori yang cocok (merek/nama sama, kategori pelengkap, stok ada). */
export function CompleteYourGear({ products }: { products: Product[] }) {
  const t = getT();
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="judul-lengkapi" className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="judul-lengkapi" className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">{t('Lengkapi gear-mu')}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{t('Aksesori yang cocok dipakai bareng produk ini.')}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
