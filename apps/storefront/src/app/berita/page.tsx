import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import Pagination from '@/components/Pagination';
import GearBackdrop from '@/components/inspirasi/GearBackdrop';
import { Globe, Newspaper } from '@/components/inspirasi/InspoIcons';
import { getNews } from '@/lib/api';

export const metadata = {
  title: 'Berita Kamera & Fotografi',
  description: 'Kabar terbaru seputar kamera, lensa, dan dunia fotografi, dirangkum dalam Bahasa Indonesia.',
  alternates: { canonical: '/berita' },
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

  const tab = (active: boolean) =>
    `relative inline-flex shrink-0 items-center gap-2 px-1 py-3.5 text-sm font-bold transition-colors ${
      active ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-ed' : 'text-slate-500 hover:text-ink'
    }`;

  return (
    <div className="ed px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="relative isolate pt-6 sm:pt-10">
          <GearBackdrop className="bottom-[54px]" />
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link href="/" className="hover:text-ink">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/inspirasi" className="hover:text-ink">Inspirasi</Link>
            <span aria-hidden="true">/</span>
            <span className="text-ink">Berita</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-[3px] border-ink pb-4">
            <div>
              <span aria-hidden="true" className="block h-1.5 w-14 bg-ed" />
              <h1 className="mt-4 text-[2.6rem] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-6xl">Berita Kamera</h1>
            </div>
            <p className="max-w-md text-[15px] leading-7 text-slate-600 sm:text-right">
              Kabar terbaru seputar kamera, lensa, dan dunia fotografi dari berbagai media, dirangkum dalam Bahasa Indonesia.
            </p>
          </div>

          {data && data.sources.length > 1 && (
            <nav aria-label="Filter sumber berita" className="inspo-scroll -mx-4 flex gap-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:gap-8 sm:px-0">
              <Link href="/berita" className={tab(!source)} aria-current={!source ? 'page' : undefined}>
                <Newspaper size={15} /> Semua
              </Link>
              {data.sources.map((s) => (
                <Link key={s.id} href={pageHref(String(s.id), 1)} className={tab(source === String(s.id))} aria-current={source === String(s.id) ? 'page' : undefined}>
                  <Globe size={14} /> {s.name}
                </Link>
              ))}
            </nav>
          )}
        </header>

        {!data ? (
          <div className="mt-8 border-l-[3px] border-ed bg-mist p-5">
            <p className="font-bold text-ink">Berita gagal dimuat</p>
            <p className="mt-1 text-sm text-slate-600">Coba muat ulang halaman ini sebentar lagi.</p>
          </div>
        ) : data.results.length === 0 ? (
          <div className="mt-8 flex flex-col items-center border-y border-slate-200 px-5 py-16 text-center">
            <span className="text-slate-400"><Newspaper size={30} /></span>
            <p className="mt-4 font-extrabold text-ink">Berita sedang disiapkan</p>
            <p className="mt-1 text-sm text-slate-500">Berita terbaru sedang diambil. Coba muat ulang 1–2 menit lagi.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {data.results.map((article, i) => (
                <NewsCard key={article.id} article={article} index={i} />
              ))}
            </div>
            <Pagination page={data.page} pages={data.pages} href={(p) => pageHref(source, p)} label="Halaman berita" />
          </>
        )}

        <p className="mt-12 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
          Judul dan ringkasan diterjemahkan otomatis dari media aslinya; sumber selalu dicantumkan di tiap berita.
          Artikel lengkap, foto, dan hak ciptanya milik masing-masing media.
        </p>
      </div>
    </div>
  );
}
