import Link from 'next/link';
import { ArrowLeft, ArrowRight } from '@/components/inspirasi/InspoIcons';

/** Daftar nomor halaman dengan elipsis: 1 … 4 5 6 … 12 */
export function pageList(current: number, total: number, around = 1): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= around) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

/**
 * Navigasi halaman bernomor yang ramah SEO (link biasa, bisa di-crawl)
 * dan ramah jempol (tombol 44px). Di HP hanya tampil nomor di sekitar halaman aktif.
 */
export default function Pagination({
  page,
  pages,
  href,
  label = 'Halaman',
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
  label?: string;
}) {
  if (pages <= 1) return null;
  const nums = pageList(page, pages);
  const step =
    'group inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-bold ring-1 transition duration-200';
  const num =
    'inline-flex h-11 min-w-11 items-center justify-center rounded-md px-3 text-sm font-bold tabular-nums transition duration-200';

  return (
    <nav aria-label={label} className="mt-12 flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-center">
        {page > 1 ? (
          <Link href={href(page - 1)} rel="prev" className={`${step} bg-surface text-ink ring-slate-200 hover:-translate-x-0.5 hover:ring-ink`}>
            <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
            <span>Sebelumnya</span>
          </Link>
        ) : (
          <span className={`${step} cursor-not-allowed bg-mist text-slate-400 ring-transparent`} aria-hidden="true">
            <ArrowLeft size={16} /> <span>Sebelumnya</span>
          </span>
        )}

        <ol className="hidden items-center gap-1.5 sm:flex">
          {nums.map((n, i) =>
            n === '…' ? (
              <li key={`e${i}`} className="px-1 text-slate-400" aria-hidden="true">…</li>
            ) : (
              <li key={n}>
                {n === page ? (
                  <span aria-current="page" className={`${num} bg-ink text-surface `}>
                    {n}
                  </span>
                ) : (
                  <Link href={href(n)} aria-label={`${label} ${n}`} className={`${num} text-slate-600 hover:-translate-y-0.5 hover:bg-surface hover:text-ed hover:ring-1 hover:ring-slate-300`}>
                    {n}
                  </Link>
                )}
              </li>
            )
          )}
        </ol>

        {/* HP: penanda ringkas */}
        <span className="text-sm font-bold tabular-nums text-slate-500 sm:hidden">
          {page} <span className="font-normal">/</span> {pages}
        </span>

        {page < pages ? (
          <Link href={href(page + 1)} rel="next" className={`${step} bg-ink text-surface ring-ink hover:bg-ed hover:ring-ed hover:text-white`}>
            <span>Berikutnya</span>
            <ArrowRight size={16} />
          </Link>
        ) : (
          <span className={`${step} cursor-not-allowed bg-mist text-slate-400 ring-transparent`} aria-hidden="true">
            <span>Berikutnya</span> <ArrowRight size={16} />
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {label} {page} dari {pages}
      </p>
    </nav>
  );
}
