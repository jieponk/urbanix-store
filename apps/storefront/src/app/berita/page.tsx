import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import Pagination from '@/components/Pagination';
import { Globe, Newspaper, Sparkle } from '@/components/inspirasi/InspoIcons';
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

  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition duration-300 ${
      active ? 'bg-ink text-surface shadow-lg shadow-slate-900/15' : 'bg-surface text-ink ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-ink'
    }`;

  return (
    <div className="pb-16">
      <section className="relative isolate overflow-hidden bg-cobalt-900 px-4 pb-20 pt-10 text-white sm:px-6 sm:pb-24 sm:pt-14 lg:px-8">
        <div aria-hidden="true" className="inspo-glow pointer-events-none absolute -right-40 -top-48 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#4FB3FF] opacity-25 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[22rem] w-[22rem] rounded-full bg-[#ff5b14] opacity-20 blur-[110px]" />
        <div className="relative mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-white/55">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span aria-hidden="true">/</span>
            <Link href="/inspirasi" className="hover:text-white">Inspirasi</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/85">Berita</span>
          </nav>
          <div className="mt-6 flex items-start gap-4">
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sun-400 ring-1 ring-white/15 sm:flex">
              <Newspaper size={28} />
            </span>
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sun-400">
                <Sparkle size={13} /> Update tiap hari
              </p>
              <h1 className="mt-2 text-[2rem] font-extrabold leading-tight tracking-tight sm:text-5xl">Berita Kamera &amp; Fotografi</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/75">
                Kabar terbaru seputar kamera, lensa, dan dunia fotografi dari berbagai media, dirangkum dalam Bahasa Indonesia.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative -mt-10 px-4 sm:-mt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {data && data.sources.length > 1 && (
            <nav aria-label="Filter sumber berita" className="inspo-reveal rounded-3xl bg-surface/95 p-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur">
              <div className="inspo-scroll -mx-2 flex gap-2 overflow-x-auto px-2 py-0.5">
                <Link href="/berita" className={chip(!source)} aria-current={!source ? 'page' : undefined}>
                  <Newspaper size={15} /> Semua
                </Link>
                {data.sources.map((s) => (
                  <Link
                    key={s.id}
                    href={pageHref(String(s.id), 1)}
                    className={chip(source === String(s.id))}
                    aria-current={source === String(s.id) ? 'page' : undefined}
                  >
                    <Globe size={14} /> {s.name}
                  </Link>
                ))}
              </div>
            </nav>
          )}

          {!data ? (
            <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6">
              <p className="font-bold text-red-700">Berita gagal dimuat</p>
              <p className="mt-2 text-sm text-slate-600">Coba muat ulang halaman ini sebentar lagi.</p>
            </div>
          ) : data.results.length === 0 ? (
            <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 px-5 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist text-slate-500"><Newspaper size={26} /></span>
              <p className="mt-4 font-extrabold text-ink">Berita sedang disiapkan</p>
              <p className="mt-1 text-sm text-slate-500">Berita terbaru sedang diambil. Coba muat ulang 1–2 menit lagi.</p>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
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
    </div>
  );
}
