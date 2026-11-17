import Link from 'next/link';
import { dateLocale } from '@/lib/i18n';
import { getLang } from '@/lib/lang-server';
import NewsImage from '@/components/NewsImage';
import type { NewsArticle } from '@/lib/api';
import { AiSpark, ArrowRight, Clock, Globe, Sparkle } from '@/components/inspirasi/InspoIcons';
import { getT } from '@/lib/lang-server';

/** "3 jam lalu", "Kemarin", "8 Nov 2026". */
export function newsDate(iso: string, now = Date.now()) {
  const date = new Date(iso);
  const hours = Math.floor((now - date.getTime()) / 3_600_000);
  const t = getT();
  if (hours < 1) return t('Baru saja');
  if (hours < 24) return t('{n} jam lalu', { n: hours });
  if (hours < 48) return t('Kemarin');
  return date.toLocaleDateString(dateLocale(getLang()), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function SourceLine({ article, light = false }: { article: NewsArticle; light?: boolean }) {
  const t = getT();
  return (
    <div className={`flex items-center gap-3 text-xs font-semibold ${light ? 'text-white/75' : 'text-slate-500'}`}>
      <span className={`inline-flex min-w-0 items-center gap-1.5 font-bold ${light ? 'text-white' : 'text-ink'}`}>
        <Globe size={13} />
        <span className="truncate">{article.source}</span>
      </span>
      <time dateTime={article.published_at} className="inline-flex shrink-0 items-center gap-1.5">
        <Clock size={13} /> {newsDate(article.published_at)}
      </time>
      {!article.is_translated && (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${light ? 'bg-white/15 text-white' : 'bg-mist text-slate-600'}`}
          title={t('Belum diterjemahkan')}
        >
          EN
        </span>
      )}
    </div>
  );
}

/** Kartu berita: gambar sampul, sumber, judul, cuplikan. Dibuka di /berita/[id] (tetap di web Urbanix). */
export default function NewsCard({
  article,
  compact = false,
  index = 0,
}: {
  article: NewsArticle;
  compact?: boolean;
  index?: number;
}) {
  const t = getT();
  return (
    <article
      className="inspo-reveal group relative flex h-full flex-col"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-mist">
        <NewsImage src={article.image_url} alt="" className="h-full w-full transition duration-700 ease-out group-hover:scale-[1.03]" />
        {article.is_pinned && (
          <span className="absolute left-0 top-0 inline-flex items-center gap-1 bg-ed px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
            <Sparkle size={11} /> {t('Pilihan')}
          </span>
        )}
        {article.has_ai && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-[11px] font-bold text-white">
            <AiSpark size={12} /> {t('Ada ringkasan')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <SourceLine article={article} />
        <h3 className={`mt-2 line-clamp-3 font-extrabold leading-snug text-ink ${compact ? 'text-[15px]' : 'text-base sm:text-[1.1rem]'}`}>
          <Link href={`/berita/${article.id}`} className="ed-title-link after:absolute after:inset-0 focus:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.summary && !compact && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{article.summary}</p>}
        {!compact && (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-[13px] font-bold text-ed">
            {t('Baca ringkasan')} <ArrowRight size={15} />
          </span>
        )}
      </div>
    </article>
  );
}

/** Berita utama (besar, teks di atas gambar). */
export function NewsHero({ article }: { article: NewsArticle }) {
  return (
    <article className="inspo-reveal group relative isolate flex min-h-[320px] flex-col justify-end overflow-hidden rounded-md bg-slate-900 sm:min-h-[400px] lg:h-full">
      <div className="absolute inset-0 -z-10">
        <NewsImage src={article.image_url} alt="" className="h-full w-full transition duration-[1200ms] ease-out group-hover:scale-[1.04]" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/50 to-black/0" />
      <div className="p-5 sm:p-7">
        <SourceLine article={article} light />
        <h3 className="mt-3 line-clamp-3 text-xl font-extrabold leading-snug text-white sm:text-2xl">
          <Link href={`/berita/${article.id}`} className="ed-title-link after:absolute after:inset-0 focus:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.summary && <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/75">{article.summary}</p>}
      </div>
    </article>
  );
}

/** Baris berita ringkas (judul + sumber) dengan thumbnail kecil. */
export function NewsRow({ article, index = 0 }: { article: NewsArticle; index?: number }) {
  return (
    <article
      className="inspo-reveal group relative flex items-center gap-4 border-b border-slate-200 py-3.5 last:border-0"
      style={{ animationDelay: `${100 + index * 70}ms` }}
    >
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-md bg-mist sm:w-24">
        <NewsImage src={article.image_url} alt="" className="h-full w-full transition duration-500 group-hover:scale-[1.08]" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-snug text-ink">
          <Link href={`/berita/${article.id}`} className="ed-title-link after:absolute after:inset-0 focus:outline-none">
            {article.title}
          </Link>
        </h3>
        <div className="mt-1.5">
          <SourceLine article={article} />
        </div>
      </div>
    </article>
  );
}
