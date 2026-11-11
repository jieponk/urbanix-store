import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import ArticleCard, { FeaturedArticle } from '@/components/inspirasi/ArticleCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';
import { getArticleCategories, getArticles, getNews } from '@/lib/api';

export const metadata = {
  title: 'Inspirasi: Tips, Panduan & Berita Kamera',
  description:
    'Tips memotret, panduan memilih kamera dan lensa, review gear, serta berita kamera terbaru dari Urbanix Store.',
  alternates: { canonical: '/inspirasi' },
  openGraph: { images: [{ url: '/inspirasi/default-cover.jpg', width: 1200, height: 630 }] },
};

const PER_PAGE = 9;

type SearchParams = { kategori?: string; label?: string; hal?: string };

function href(p: { kategori?: string; label?: string; hal?: number }) {
  const q = new URLSearchParams();
  if (p.kategori) q.set('kategori', p.kategori);
  if (p.label) q.set('label', p.label);
  if (p.hal && p.hal > 1) q.set('hal', String(p.hal));
  const s = q.toString();
  return s ? `/inspirasi?${s}#artikel` : '/inspirasi#artikel';
}

export default async function InspirationPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const params = (await searchParams) || {};
  const kategori = /^[a-z0-9-]{1,70}$/.test(params.kategori || '') ? params.kategori : '';
  const label = (params.label || '').trim().toLowerCase().slice(0, 40);
  const page = Math.max(1, parseInt(params.hal || '1', 10) || 1);
  const filtered = Boolean(kategori || label);

  const [categories, data, news] = await Promise.all([
    getArticleCategories(),
    getArticles({ page, limit: PER_PAGE, category: kategori, label }),
    getNews({ limit: 6 }),
  ]);

  const list = data?.results ?? [];
  // Halaman pertama tanpa filter: artikel pertama (disematkan/terbaru) tampil besar.
  const featured = !filtered && page === 1 ? list[0] : undefined;
  const grid = featured ? list.slice(1) : list;
  const activeCat = categories.find((c) => c.slug === kategori);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
      active ? 'bg-ink text-surface shadow-lg shadow-slate-900/10' : 'bg-surface text-ink ring-1 ring-slate-200 hover:ring-ink'
    }`;

  return (
    <div>
      {/* Pembuka */}
      <section className="relative isolate overflow-hidden bg-cobalt-900 px-4 pb-28 pt-12 text-white sm:px-6 sm:pb-36 sm:pt-16 lg:px-8">
        {/* Senada dengan sampul default: navy Urbanix + aksen oranye + cincin lensa */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#ff5b14] opacity-25 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-1/2 -z-10 hidden h-[26rem] w-[26rem] -translate-y-1/2 rounded-full border border-white/10 lg:block">
          <div className="absolute inset-12 rounded-full border border-white/10" />
          <div className="absolute inset-24 rounded-full border border-white/10" />
          <div className="absolute inset-36 rounded-full bg-white/80" />
        </div>
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sun-400">Inspirasi Urbanix</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Belajar, memilih gear, dan terus berkarya.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
            Tips memotret, panduan beli, review, dan kabar terbaru dunia kamera, ditulis untuk para kreator.
          </p>
        </div>
      </section>

      <div className="relative -mt-16 px-4 sm:-mt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {featured && <FeaturedArticle article={featured} />}

          {/* Artikel Urbanix */}
          <section id="artikel" className={`scroll-mt-28 ${featured ? 'pt-14' : ''}`}>
            <div className={`flex flex-wrap items-end justify-between gap-4 ${featured ? '' : 'rounded-3xl bg-surface p-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 sm:p-6'}`}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-500">Ditulis tim Urbanix</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {activeCat ? activeCat.name : label ? `Label: ${label}` : 'Artikel Urbanix'}
                </h2>
              </div>
              {label && (
                <Link href={href({ kategori })} className="rounded-full bg-mist px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-slate-200 hover:ring-ink">
                  #{label} <span aria-hidden="true">×</span>
                  <span className="sr-only">hapus filter label</span>
                </Link>
              )}
            </div>

            {categories.length > 0 && (
              <nav aria-label="Kategori artikel" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <Link href={href({ label })} className={chip(!kategori)} aria-current={!kategori ? 'page' : undefined}>
                  Semua
                </Link>
                {categories.map((c) => (
                  <Link key={c.slug} href={href({ kategori: c.slug, label })} className={chip(kategori === c.slug)} aria-current={kategori === c.slug ? 'page' : undefined}>
                    {c.name}
                    {c.count > 0 && <span className="ml-1.5 text-xs opacity-60">{c.count}</span>}
                  </Link>
                ))}
              </nav>
            )}

            {grid.length > 0 ? (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {grid.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
              </div>
            ) : (
              !featured && (
                <div className="mt-6 rounded-3xl border border-dashed border-slate-300 px-5 py-14 text-center">
                  <p className="font-bold text-ink">Belum ada artikel di sini</p>
                  <p className="mt-2 text-sm text-slate-500">Artikel baru segera hadir. Coba kategori lain dulu, ya.</p>
                </div>
              )
            )}

            {data && data.pages > 1 && (
              <nav aria-label="Halaman artikel" className="mt-8 flex items-center justify-center gap-3">
                {page > 1 ? (
                  <Link href={href({ kategori, label, hal: page - 1 })} className="flex h-11 items-center gap-1 rounded-full bg-surface px-4 text-sm font-bold text-ink ring-1 ring-slate-200 hover:ring-ink">
                    <ChevronLeftIcon size={18} /> Sebelumnya
                  </Link>
                ) : null}
                <span className="text-sm text-slate-500">
                  Halaman {data.page} dari {data.pages}
                </span>
                {page < data.pages ? (
                  <Link href={href({ kategori, label, hal: page + 1 })} className="flex h-11 items-center gap-1 rounded-full bg-surface px-4 text-sm font-bold text-ink ring-1 ring-slate-200 hover:ring-ink">
                    Berikutnya <ChevronRightIcon size={18} />
                  </Link>
                ) : null}
              </nav>
            )}
          </section>

          {/* Berita kamera */}
          {news && news.results.length > 0 && (
            <section className="mt-20 border-t border-slate-200 pt-14 pb-16" aria-labelledby="berita-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Dari berbagai media</p>
                  <h2 id="berita-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                    Berita Kamera
                  </h2>
                </div>
                <Link href="/berita" className="inline-flex items-center gap-1 text-sm font-bold text-ink hover:underline">
                  Semua berita <ChevronRightIcon size={16} />
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {news.results.map((n) => (
                  <NewsCard key={n.id} article={n} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
