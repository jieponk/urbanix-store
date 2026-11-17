import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import ProductCard from '@/components/ProductCard';
import ArticleBody from '@/components/inspirasi/ArticleBody';
import ArticleCard, { CategoryBadge, Cover, articleDate } from '@/components/inspirasi/ArticleCard';
import TableOfContents from '@/components/inspirasi/TableOfContents';
import { ArrowRight, Calendar, Chat, ChevronRight, Clock, Home, ListIcon, Tag } from '@/components/inspirasi/InspoIcons';
import CommentSection from '@/components/inspirasi/CommentSection';
import ArticleEnhancer from '@/components/inspirasi/ArticleEnhancer';
import ReadingProgress from '@/components/inspirasi/ReadingProgress';
import ShareButtons from '@/components/inspirasi/ShareButtons';
import { getArticle } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';
import { SITE_URL, breadcrumbJsonLd, jsonLd as jsonLdHtml } from '@/lib/seo';

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
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    image: [`${SITE_URL}${article.cover || '/inspirasi/default-cover.jpg'}`],
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: article.author_name },
    publisher: { '@id': `${SITE_URL}/#toko`, '@type': 'Organization', name: 'Urbanix Store', logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/urbanix-logo-dark.png` } },
    mainEntityOfPage: url,
    articleSection: article.category?.name,
    keywords: article.tags.join(', '),
    inLanguage: 'id-ID',
  };

  return (
    <article>
      <ReadingProgress targetId="isi-artikel" />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(articleLd)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(
          breadcrumbJsonLd([
            { name: 'Inspirasi', path: '/inspirasi' },
            ...(article.category ? [{ name: article.category.name, path: `/inspirasi?kategori=${article.category.slug}` }] : []),
            { name: article.title, path: `/inspirasi/${article.slug}` },
          ])
        )}
      />

      {/* Kepala artikel */}
      <header className="relative isolate overflow-hidden bg-cobalt-900 px-4 pb-36 pt-10 text-white sm:px-6 sm:pb-48 sm:pt-14 lg:px-8">
        {article.cover ? (
          <>
            {/* Ada sampul sendiri: latar diambil dari sampul (diburamkan) agar warnanya senada */}
            <img
              src={article.cover}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-70 blur-[70px] saturate-150"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </>
        ) : (
          /* Sampul default (navy + oranye): latar navy Urbanix dengan cahaya oranye, senada sampul */
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#ff5b14] opacity-25 blur-[120px]" />
        )}
        <div className="relative mx-auto max-w-3xl text-center">
          <nav aria-label="Breadcrumb" className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/65 ring-1 ring-white/15 backdrop-blur">
            <Link href="/" className="inline-flex items-center hover:text-white" aria-label="Beranda">
              <Home size={14} />
            </Link>
            <ChevronRight size={12} className="opacity-50" />
            <Link href="/inspirasi" className="hover:text-white">Inspirasi</Link>
            {article.category && (
              <>
                <ChevronRight size={12} className="opacity-50" />
                <Link href={`/inspirasi?kategori=${article.category.slug}#artikel`} className="hover:text-white">
                  {article.category.name}
                </Link>
              </>
            )}
          </nav>
          {article.category && (
            <div className="mt-6 flex justify-center">
              <CategoryBadge category={article.category} solid />
            </div>
          )}
          <h1 className="mt-4 text-[1.9rem] font-extrabold leading-[1.15] tracking-tight sm:text-5xl sm:leading-[1.1]">{article.title}</h1>
          {article.excerpt && <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/75">{article.excerpt}</p>}
          <div className="group mt-7 flex items-center justify-center gap-3 text-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sun-400 font-extrabold text-cobalt-900">
              {article.author_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="text-left">
              <p className="font-bold">{article.author_name}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-white/70">
                <time dateTime={article.published_at || undefined} className="inline-flex items-center gap-1.5">
                  <Calendar size={14} /> {articleDate(article.published_at)}
                </time>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} /> {article.reading_minutes} menit baca
                </span>
                {article.comments.length > 0 && (
                  <a href="#komentar" className="inline-flex items-center gap-1.5 hover:text-white">
                    <Chat size={14} /> {article.comments.length}
                  </a>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Sampul */}
      <div className="relative -mt-28 px-4 sm:-mt-36 sm:px-6 lg:px-8">
        <div className="inspo-reveal mx-auto aspect-[1200/630] max-w-5xl overflow-hidden rounded-2xl bg-cobalt-800 shadow-2xl shadow-slate-900/25 sm:rounded-[2rem]">
          <Cover src={article.cover} alt={article.title} eager sizes="(min-width: 1024px) 1024px, 100vw" />
        </div>
      </div>

      {/* Isi + daftar isi */}
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_260px]">
          <div id="isi-artikel" className="mx-auto w-full min-w-0 max-w-[720px]">
            {headings.length >= 3 && (
              <details className="group mb-8 overflow-hidden rounded-2xl bg-mist ring-1 ring-slate-200 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-extrabold text-ink [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-2"><ListIcon size={17} /> Daftar isi</span>
                  <span className="text-xs font-bold text-slate-500">{headings.length} bagian</span>
                  <ChevronRight size={16} className="rotate-90 transition-transform duration-300 group-open:-rotate-90" />
                </summary>
                <ol className="space-y-2 border-t border-slate-200 px-4 pb-4 pt-3 text-sm">
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
                <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-600"><Tag size={15} /> Label</span>
                {article.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/inspirasi?label=${encodeURIComponent(t)}#artikel`}
                    className="rounded-full bg-mist px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-slate-200 transition duration-300 hover:-translate-y-0.5 hover:bg-surface hover:ring-ink"
                  >
                    <span className="text-brand-600 dark:text-brand-500">#</span>{t}
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
              <TableOfContents headings={headings} />
              <a href="#komentar" className="group mt-3 flex items-center justify-center gap-2 rounded-2xl bg-mist px-3 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:ring-ink">
                <Chat size={15} /> Ke komentar
              </a>
            </aside>
          )}
        </div>
      </div>

      {/* Produk terkait */}
      {article.related_products.length > 0 && (
        <section className="bg-mist px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-500">Ada di Urbanix</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Produk yang dibahas</h2>
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
              <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Baca juga</h2>
              <Link href="/inspirasi" className="group inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:ring-ink">Semua artikel <ArrowRight size={16} /></Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {article.more.map((m, i) => (
                <ArticleCard key={m.id} article={m} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
