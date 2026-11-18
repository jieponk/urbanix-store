import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import ProductCard from '@/components/ProductCard';
import ArticleBody from '@/components/inspirasi/ArticleBody';
import ArticleCard, { CategoryBadge, Cover, articleDate } from '@/components/inspirasi/ArticleCard';
import TableOfContents from '@/components/inspirasi/TableOfContents';
import GearBackdrop from '@/components/inspirasi/GearBackdrop';
import { ArrowRight, Calendar, Chat, ChevronRight, Clock, Home, ListIcon, Tag } from '@/components/inspirasi/InspoIcons';
import CommentSection from '@/components/inspirasi/CommentSection';
import ArticleEnhancer from '@/components/inspirasi/ArticleEnhancer';
import ReadingProgress from '@/components/inspirasi/ReadingProgress';
import ShareButtons from '@/components/inspirasi/ShareButtons';
import { getArticle } from '@/lib/api';
import { renderMarkdown } from '@/lib/markdown';
import { SITE_URL, breadcrumbJsonLd, jsonLd as jsonLdHtml } from '@/lib/seo';
import { getT } from '@/lib/lang-server';

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
      url: `/inspirasi/${a.slug}`,
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
  const t = getT();
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
    <article className="ed">
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

      {/* Kepala artikel (gaya editorial: putih, judul besar, garis tipis) */}
      <header className="px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="relative isolate mx-auto max-w-6xl">
          <GearBackdrop className="bottom-[86px] opacity-70" />
          <nav aria-label={t('Breadcrumb')} className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link href="/" className="inline-flex items-center hover:text-ink" aria-label={t('Beranda')}>
              <Home size={14} />
            </Link>
            <ChevronRight size={12} className="opacity-60" />
            <Link href="/inspirasi" className="hover:text-ink">{t('Inspirasi')}</Link>
            {article.category && (
              <>
                <ChevronRight size={12} className="opacity-60" />
                <Link href={`/inspirasi?kategori=${article.category.slug}#artikel`} className="hover:text-ink">
                  {article.category.name}
                </Link>
              </>
            )}
          </nav>

          <div className="mt-8 max-w-4xl">
            {article.category && (
              <Link href={`/inspirasi?kategori=${article.category.slug}#artikel`} className="inline-flex border-t-[3px] border-ed pt-2">
                <CategoryBadge category={article.category} />
              </Link>
            )}
            <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.1] tracking-[-0.025em] text-ink sm:text-5xl lg:text-[3.4rem]">{article.title}</h1>
            {article.excerpt && <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">{article.excerpt}</p>}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-slate-200 py-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-extrabold text-surface">
                {article.author_name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-bold text-ink">{article.author_name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                  <time dateTime={article.published_at || undefined} className="inline-flex items-center gap-1.5">
                    <Calendar size={13} /> {articleDate(article.published_at)}
                  </time>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} /> {t('{n} menit baca', { n: article.reading_minutes })}
                  </span>
                  {article.comments.length > 0 && (
                    <a href="#komentar" className="inline-flex items-center gap-1.5 hover:text-ed">
                      <Chat size={13} /> {t('{n} komentar', { n: article.comments.length })}
                    </a>
                  )}
                </p>
              </div>
            </div>
            <ShareButtons url={url} title={article.title} />
          </div>
        </div>
      </header>

      {/* Sampul */}
      <figure className="mt-8 px-4 sm:px-6 lg:px-8">
        <div className="inspo-reveal mx-auto aspect-[1200/630] max-w-6xl overflow-hidden rounded-md bg-mist">
          <Cover src={article.cover} alt={article.title} eager sizes="(min-width: 1152px) 1152px, 100vw" />
        </div>
      </figure>

      {/* Isi + daftar isi */}
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_260px]">
          <div id="isi-artikel" className="mx-auto w-full min-w-0 max-w-[720px]">
            {headings.length >= 3 && (
              <details className="group mb-10 border-y-[3px] border-ink lg:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 py-3.5 text-sm font-extrabold uppercase tracking-[0.12em] text-ink [&::-webkit-details-marker]:hidden">
                  <ListIcon size={16} /> {t('Daftar isi')}
                  <span className="ml-auto text-xs font-semibold normal-case tracking-normal text-slate-500">{headings.filter((h) => h.level === 2).length} bagian</span>
                  <ChevronRight size={16} className="rotate-90 transition-transform duration-300 group-open:-rotate-90" />
                </summary>
                <ol className="border-t border-slate-200 pb-2">
                  {headings
                    .filter((h) => h.level === 2)
                    .map((h) => (
                      <li key={h.id} className="border-b border-slate-200 last:border-0">
                        <a href={`#${h.id}`} className="flex gap-3 py-3 text-[15px] font-semibold leading-snug text-slate-700 active:text-ed">
                          <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-ed" />
                          {h.text}
                        </a>
                      </li>
                    ))}
                </ol>
              </details>
            )}

            <ArticleBody blocks={blocks} products={article.products} t={t} />
            <ArticleEnhancer targetId="isi-artikel" />

            {/* Label */}
            {article.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-6">
                <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-600"><Tag size={15} /> {t('Label')}</span>
                {article.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/inspirasi?label=${encodeURIComponent(t)}#artikel`}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-ed hover:text-ed"
                  >
                    <span className="text-ed">#</span>{t}
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
            <div className="mt-10 flex items-center gap-4 border-y-[3px] border-ink py-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-xl font-extrabold text-surface">
                {article.author_name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="ed-kicker">{t('Ditulis oleh')}</p>
                <p className="mt-0.5 text-lg font-extrabold">{article.author_name}</p>
                <p className="text-sm text-slate-500">{t('Tim Urbanix Store, toko gear kreator dari Jakarta.')}</p>
              </div>
            </div>

            <div className="mt-14">
              <CommentSection slug={article.slug} comments={article.comments} open={article.allow_comments} />
            </div>
          </div>

          {headings.length >= 3 && (
            <aside className="hidden lg:block">
              <div className="sticky top-28 flex max-h-[calc(100vh-8.5rem)] flex-col">
              <TableOfContents headings={headings} />
              <a href="#komentar" className="group mt-3 flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-200 bg-surface px-3 py-2.5 text-sm font-bold text-ink transition hover:border-ed hover:text-ed">
                <Chat size={15} /> {t('Ke komentar')}
              </a>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Produk terkait */}
      {article.related_products.length > 0 && (
        <section className="px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="border-t-[3px] border-ink pt-5"><p className="ed-kicker">{t('Ada di Urbanix')}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Produk yang dibahas')}</h2></div>
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
            <div className="flex items-end justify-between gap-4 border-t-[3px] border-ink pt-5">
              <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Baca juga')}</h2>
              <Link href="/inspirasi" className="group inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:text-ed">{t('Semua artikel')} <ArrowRight size={16} /></Link>
            </div>
            <div className="mt-7 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
