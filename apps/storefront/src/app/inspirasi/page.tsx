import Link from 'next/link';
import NewsCard, { NewsHero, NewsRow } from '@/components/NewsCard';
import Pagination from '@/components/Pagination';
import ArticleCard, { CompactArticle, FeaturedArticle } from '@/components/inspirasi/ArticleCard';
import { ArrowRight, CategoryIcon, Newspaper, Sparkle, Tag } from '@/components/inspirasi/InspoIcons';
import { getArticleCategories, getArticles, getNews } from '@/lib/api';
import { SITE_URL, breadcrumbJsonLd, jsonLd } from '@/lib/seo';

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
    openGraph: { title, description, images: [{ url: '/inspirasi/default-cover.jpg', width: 1200, height: 630 }] },
  };
}

export default async function InspirationPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
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

  const heading = activeCat ? activeCat.name : label ? `#${label}` : magazine ? 'Artikel terbaru' : 'Semua artikel';

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

  const chip = (active: boolean) =>
    `group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition duration-300 ${
      active
        ? 'bg-ink text-surface shadow-lg shadow-slate-900/15'
        : 'bg-surface text-ink ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-ink'
    }`;

  return (
    <div className="pb-20">
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

      {/* ---------- Pembuka ---------- */}
      <section className="relative isolate overflow-hidden bg-cobalt-900 px-4 pb-24 pt-10 text-white sm:px-6 sm:pb-32 sm:pt-14 lg:px-8">
        <div aria-hidden="true" className="inspo-glow pointer-events-none absolute -right-40 -top-48 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#ff5b14] opacity-30 blur-[120px]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#4FB3FF] opacity-15 blur-[110px]" />
        <div aria-hidden="true" className="inspo-rings pointer-events-none absolute -right-28 top-1/2 -z-10 hidden h-[26rem] w-[26rem] -translate-y-1/2 rounded-full border border-white/10 lg:block">
          <div className="absolute inset-12 rounded-full border border-white/10" />
          <div className="absolute inset-24 rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-[8.5rem] rounded-full bg-gradient-to-br from-white/90 to-white/40" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-semibold text-white/55">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span aria-hidden="true">/</span>
            {activeCat ? (
              <>
                <Link href="/inspirasi" className="hover:text-white">Inspirasi</Link>
                <span aria-hidden="true">/</span>
                <span className="text-white/85">{activeCat.name}</span>
              </>
            ) : (
              <span className="text-white/85">Inspirasi</span>
            )}
          </nav>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-sun-400 ring-1 ring-white/15 backdrop-blur">
            <Sparkle size={13} /> Inspirasi Urbanix
          </p>
          <h1 className="mt-4 max-w-3xl text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {activeCat ? activeCat.name : (
              <>
                Belajar, pilih gear, <span className="bg-gradient-to-r from-[#FF5B14] to-[#FFC93C] bg-clip-text text-transparent">terus berkarya.</span>
              </>
            )}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg sm:leading-8">
            Tips memotret, panduan beli, review jujur, dan kabar terbaru dunia kamera. Ditulis santai, buat para kreator.
          </p>
          {total > 0 && (
            <div className="mt-7 flex flex-wrap gap-2.5 text-sm">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 font-bold ring-1 ring-white/15 backdrop-blur">
                <span className="text-lg font-extrabold text-sun-400">{total}</span> artikel
              </span>
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-3.5 py-2 font-bold ring-1 ring-white/15 backdrop-blur">
                <span className="text-lg font-extrabold text-sun-400">{categories.filter((c) => c.count > 0).length}</span> kategori
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="relative -mt-14 px-4 sm:-mt-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* ---------- Kategori ---------- */}
          {categories.length > 0 && (
            <nav
              aria-label="Kategori artikel"
              className="inspo-reveal rounded-3xl bg-surface/95 p-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200 backdrop-blur"
            >
              <div className="inspo-scroll -mx-2 flex gap-2 overflow-x-auto px-2 py-0.5">
                <Link href={href({ label })} className={chip(!kategori)} aria-current={!kategori ? 'page' : undefined}>
                  <CategoryIcon slug="" size={16} />
                  Semua
                </Link>
                {categories.map((c) => (
                  <Link key={c.slug} href={href({ kategori: c.slug, label })} className={chip(kategori === c.slug)} aria-current={kategori === c.slug ? 'page' : undefined}>
                    <CategoryIcon slug={c.slug} size={16} />
                    {c.name}
                    {c.count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums ${kategori === c.slug ? 'bg-white/20' : 'bg-mist text-slate-500'}`}>
                        {c.count}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </nav>
          )}

          {/* ---------- Sorotan (halaman 1) ---------- */}
          {featured && (
            <section aria-labelledby="sorotan" className="mt-10">
              <h2 id="sorotan" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-500">
                <Sparkle size={14} /> Sorotan
              </h2>
              <div className="mt-4 grid gap-5 lg:grid-cols-[1.65fr_1fr]">
                <FeaturedArticle article={featured} />
                <div className="flex flex-col gap-4">
                  {side.map((a, i) => (
                    <CompactArticle key={a.id} article={a} index={i} />
                  ))}
                  {/* Jalan pintas kategori */}
                  <div className="inspo-reveal flex-1 rounded-2xl bg-gradient-to-br from-cobalt-900 to-cobalt-800 p-5 text-white" style={{ animationDelay: '320ms' }}>
                    <p className="text-sm font-extrabold">Lagi cari apa?</p>
                    <ul className="mt-3 grid grid-cols-2 gap-2">
                      {categories.filter((c) => c.count > 0).slice(0, 4).map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={href({ kategori: c.slug })}
                            className="group flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-[13px] font-bold ring-1 ring-white/10 transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:ring-sun-400/50"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun-400 text-cobalt-900">
                              <CategoryIcon slug={c.slug} size={15} />
                            </span>
                            <span className="truncate">{c.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------- Daftar artikel ---------- */}
          <section id="artikel" aria-labelledby="judul-artikel" className="mt-14 scroll-mt-32">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Ditulis tim Urbanix</p>
                <h2 id="judul-artikel" className="mt-1 flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                  {activeCat && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-surface">
                      <CategoryIcon slug={activeCat.slug} size={18} />
                    </span>
                  )}
                  {heading}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {label && (
                  <Link href={href({ kategori })} className="group inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:ring-ink">
                    <Tag size={14} /> {label}
                    <span aria-hidden="true" className="ml-0.5 text-slate-400 transition group-hover:rotate-90 group-hover:text-ink">✕</span>
                    <span className="sr-only">hapus filter label</span>
                  </Link>
                )}
                {data && data.count > 0 && <span className="text-sm font-semibold text-slate-500">{data.count} artikel</span>}
              </div>
            </div>

            {grid.length > 0 ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
                {grid.map((a, i) => (
                  <ArticleCard key={a.id} article={a} index={i} />
                ))}
              </div>
            ) : (
              !featured && (
                <div className="mt-7 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 px-5 py-16 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist text-slate-500">
                    <CategoryIcon slug={kategori} size={26} />
                  </span>
                  <p className="mt-4 font-extrabold text-ink">Belum ada artikel di sini</p>
                  <p className="mt-1 text-sm text-slate-500">Artikel baru segera hadir. Coba kategori lain dulu, ya.</p>
                  <Link href="/inspirasi" className="group mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-surface">
                    Lihat semua artikel <ArrowRight size={16} />
                  </Link>
                </div>
              )
            )}

            {data && <Pagination page={data.page} pages={data.pages} href={(p) => href({ kategori, label, hal: p })} label="Halaman artikel" />}
          </section>

          {/* ---------- Berita kamera ---------- */}
          {news && news.results.length > 0 && (
            <section className="mt-20 rounded-[2rem] bg-mist p-4 sm:p-8" aria-labelledby="berita-heading">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cobalt-900 text-white">
                    <Newspaper size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Dari berbagai media</p>
                    <h2 id="berita-heading" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Berita Kamera</h2>
                  </div>
                </div>
                <Link href="/berita" className="group inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:ring-ink">
                  Semua berita <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-6">
                <NewsHero article={news.results[0]} />
                <div className="hidden flex-col gap-1 lg:flex">
                  {news.results.slice(1, 5).map((n, i) => (
                    <NewsRow key={n.id} article={n} index={i} />
                  ))}
                </div>
                {/* HP & tablet: kartu biasa */}
                <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
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
