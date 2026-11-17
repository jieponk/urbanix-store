import Link from 'next/link';
import type { ArticleCard as Card } from '@/lib/api';
import { DEFAULT_COVER } from '@/lib/markdown';
import { ArrowRight, Calendar, CategoryIcon, Chat, Clock, Pin, categoryTone } from '@/components/inspirasi/InspoIcons';

export function articleDate(iso: string | null, short = false) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

/** Gambar sampul responsif: rasio dijaga wadahnya, gambar mengisi tanpa gepeng. */
export function Cover({
  src,
  alt = '',
  className = '',
  eager = false,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
}: {
  src?: string;
  alt?: string;
  className?: string;
  eager?: boolean;
  sizes?: string;
}) {
  return (
    <img
      src={src || DEFAULT_COVER}
      alt={alt}
      width={1200}
      height={630}
      sizes={sizes}
      decoding="async"
      loading={eager ? 'eager' : 'lazy'}
      {...(eager ? { fetchpriority: 'high' } : {})}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

/** Lencana kategori dengan ikon. `solid` = versi di atas gambar. */
export function CategoryBadge({ category, solid = false }: { category: Card['category']; solid?: boolean }) {
  if (!category) return null;
  const cls = solid
    ? 'bg-white/95 text-cobalt-900 ring-white/40 shadow-sm backdrop-blur'
    : categoryTone(category.slug);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${cls}`}>
      <CategoryIcon slug={category.slug} size={13} />
      {category.name}
    </span>
  );
}

export function PinnedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun-400 px-2.5 py-1 text-[11px] font-extrabold text-cobalt-900 shadow-sm">
      <Pin size={12} /> Disematkan
    </span>
  );
}

/** Baris info: tanggal · durasi baca · jumlah komentar. */
export function ArticleMeta({ article, className = '' }: { article: Card; className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs font-semibold text-slate-500 ${className}`}>
      {article.published_at && (
        <time dateTime={article.published_at} className="inline-flex items-center gap-1.5">
          <Calendar size={14} /> {articleDate(article.published_at, true)}
        </time>
      )}
      <span className="inline-flex items-center gap-1.5">
        <Clock size={14} /> {article.reading_minutes} menit
      </span>
      {!!article.comment_count && (
        <span className="inline-flex items-center gap-1.5" title={`${article.comment_count} komentar`}>
          <Chat size={14} /> {article.comment_count}
        </span>
      )}
    </div>
  );
}

/** Kartu artikel (grid). `index` untuk animasi muncul berurutan. */
export default function ArticleCard({ article, index = 0 }: { article: Card; index?: number }) {
  return (
    <article
      className="inspo-reveal group relative flex h-full flex-col overflow-hidden rounded-3xl bg-surface ring-1 ring-slate-200 transition duration-300 ease-out hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-slate-900/10 hover:ring-slate-300"
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      <div className="relative aspect-[1200/630] overflow-hidden bg-cobalt-900">
        <Cover src={article.cover} alt="" className="transition duration-700 ease-out group-hover:scale-[1.05]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 sm:left-4 sm:top-4">
          <CategoryBadge category={article.category} solid />
          {article.is_pinned && <PinnedBadge />}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <ArticleMeta article={article} />
        <h3 className="mt-3 line-clamp-2 text-lg font-extrabold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand-600 sm:text-[1.2rem] dark:group-hover:text-brand-500">
          <Link href={`/inspirasi/${article.slug}`} className="after:absolute after:inset-0 after:rounded-3xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-500">
            {article.title}
          </Link>
        </h3>
        {article.excerpt && <p className="mt-2 line-clamp-3 text-[15px] leading-7 text-slate-600">{article.excerpt}</p>}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-bold text-ink">
          Baca selengkapnya
          <ArrowRight size={16} className="text-brand-600 dark:text-brand-500" />
        </span>
      </div>
    </article>
  );
}

/** Kartu besar untuk artikel sorotan (disematkan / terbaru). */
export function FeaturedArticle({ article }: { article: Card }) {
  return (
    <article className="inspo-reveal group relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden rounded-[2rem] bg-cobalt-900 shadow-2xl shadow-slate-900/20 sm:min-h-[460px] lg:h-full">
      <div className="absolute inset-0 -z-10">
        <Cover
          src={article.cover}
          alt=""
          eager
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="transition duration-[1200ms] ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b1236] via-[#0b1236]/75 to-[#0b1236]/5" />
      <div className="p-6 text-white sm:p-9">
        <div className="flex flex-wrap items-center gap-2">
          {article.is_pinned && <PinnedBadge />}
          <CategoryBadge category={article.category} solid />
        </div>
        <h2 className="mt-4 max-w-2xl text-2xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl">
          <Link href={`/inspirasi/${article.slug}`} className="after:absolute after:inset-0 focus:outline-none focus-visible:after:ring-4 focus-visible:after:ring-sun-400">
            {article.title}
          </Link>
        </h2>
        {article.excerpt && (
          <p className="mt-3 line-clamp-2 max-w-2xl text-[15px] leading-7 text-white/80 sm:text-base sm:leading-7">{article.excerpt}</p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-400 text-sm font-extrabold text-cobalt-900">
              {article.author_name.slice(0, 1).toUpperCase()}
            </span>
            <div className="text-sm">
              <p className="font-bold">{article.author_name}</p>
              <ArticleMeta article={article} className="!text-white/70" />
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-cobalt-900 shadow-lg transition duration-300 group-hover:bg-sun-400">
            Baca artikel <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Kartu ringkas horizontal (daftar samping sorotan & "baca juga"). */
export function CompactArticle({ article, index = 0 }: { article: Card; index?: number }) {
  return (
    <article
      className="inspo-reveal group relative flex gap-4 rounded-2xl bg-surface p-3 ring-1 ring-slate-200 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10 hover:ring-slate-300"
      style={{ animationDelay: `${120 + index * 80}ms` }}
    >
      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-cobalt-900 sm:w-36">
        <Cover src={article.cover} alt="" sizes="144px" className="transition duration-500 group-hover:scale-[1.06]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        {article.category && (
          <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${categoryTone(article.category.slug)}`}>
            <CategoryIcon slug={article.category.slug} size={11} />
            {article.category.name}
          </span>
        )}
        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-extrabold leading-snug text-ink transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-500">
          <Link href={`/inspirasi/${article.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
            {article.title}
          </Link>
        </h3>
        <ArticleMeta article={article} className="mt-auto pt-2 !text-[11px]" />
      </div>
    </article>
  );
}
