import Link from 'next/link';
import NewsCard, { newsDate } from '@/components/NewsCard';
import NewsImage from '@/components/NewsImage';
import ProductCard from '@/components/ProductCard';
import { BackLink, ExternalIcon } from '@/components/Icons';
import { getNewsDetail } from '@/lib/api';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> | Params }) {
  const { id } = await params;
  const article = await getNewsDetail(id);
  return article
    ? { title: article.title, description: article.summary || `Berita dari ${article.source}` }
    : { title: 'Berita tidak ditemukan' };
}

export default async function NewsDetailPage({ params }: { params: Promise<Params> | Params }) {
  const { id } = await params;
  const article = await getNewsDetail(id);

  if (!article) {
    return (
      <div className="px-4 py-16">
        <div className="mx-auto max-w-lg rounded-2xl bg-surface p-8 text-center ring-1 ring-slate-200">
          <h1 className="text-xl font-extrabold text-ink">Berita tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">Berita ini mungkin sudah lama atau disembunyikan.</p>
          <Link href="/berita" className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-slate-800">
            Lihat berita lain
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(article.published_at).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <BackLink href="/berita">Semua berita</BackLink>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article>
          <p className="text-sm font-bold text-sale-600">{article.source}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl lg:text-4xl">
            {article.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            <time dateTime={article.published_at}>{date}</time> · {newsDate(article.published_at)}
          </p>

          <figure className="mt-5">
            <NewsImage src={article.image_url} alt={article.title} className="aspect-[16/9] w-full rounded-2xl" />
            {article.image_url && (
              <figcaption className="mt-1.5 text-xs text-slate-500">Foto: {article.source}</figcaption>
            )}
          </figure>

          {article.summary && (
            <p className="mt-6 text-lg leading-8 text-ink">{article.summary}</p>
          )}

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-bold text-surface hover:bg-slate-800 sm:w-fit"
          >
            Baca artikel lengkap di {article.source}
            <ExternalIcon size={16} />
          </a>

          <div className="mt-6 rounded-xl bg-mist p-4 text-xs leading-5 text-slate-600">
            <p>
              <b className="text-ink">Sumber:</b>{' '}
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                {article.source}
              </a>
              {article.is_translated && article.original_title !== article.title && (
                <> — judul asli: “{article.original_title}”</>
              )}
            </p>
            <p className="mt-1">
              {article.is_translated && article.original_title !== article.title
                ? 'Judul dan ringkasan diterjemahkan otomatis ke Bahasa Indonesia. '
                : ''}
              Artikel lengkap, foto, dan hak ciptanya milik {article.source}.
            </p>
          </div>
        </article>

        {/* Produk terkait: pembaca berita bisa langsung belanja */}
        {article.related_products.length > 0 && (
          <aside aria-labelledby="judul-produk-terkait" className="lg:sticky lg:top-28 lg:self-start">
            <h2 id="judul-produk-terkait" className="text-lg font-extrabold text-ink">
              {article.related_brand ? `Produk ${article.related_brand} di Urbanix` : 'Produk pilihan Urbanix'}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {article.related_products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {article.related_brand && (
              <Link
                href={`/produk?q=${encodeURIComponent(article.related_brand)}`}
                className="mt-3 block text-center text-sm font-bold text-ink hover:underline"
              >
                Lihat semua produk {article.related_brand}
              </Link>
            )}
          </aside>
        )}
      </div>

      {article.more.length > 0 && (
        <section aria-labelledby="judul-berita-lain" className="mt-12">
          <h2 id="judul-berita-lain" className="text-xl font-extrabold tracking-tight text-ink">Berita lainnya</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {article.more.map((item) => (
              <NewsCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
