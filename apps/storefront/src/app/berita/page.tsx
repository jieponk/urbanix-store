import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import { ChevronLeftIcon, ChevronRightIcon, NewsIcon } from '@/components/Icons';
import { getNews } from '@/lib/api';

export const metadata = {
  title: 'Berita Kamera & Fotografi',
  description: 'Kabar terbaru seputar kamera, lensa, dan dunia fotografi, dirangkum dalam Bahasa Indonesia.',
};

const PER_PAGE = 12;

type SearchParams = { sumber?: string; hal?: string };

function pageHref(source: string, page: number) {
  const query = new URLSearchParams();
  if (source) query.set('sumber', source);
  if (page > 1) query.set('hal', String(page));
  const text = query.toString();
  return text ? `/berita?${text}` : '/berita';
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const params = await searchParams;
  const source = /^\d+$/.test(params?.sumber ?? '') ? (params?.sumber as string) : '';
  const page = Math.max(1, parseInt(params?.hal || '1', 10) || 1);
  const data = await getNews({ page, limit: PER_PAGE, source });

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
      active ? 'bg-ink text-surface' : 'bg-surface text-ink ring-1 ring-slate-200 hover:bg-mist'
    }`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <header className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cobalt-800 text-white">
          <NewsIcon size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Berita Kamera &amp; Fotografi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kabar terbaru seputar kamera, lensa, dan dunia fotografi dari berbagai media, dirangkum dalam Bahasa Indonesia.
          </p>
        </div>
      </header>

      {data && data.sources.length > 1 && (
        <nav aria-label="Filter sumber berita" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href="/berita" className={chip(!source)} aria-current={!source ? 'page' : undefined}>
            Semua
          </Link>
          {data.sources.map((s) => (
            <Link
              key={s.id}
              href={pageHref(String(s.id), 1)}
              className={chip(source === String(s.id))}
              aria-current={source === String(s.id) ? 'page' : undefined}
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      {!data ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-700">Berita gagal dimuat</p>
          <p className="mt-2 text-sm text-slate-600">Pastikan backend Django berjalan, lalu muat ulang halaman ini.</p>
        </div>
      ) : data.results.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 px-5 py-14 text-center">
          <p className="font-bold text-ink">Berita sedang disiapkan</p>
          <p className="mt-2 text-sm text-slate-500">Berita terbaru sedang diambil. Coba muat ulang halaman ini 1–2 menit lagi.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.results.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>

          {data.pages > 1 && (
            <nav aria-label="Halaman berita" className="mt-8 flex items-center justify-center gap-3">
              {page > 1 && (
                <Link href={pageHref(source, page - 1)} className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 hover:bg-mist">
                  <ChevronLeftIcon size={16} /> Sebelumnya
                </Link>
              )}
              <span className="text-sm font-semibold text-slate-500">
                Halaman {data.page} dari {data.pages}
              </span>
              {page < data.pages && (
                <Link href={pageHref(source, page + 1)} className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 hover:bg-mist">
                  Berikutnya <ChevronRightIcon size={16} />
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      <p className="mt-10 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
        Judul dan ringkasan diterjemahkan otomatis dari media aslinya; sumber selalu dicantumkan di tiap berita.
        Artikel lengkap, foto, dan hak ciptanya milik masing-masing media.
      </p>
    </div>
  );
}
