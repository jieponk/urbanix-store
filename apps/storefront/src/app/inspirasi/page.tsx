import Link from 'next/link';
import NewsCard, { NewsHero, NewsRow } from '@/components/NewsCard';
import Pagination from '@/components/Pagination';
import GearBackdrop from '@/components/inspirasi/GearBackdrop';
import ArticleCard, { CompactArticle, FeaturedArticle } from '@/components/inspirasi/ArticleCard';
import { ArrowRight, CategoryIcon, Newspaper, Sparkle, Tag, XIcon } from '@/components/inspirasi/InspoIcons';
import { getArticleCategories, getArticles, getNews } from '@/lib/api';
import { SITE_URL, breadcrumbJsonLd, jsonLd } from '@/lib/seo';
import { getT } from '@/lib/lang-server';

const PER_PAGE = 12;

type SearchParams = { kategori?: string; label?: string; hal?: string };

function clean(params: SearchParams) {
  const kategori = /^[a-z0-9-]{1,70}$/.test(params.kategori || '') ? (params.kategori as string) : '';
  const label = (params.label || '').trim().toLowerCase().slice(0, 40);
  const page = Math.max(1, parseInt(params.hal || '1', 10) || 1);
  return { kategori, label, page };
}

function href(p: { kategori?: string; label?: string; hal?: number }, anchor = true) {
  const q = new URLSearchParams();
  if (p.kategori) q.set('kategori', p.kategori);
  if (p.label) q.set('label', p.label);
  if (p.hal && p.hal > 1) q.set('hal', String(p.hal));
  const s = q.toString();
  return `/inspirasi${s ? `?${s}` : ''}${anchor && (s || p.hal) ? '#artikel' : ''}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const { kategori, label, page } = clean((await searchParams) || {});
  const cat = kategori ? (await getArticleCategories()).find((c) => c.slug === kategori) : undefined;
  const base = cat ? `${cat.name}: Artikel Kamera & Fotografi` : 'Inspirasi: Tips, Panduan & Review Kamera';
  const title = page > 1 ? `${base} (Halaman ${page})` : base;
  const description = cat
    ? `Kumpulan artikel ${cat.name.toLowerCase()} seputar kamera, lensa, dan gear kreator dari Urbanix Store.`
    : 'Tips memotret, panduan memilih kamera dan lensa, review gear, serta berita kamera terbaru dari Urbanix Store.';
  return {
    title,
    description,
    // Halaman filter label isinya tumpang tindih → tidak diindeks, tapi tautannya tetap diikuti.
    robots: label ? { index: false, follow: true } : undefined,
    alternates: { canonical: href({ kategori, hal: page }, false) },
    openGraph: { title, description, url: href({ kategori, hal: page }, false), images: [{ url: '/inspirasi/default-cover.jpg', width: 1200, height: 630 }] },
  };
}

export default async function InspirationPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const t = getT();
  const { kategori, label, page } = clean((await searchParams) || {});
  const filtered = Boolean(kategori || label);

  const [categories, data, news] = await Promise.all([
    getArticleCategories(),
    getArticles({ page, limit: PER_PAGE, category: kategori, label }),
    getNews({ limit: 5 }),
  ]);

  const list = data?.results ?? [];
  // Halaman pertama tanpa filter: 1 sorotan besar + 2 di samping, sisanya grid.
  const magazine = !filtered && page === 1 && list.length >= 3;
  const featured = magazine ? list[0] : undefined;
  const side = magazine ? list.slice(1, 3) : [];
  const grid = magazine ? list.slice(3) : list;
  const activeCat = categories.find((c) => c.slug === kategori);
  const total = categories.reduce((n, c) => n + c.count, 0);

  const heading = activeCat ? activeCat.name : label ? `#${label}` : magazine ? t('Artikel terbaru') : t('Semua artikel');

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: activeCat ? `${activeCat.name} – Inspirasi Urbanix` : 'Inspirasi Urbanix',
    url: `${SITE_URL}${href({ kategori, hal: page }, false)}`,
    inLanguage: 'id-ID',
    isPartOf: { '@id': `${SITE_URL}/#situs` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: list.map((a, i) => ({
        '@type': 'ListItem',
        position: (page - 1) * PER_PAGE + i + 1,
        url: `${SITE_URL}/inspirasi/${a.slug}`,
        name: a.title,
      })),
    },
  };

  const tab = (active: boolean) =>
    `group relative inline-flex shrink-0 items-center gap-2 px-1 py-3.5 text-sm font-bold transition-colors ${
      active
        ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:bg-ed'
        : 'text-slate-500 hover:text-ink'
    }`;

  return (
    <div className="ed pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(collectionLd)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbJsonLd([
            { name: 'Inspirasi', path: '/inspirasi' },
            ...(activeCat ? [{ name: activeCat.name, path: `/inspirasi?kategori=${activeCat.slug}` }] : []),
          ])
        )}
      />

      <div className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* ---------- Kepala (gaya koran) ---------- */}
          <header className="relative isolate pt-6 sm:pt-10">
            <GearBackdrop className="bottom-[54px]" />
            <nav aria-label={t('Breadcrumb')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Link href="/" className="hover:text-ink">{t('Beranda')}</Link>
              <span aria-hidden="true">/</span>
              {activeCat ? (
                <>
                  <Link href="/inspirasi" className="hover:text-ink">{t('Inspirasi')}</Link>
                  <span aria-hidden="true">/</span>
                  <span className="text-ink">{activeCat.name}</span>
                </>
              ) : (
                <span className="text-ink">{t('Inspirasi')}</span>
              )}
            </nav>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b-[3px] border-ink pb-4">
              <div>
                <span aria-hidden="true" className="block h-1.5 w-14 bg-ed" />
                <h1 className="mt-4 text-[2.6rem] font-extrabold leading-none tracking-[-0.03em] text-ink sm:text-6xl">
                  {activeCat ? activeCat.name : t('Inspirasi')}
                </h1>
              </div>
              <p className="max-w-md text-[15px] leading-7 text-slate-600 sm:text-right">
                {t('Tips memotret, panduan beli, review jujur, dan kabar terbaru dunia kamera dari tim Urbanix.')}
              </p>
            </div>

            {/* Tab kategori */}
            {categories.length > 0 && (
              <nav aria-label={t('Kategori artikel')} className="inspo-scroll -mx-4 flex gap-6 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:gap-8 sm:px-0">
                <Link href={href({ label })} className={tab(!kategori)} aria-current={!kategori ? 'page' : undefined}>
                  <CategoryIcon slug="" size={15} />
                  {t('Semua')}
                  {total > 0 && <span className="text-xs font-semibold tabular-nums text-slate-400">{total}</span>}
                </Link>
                {categories.map((c) => (
                  <Link key={c.slug} href={href({ kategori: c.slug, label })} className={tab(kategori === c.slug)} aria-current={kategori === c.slug ? 'page' : undefined}>
                    <CategoryIcon slug={c.slug} size={15} />
                    {c.name}
                    {c.count > 0 && <span className="text-xs font-semibold tabular-nums text-slate-400">{c.count}</span>}
                  </Link>
                ))}
              </nav>
            )}
          </header>

          {/* ---------- Artikel utama (halaman 1) ---------- */}
          {featured && (
            <section aria-label={t('Artikel utama')} className="mt-8 grid gap-8 border-b border-slate-200 pb-10 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] lg:gap-10">
              <FeaturedArticle article={featured} />
              <div className="lg:border-l lg:border-slate-200 lg:pl-8">
                <h2 className="ed-kicker flex items-center gap-2">
                  <Sparkle size={13} /> {t('Pilihan editor')}
                </h2>
                <div className="mt-1 divide-y divide-slate-200">
                  {side.map((a, i) => (
                    <CompactArticle key={a.id} article={a} index={i} />
                  ))}
                </div>
                <Link href="/berita" className="group mt-2 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-bold text-ink hover:text-ed">
                  <span className="inline-flex items-center gap-2"><Newspaper size={16} /> {t('Berita kamera hari ini')}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </section>
          )}

          {/* ---------- Daftar artikel ---------- */}
          <section id="artikel" aria-labelledby="judul-artikel" className="mt-10 scroll-mt-32">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 id="judul-artikel" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                <span aria-hidden="true" className="h-5 w-1.5 bg-ed" />
                {heading}
              </h2>
              <div className="flex items-center gap-3">
                {label && (
                  <Link href={href({ kategori })} className="group inline-flex items-center gap-1.5 border border-slate-300 px-3 py-1.5 text-sm font-bold text-ink transition hover:border-ink">
                    <Tag size={14} /> {label}
                    <XIcon size={13} className="ml-0.5 text-slate-400 group-hover:text-ed" />
                    <span className="sr-only">{t('hapus filter label')}</span>
                  </Link>
                )}
                {data && data.count > 0 && <span className="text-sm text-slate-500">{data.count} artikel</span>}
              </div>
            </div>

            {grid.length > 0 ? (
              <div className="mt-7 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {grid.map((a, i) => (
                  <ArticleCard key={a.id} article={a} index={i} />
                ))}
              </div>
            ) : (
              !featured && (
                <div className="mt-7 flex flex-col items-center border-y border-slate-200 px-5 py-16 text-center">
                  <span className="text-slate-400"><CategoryIcon slug={kategori} size={30} /></span>
                  <p className="mt-4 font-extrabold text-ink">{t('Belum ada artikel di sini')}</p>
                  <p className="mt-1 text-sm text-slate-500">{t('Artikel baru segera hadir. Coba kategori lain dulu, ya.')}</p>
                  <Link href="/inspirasi" className="group mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-ed">
                    {t('Lihat semua artikel')} <ArrowRight size={16} />
                  </Link>
                </div>
              )
            )}

            {data && <Pagination page={data.page} pages={data.pages} href={(p) => href({ kategori, label, hal: p })} label={t('Halaman artikel')} />}
          </section>

          {/* ---------- Berita kamera ---------- */}
          {news && news.results.length > 0 && (
            <section className="mt-20 border-t-[3px] border-ink pt-6" aria-labelledby="berita-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="ed-kicker flex items-center gap-1.5"><Newspaper size={14} /> {t('Dari berbagai media')}</p>
                  <h2 id="berita-heading" className="mt-1 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{t('Berita Kamera')}</h2>
                </div>
                <Link href="/berita" className="group inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:text-ed">
                  {t('Semua berita')} <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                <NewsHero article={news.results[0]} />
                <div className="hidden flex-col lg:flex">
                  {news.results.slice(1, 5).map((n, i) => (
                    <NewsRow key={n.id} article={n} index={i} />
                  ))}
                </div>
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:hidden">
                  {news.results.slice(1, 5).map((n, i) => (
                    <NewsCard key={n.id} article={n} compact index={i} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
