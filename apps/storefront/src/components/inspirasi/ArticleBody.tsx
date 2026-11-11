import type { Product } from '@/lib/api';
import type { Block } from '@/lib/markdown';
import ProductEmbed from './ProductEmbed';

/** Isi artikel: potongan HTML hasil Markdown + kartu produk + video. Dipakai di halaman publik & pratinjau Seller Center. */
export default function ArticleBody({
  blocks,
  products,
  preview = false,
}: {
  blocks: Block[];
  products: Record<string, Product>;
  preview?: boolean;
}) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === 'html')
          return <div key={i} className={`article-prose ${i === 0 ? 'lead' : ''}`} dangerouslySetInnerHTML={{ __html: b.html }} />;
        if (b.type === 'youtube')
          return (
            <div key={i} className="my-9 aspect-video overflow-hidden rounded-3xl bg-black shadow-xl">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${b.id}`}
                title="Video YouTube"
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          );
        const product = products[b.id];
        if (product) return <ProductEmbed key={i} product={product} />;
        return !preview ? null : (
          <p key={i} className="my-6 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500">
            Kartu produk #{b.id} (produk tidak ditemukan / nonaktif)
          </p>
        );
      })}
    </>
  );
}
