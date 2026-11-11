import Link from 'next/link';
import NewsImage from '@/components/NewsImage';
import type { NewsArticle } from '@/lib/api';

/** "3 jam lalu", "Kemarin", "8 Nov 2026". */
export function newsDate(iso: string, now = Date.now()) {
  const date = new Date(iso);
  const hours = Math.floor((now - date.getTime()) / 3_600_000);
  if (hours < 1) return 'Baru saja';
  if (hours < 24) return `${hours} jam lalu`;
  if (hours < 48) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

/** Kartu berita: gambar sampul, sumber, judul, cuplikan. Dibuka di /berita/[id] (tetap di web Urbanix). */
export default function NewsCard({ article, compact = false }: { article: NewsArticle; compact?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300">
      <div className="relative aspect-[16/9] overflow-hidden">
        <NewsImage
          src={article.image_url}
          alt=""
          className="h-full w-full transition duration-300 group-hover:scale-[1.03]"
        />
        {article.is_pinned && (
          <span className="absolute left-3 top-3 rounded-full bg-sun-400 px-2.5 py-0.5 text-[11px] font-bold text-cobalt-900">Pilihan</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="truncate font-bold text-ink">{article.source}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.published_at} className="shrink-0">{newsDate(article.published_at)}</time>
          {!article.is_translated && (
            <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-[11px] font-bold text-slate-600" title="Belum diterjemahkan">
              EN
            </span>
          )}
        </div>
        <h3 className={`mt-2 line-clamp-3 font-extrabold leading-snug text-ink ${compact ? 'text-[15px]' : 'text-base sm:text-lg'}`}>
          <Link href={`/berita/${article.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.summary && !compact && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{article.summary}</p>
        )}
      </div>
    </article>
  );
}
