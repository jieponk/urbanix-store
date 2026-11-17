import Link from 'next/link';
import { dateLocale } from '@/lib/i18n';
import { getLang } from '@/lib/lang-server';
import type { ArticleCard as Card } from '@/lib/api';
import { DEFAULT_COVER } from '@/lib/markdown';
import { ArrowRight, Calendar, CategoryIcon, Chat, Pin } from '@/components/inspirasi/InspoIcons';
import { getT } from '@/lib/lang-server';

export function articleDate(iso: string | null, short = false) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(dateLocale(getLang()), {
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

/** Label kategori gaya koran: teks merah huruf kapital + ikon kecil. */
export function CategoryBadge({ category, className = '' }: { category: Card['category']; solid?: boolean; className?: string }) {
  if (!category) return null;
  return (
    <span className={`ed-kicker inline-flex items-center gap-1.5 ${className}`}>
      <CategoryIcon slug={category.slug} size={13} />
      {category.name}
    </span>
  );
}

export function PinnedBadge() {
  const t = getT();
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
      <Pin size={12} /> {t('Disematkan')}
    </span>
  );
}

/** Baris info kartu: penulis · tanggal · jumlah komentar. */
export function ArticleMeta({ article, className = '' }: { article: Card; className?: string }) {
  const t = getT();
  const comments = article.comment_count || 0;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 ${className}`}>
      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-extrabold text-surface">
          {article.author_name.slice(0, 1).toUpperCase()}
        </span>
        {article.author_name}
      </span>
      {article.published_at && (
        <time dateTime={article.published_at} className="inline-flex items-center gap-1.5">
          <Calendar size={13} /> {articleDate(article.published_at, true)}
        </time>
      )}
      <span className="inline-flex items-center gap-1.5" title={t('{n} komentar', { n: comments })}>
        <Chat size={13} /> {t('{n} komentar', { n: comments })}
      </span>
    </div>
  );
}

/** Kartu artikel (grid): foto, label merah, judul tebal, ringkasan, info. Datar, tanpa bayangan. */
export default function ArticleCard({ article, index = 0 }: { article: Card; index?: number }) {
  return (
    <article className="inspo-reveal group relative flex h-full flex-col" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <div className="relative aspect-[1200/630] overflow-hidden rounded-md bg-mist">
        <Cover src={article.cover} alt="" className="transition duration-700 ease-out group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-center gap-3">
          <CategoryBadge category={article.category} />
          {article.is_pinned && <PinnedBadge />}
        </div>
        <h3 className="mt-2 line-clamp-3 text-[1.15rem] font-extrabold leading-snug tracking-tight text-ink sm:text-xl">
          <Link href={`/inspirasi/${article.slug}`} className="ed-title-link after:absolute after:inset-0 focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ed">
            {article.title}
          </Link>
        </h3>
        <ArticleMeta article={article} className="mt-auto pt-4" />
      </div>
    </article>
  );
}

/** Artikel utama: foto besar di kiri, teks di kanan (HP: foto di atas). Teks tidak ditumpuk di atas gambar. */
export function FeaturedArticle({ article }: { article: Card }) {
  const t = getT();
  return (
    <article className="inspo-reveal group relative grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
      <div className="relative aspect-[1200/630] overflow-hidden rounded-md bg-mist">
        <Cover src={article.cover} alt="" eager sizes="(min-width: 1024px) 60vw, 100vw" className="transition duration-700 ease-out group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-3">
          <CategoryBadge category={article.category} />
          {article.is_pinned && <PinnedBadge />}
        </div>
        <h2 className="mt-3 text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-ink sm:text-4xl">
          <Link href={`/inspirasi/${article.slug}`} className="ed-title-link after:absolute after:inset-0 focus:outline-none">
            {article.title}
          </Link>
        </h2>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <ArticleMeta article={article} className="text-sm" />
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ed">
            {t('Baca artikel')} <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Kartu ringkas horizontal (kolom samping). */
export function CompactArticle({ article, index = 0 }: { article: Card; index?: number }) {
  return (
    <article className="inspo-reveal group relative flex gap-4 py-4" style={{ animationDelay: `${120 + index * 80}ms` }}>
      <div className="min-w-0 flex-1">
        <CategoryBadge category={article.category} />
        <h3 className="mt-1.5 line-clamp-3 text-base font-extrabold leading-snug text-ink">
          <Link href={`/inspirasi/${article.slug}`} className="ed-title-link after:absolute after:inset-0 focus:outline-none">
            {article.title}
          </Link>
        </h3>
        <ArticleMeta article={article} className="mt-2" />
      </div>
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-md bg-mist sm:w-28">
        <Cover src={article.cover} alt="" sizes="112px" className="transition duration-500 group-hover:scale-[1.05]" />
      </div>
    </article>
  );
}
