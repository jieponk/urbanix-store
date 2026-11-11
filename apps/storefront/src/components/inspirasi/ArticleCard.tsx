import Link from 'next/link';
import type { ArticleCard as Card } from '@/lib/api';
import { DEFAULT_COVER } from '@/lib/markdown';

export function articleDate(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

export function Cover({ src, alt = '', className = '', eager = false }: { src?: string; alt?: string; className?: string; eager?: boolean }) {
  return (
    <img
      src={src || DEFAULT_COVER}
      alt={alt}
      width={1200}
      height={630}
      loading={eager ? 'eager' : 'lazy'}
      {...(eager ? { fetchpriority: 'high' } : {})}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/** Kartu artikel Urbanix (grid). */
export default function ArticleCard({ article }: { article: Card }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-slate-200 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 hover:ring-slate-300">
      <div className="relative aspect-[16/9] overflow-hidden bg-cobalt-900">
        <Cover src={article.cover} className="transition duration-500 group-hover:scale-[1.04]" />
        {article.category && (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-cobalt-900 shadow-sm backdrop-blur">
            {article.category.name}
          </span>
        )}
        {article.is_pinned && (
          <span className="absolute right-4 top-4 rounded-full bg-sun-400 px-2.5 py-1 text-[11px] font-extrabold text-cobalt-900">
            📌 Disematkan
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-ink sm:text-xl">
          <Link href={`/inspirasi/${article.slug}`} className="after:absolute after:inset-0 after:rounded-3xl focus:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && <p className="mt-2 line-clamp-3 text-[15px] leading-7 text-slate-600">{article.excerpt}</p>}
        <div className="mt-auto flex items-center gap-2 pt-5 text-xs font-semibold text-slate-500">
          <span>{articleDate(article.published_at)}</span>
          <span aria-hidden="true">·</span>
          <span>{article.reading_minutes} menit baca</span>
          {!!article.comment_count && (
            <span className="ml-auto inline-flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12z" />
              </svg>
              {article.comment_count}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/** Kartu besar untuk artikel yang disematkan / terbaru. */
export function FeaturedArticle({ article }: { article: Card }) {
  return (
    <article className="group relative grid overflow-hidden rounded-[2rem] bg-surface shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200 lg:grid-cols-[1.25fr_1fr]">
      <div className="relative aspect-[16/9] overflow-hidden bg-cobalt-900 lg:aspect-auto lg:min-h-[380px]">
        <Cover src={article.cover} eager className="absolute inset-0 transition duration-700 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          {article.is_pinned && (
            <span className="rounded-full bg-sun-400 px-3 py-1 text-xs font-extrabold text-cobalt-900">📌 Disematkan</span>
          )}
          {article.category && (
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-500">
              {article.category.name}
            </span>
          )}
        </div>
        <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl lg:text-[2.1rem]">
          <Link href={`/inspirasi/${article.slug}`} className="after:absolute after:inset-0 focus:outline-none">
            {article.title}
          </Link>
        </h2>
        {article.excerpt && <p className="mt-4 line-clamp-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{article.excerpt}</p>}
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cobalt-900 text-sm font-extrabold text-sun-400">
            {article.author_name.slice(0, 1).toUpperCase()}
          </span>
          <div className="text-sm">
            <p className="font-bold text-ink">{article.author_name}</p>
            <p className="text-slate-500">
              {articleDate(article.published_at)} · {article.reading_minutes} menit baca
            </p>
          </div>
          <span className="ml-auto hidden items-center gap-1 text-sm font-bold text-brand-600 transition group-hover:gap-2 sm:inline-flex dark:text-brand-500">
            Baca <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </article>
  );
}
