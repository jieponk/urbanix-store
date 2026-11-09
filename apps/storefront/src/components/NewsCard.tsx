import { ExternalIcon } from '@/components/Icons';
import type { NewsArticle } from '@/lib/api';

const COLORS = ['bg-cobalt-700', 'bg-sale-600', 'bg-emerald-600', 'bg-amber-600', 'bg-sky-700', 'bg-violet-700'];

/** "3 jam lalu", "kemarin", "8 Nov 2026". */
export function newsDate(iso: string, now = Date.now()) {
  const date = new Date(iso);
  const hours = Math.floor((now - date.getTime()) / 3_600_000);
  if (hours < 1) return 'Baru saja';
  if (hours < 24) return `${hours} jam lalu`;
  if (hours < 48) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function initials(name: string) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}

/** Kartu berita: judul + cuplikan; dibuka di situs sumber (tab baru). */
export default function NewsCard({ article, compact = false }: { article: NewsArticle; compact?: boolean }) {
  const color = COLORS[article.source_id % COLORS.length];
  return (
    <article className="group relative flex h-full flex-col rounded-2xl bg-surface p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300 sm:p-5">
      <div className="flex items-center gap-2.5 text-xs text-slate-500">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold text-white ${color}`}
          aria-hidden="true"
        >
          {initials(article.source)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-bold text-ink">{article.source}</span>
          <time dateTime={article.published_at}>{newsDate(article.published_at)}</time>
        </span>
        {article.is_pinned && (
          <span className="ml-auto rounded-full bg-sun-100 px-2 py-0.5 text-[11px] font-bold text-ink">Pilihan</span>
        )}
        {!article.is_translated && (
          <span className="ml-auto rounded-full bg-mist px-2 py-0.5 text-[11px] font-bold text-slate-600" title="Belum diterjemahkan">
            EN
          </span>
        )}
      </div>

      <h3 className={`mt-3 font-extrabold leading-snug text-ink ${compact ? 'line-clamp-3 text-[15px]' : 'line-clamp-3 text-base sm:text-lg'}`}>
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
          {article.title}
        </a>
      </h3>
      {article.summary && !compact && (
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.summary}</p>
      )}

      <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-bold text-slate-500 group-hover:text-ink">
        Baca di {article.source}
        <ExternalIcon size={13} />
      </span>
    </article>
  );
}
