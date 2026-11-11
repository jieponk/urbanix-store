import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import ProductCard from '@/components/ProductCard';
import ArticleBody from '@/components/inspirasi/ArticleBody';
import ArticleCard, { Cover, articleDate } from '@/components/inspirasi/ArticleCard';
import CommentSection from '@/components/inspirasi/CommentSection';
import ArticleEnhancer from '@/components/inspirasi/ArticleEnhancer';
import ReadingProgress from '@/components/inspirasi/ReadingProgress';
import ShareButtons from '@/components/inspirasi/ShareButtons';
import { getArticle } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

const load = cache(getArticle);

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = await load(params.slug);
  if (!a) return { title: 'Artikel tidak ditemukan', robots: { index: false } };
  const image = a.cover || '/inspirasi/default-cover.jpg';
  return {
    title: a.title,
    description: a.excerpt,
    keywords: a.tags,
    alternates: { canonical: `/inspirasi/${a.slug}` },
    openGraph: {
      type: 'article',
      title: a.title,
      description: a.excerpt,
      publishedTime: a.published_at || undefined,
      modifiedTime: a.updated_at,
      authors: [a.author_name],
      tags: a.tags,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: a.title, description: a.excerpt, images: [image] },
  };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const a = await load(params.slug);
  if (!a) notFound();
  const article = a!;

  const { blocks, headings } = renderMarkdown(article.body);
  const url = `${SITE_URL}/inspirasi/${article.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: [`${SITE_URL}${article.cover || '/inspirasi/default-cover.jpg'}`],
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: article.author_name },
    publisher: { '@type': 'Organization', name: 'Urbanix Store', logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/urbanix-logo-dark.png` } },
    mainEntityOfPage: url,
    articleSection: article.category?.name,
    keywords: article.tags.join(', '),
    inLanguage: 'id-ID',
  };

  return (
    <article>
      <ReadingProgress targetId="isi-artikel" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Kepala artikel */}
      <header className="relative overflow-hidden bg-cobalt-900 px-4 pb-36 pt-10 text-white sm:px-6 sm:pb-48 sm:pt-14 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60">
            <Link href="/inspirasi" className="hover:text-white">Inspirasi</Link>
            {article.category && (
              <>
                <span className="mx-2">/</span>
                <Link href={`/inspirasi?kategori=${article.category.slug}#artikel`} className="hover:text-white">
                  {article.category.name}
                </Link>
              </>
            )}
          </nav>
          <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl">{article.title}</h1>
          {article.excerpt && <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">{article.excerpt}</p>}
          <div className="mt-7 flex items-center justify-center gap-3 text-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sun-400 font-extrabold text-cobalt-900">
              {article.author_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="text-left">
              <p className="font-bold">{article.author_name}</p>
              <p className="text-white/65">
                <time dateTime={article.published_at || undefined}>{articleDate(article.published_at)}</time> ·{' '}
                {article.reading_minutes} menit baca
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Sampul */}
      <div className="relative -mt-28 px-4 sm:-mt-36 sm:px-6 lg:px-8">
        <div className="mx-auto aspect-[1200/630] max-w-5xl overflow-hidden rounded-[2rem] bg-cobalt-800 shadow-2xl shadow-slate-900/25">
          <Cover src={article.cover} alt={article.title} eager />
        </div>
      </div>

      {/* Isi + daftar isi */}
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_260px]">
          <div id="isi-artikel" className="mx-auto w-full min-w-0 max-w-[720px]">
            {headings.length >= 3 && (
              <details className="mb-8 rounded-2xl bg-mist p-5 lg:hidden">
                <summary className="cursor-pointer font-extrabold text-ink">Daftar isi</summary>
                <ol className="mt-3 space-y-2 text-sm">
                  {headings.map((h) => (
                    <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                      <a href={`#${h.id}`} className="text-slate-600 hover:text-ink">{h.text}</a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <ArticleBody blocks={blocks} products={article.products} />
            <ArticleEnhancer targetId="isi-artikel" />

            {/* Label */}
            {article.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-6">
                <span className="mr-1 text-sm font-bold text-slate-600">Label</span>
                {article.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/inspirasi?label=${encodeURIComponent(t)}#artikel`}
                    className="rounded-full bg-mist px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-slate-200 transition hover:bg-surface hover:ring-ink"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

            <div className={`flex flex-wrap items-center justify-between gap-4 ${article.tags.length ? 'mt-5' : 'mt-12 border-t border-slate-200 pt-6'}`}>
              <ShareButtons url={url} title={article.title} />
              {article.updated_at && (
                <p className="text-xs text-slate-500">Diperbarui {articleDate(article.updated_at)}</p>
              )}
            </div>

            {/* Penulis */}
            <div className="mt-10 flex items-center gap-4 rounded-3xl bg-cobalt-900 p-6 text-white">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sun-400 text-xl font-extrabold text-cobalt-900">
                {article.author_name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sun-400">Ditulis oleh</p>
                <p className="mt-0.5 text-lg font-extrabold">{article.author_name}</p>
                <p className="text-sm text-white/70">Tim Urbanix Store, toko gear kreator dari Jakarta.</p>
              </div>
            </div>

            <div className="mt-14">
              <CommentSection slug={article.slug} comments={article.comments} open={article.allow_comments} />
            </div>
          </div>

          {headings.length >= 3 && (
            <aside className="hidden lg:block">
              <nav aria-label="Daftar isi" className="sticky top-28 rounded-2xl bg-surface p-5 ring-1 ring-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar isi</p>
                <ol className="mt-3 space-y-1 text-sm">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block rounded-lg px-2 py-1.5 leading-snug text-slate-600 hover:bg-mist hover:text-ink ${h.level === 3 ? 'pl-5 text-[13px]' : 'font-semibold'}`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
                <a href="#komentar" className="mt-4 block rounded-xl bg-mist px-3 py-2 text-center text-sm font-bold text-ink hover:ring-1 hover:ring-ink">
                  Ke komentar ↓
                </a>
              </nav>
            </aside>
          )}
        </div>
      </div>

      {/* Produk terkait */}
      {article.related_products.length > 0 && (
        <section className="bg-mist px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Produk yang dibahas</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {article.related_products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Artikel lain */}
      {article.more.length > 0 && (
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink">Baca juga</h2>
              <Link href="/inspirasi" className="text-sm font-bold text-ink hover:underline">Semua artikel →</Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {article.more.map((m) => (
                <ArticleCard key={m.id} article={m} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
