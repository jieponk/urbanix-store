import Link from 'next/link';
import NewsCard, { newsDate } from '@/components/NewsCard';
import NewsImage from '@/components/NewsImage';
import ProductCard from '@/components/ProductCard';
import {
  AiSpark,
  ArrowRight,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  External,
  Globe,
  Home,
  Newspaper,
  Quote,
} from '@/components/inspirasi/InspoIcons';
import { getNewsDetail } from '@/lib/api';

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> | Params }) {
  const { id } = await params;
  const article = await getNewsDetail(id);
  // Berita = rangkuman dari media lain: boleh dibaca pembeli, tapi tidak diindeks Google
  // supaya situs tidak dinilai berisi konten pihak lain/otomatis dalam jumlah besar.
  const robots = { index: false, follow: true };
  const description = article?.ai?.conclusion || article?.summary || (article ? `Berita dari ${article.source}` : '');
  return article
    ? { title: article.title, description, robots, alternates: { canonical: `/berita/${id}` } }
    : { title: 'Berita tidak ditemukan', robots };
}

/** Teks penuh (hanya sumber berizin): paragraf biasa, baris "## " jadi subjudul. */
function FullText({ text }: { text: string }) {
  return (
    <div className="article-prose mt-8">
      {text.split(/\n{2,}/).map((p, i) =>
        p.startsWith('## ') ? (
          <h3 key={i}>{p.slice(3)}</h3>
        ) : (
          <p key={i}>{p}</p>
        )
      )}
    </div>
  );
}

export default async function NewsDetailPage({ params }: { params: Promise<Params> | Params }) {
  const { id } = await params;
  const article = await getNewsDetail(id);

  if (!article) {
    return (
      <div className="px-4 py-20">
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl bg-surface p-8 text-center ring-1 ring-slate-200">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mist text-slate-500">
            <Newspaper size={26} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-ink">Berita tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">Berita ini mungkin sudah lama atau disembunyikan.</p>
          <Link href="/berita" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-surface">
            Lihat berita lain <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const date = new Date(article.published_at).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
  const ai = article.ai;
  const translatedTitle = article.is_translated && article.original_title !== article.title;

  return (
    <div className="pb-16">
      {/* ---------- Kepala ---------- */}
      <header className="relative isolate overflow-hidden bg-cobalt-900 px-4 pb-32 pt-8 text-white sm:px-6 sm:pb-40 sm:pt-12 lg:px-8">
        {article.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.image_url} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-50 blur-[70px] saturate-150" />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1236]/70 via-[#0b1236]/60 to-[#0b1236]/90" />
        <div className="relative mx-auto max-w-4xl">
          <nav aria-label="Breadcrumb" className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/65 ring-1 ring-white/15 backdrop-blur">
            <Link href="/" aria-label="Beranda" className="hover:text-white"><Home size={14} /></Link>
            <ChevronRight size={12} className="opacity-50" />
            <Link href="/inspirasi" className="hover:text-white">Inspirasi</Link>
            <ChevronRight size={12} className="opacity-50" />
            <Link href="/berita" className="hover:text-white">Berita</Link>
          </nav>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-cobalt-900">
              <Globe size={13} /> {article.source}
            </span>
            {ai && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1 text-xs font-extrabold text-cobalt-900">
                <AiSpark size={13} /> Ada ringkasan
              </span>
            )}
          </div>
          <h1 className="mt-4 text-[1.75rem] font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.75rem]">{article.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            <time dateTime={article.published_at} className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> {date}
            </time>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} /> {newsDate(article.published_at)}
            </span>
          </p>
        </div>
      </header>

      <div className="relative -mt-24 px-4 sm:-mt-28 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0">
            <figure className="inspo-reveal overflow-hidden rounded-2xl bg-cobalt-800 shadow-2xl shadow-slate-900/25 sm:rounded-3xl">
              <NewsImage src={article.image_url} alt={article.title} className="aspect-[16/9] w-full" />
            </figure>
            {article.image_url && <p className="mt-2 text-xs text-slate-500">Foto: {article.source}</p>}

            <div className="mx-auto max-w-[720px]">
              {/* Ringkasan pembuka */}
              {(ai?.conclusion || article.summary) && (
                <p className="mt-8 text-lg leading-8 text-ink sm:text-xl sm:leading-9">{ai?.conclusion || article.summary}</p>
              )}

              {/* Inti berita */}
              {ai && ai.points.length > 0 && (
                <section aria-labelledby="inti-berita" className="inspo-reveal mt-8 rounded-3xl bg-surface p-5 ring-1 ring-slate-200 sm:p-7">
                  <h2 id="inti-berita" className="flex items-center gap-2.5 text-lg font-extrabold text-ink sm:text-xl">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                      <CheckCircle size={19} />
                    </span>
                    Inti beritanya
                  </h2>
                  <ul className="mt-5 space-y-3.5">
                    {ai.points.map((point, i) => (
                      <li key={i} className="inspo-reveal flex gap-3 text-[15.5px] leading-7 text-slate-700 sm:text-base" style={{ animationDelay: `${120 + i * 70}ms` }}>
                        <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-extrabold text-surface">{i + 1}</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Pendapat Urbanix */}
              {ai?.opinion && (
                <section aria-labelledby="kata-urbanix" className="inspo-reveal relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-cobalt-900 to-cobalt-800 p-5 text-white sm:p-7">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ff5b14] opacity-30 blur-3xl" />
                  <h2 id="kata-urbanix" className="relative flex items-center gap-2.5 text-lg font-extrabold sm:text-xl">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-400 text-cobalt-900">
                      <Quote size={18} />
                    </span>
                    Kata Urbanix
                  </h2>
                  <p className="relative mt-4 text-[15.5px] leading-7 text-white/90 sm:text-base sm:leading-8">{ai.opinion}</p>
                  <p className="relative mt-4 inline-flex items-center gap-1.5 text-xs text-white/55">
                    <AiSpark size={13} /> Ringkasan & pendapat dibuat dengan bantuan AI, bisa keliru. Cek sumber aslinya untuk detail.
                  </p>
                </section>
              )}

              {/* Teks penuh (sumber berizin) */}
              {article.body && <FullText text={article.body} />}

              {/* Sumber */}
              <div className="mt-8 rounded-3xl bg-mist p-5 ring-1 ring-slate-200 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm leading-6 text-slate-600">
                    <p className="font-extrabold text-ink">Sumber: {article.source}</p>
                    {translatedTitle && <p className="mt-0.5">Judul asli: “{article.original_title}”</p>}
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-surface transition hover:shadow-lg"
                  >
                    {article.body ? 'Buka di' : 'Baca lengkap di'} {article.source} <External size={16} />
                  </a>
                </div>
                <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-500">
                  {translatedTitle ? 'Judul diterjemahkan otomatis. ' : ''}
                  {ai ? 'Inti berita ditulis ulang dengan bahasa kami berdasarkan berita aslinya. ' : ''}
                  Foto dan hak cipta artikel asli milik {article.source}.
                </p>
              </div>
            </div>
          </article>

          {/* Produk terkait */}
          {article.related_products.length > 0 && (
            <aside aria-labelledby="judul-produk-terkait" className="lg:sticky lg:top-28 lg:mt-0 lg:self-start">
              <div className="rounded-3xl bg-surface p-4 ring-1 ring-slate-200 sm:p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-500">Ada di Urbanix</p>
                <h2 id="judul-produk-terkait" className="mt-1 text-lg font-extrabold text-ink">
                  {article.related_brand ? `Produk ${article.related_brand}` : 'Produk pilihan'}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {article.related_products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {article.related_brand && (
                  <Link
                    href={`/produk?q=${encodeURIComponent(article.related_brand)}`}
                    className="group mt-4 flex items-center justify-center gap-1.5 rounded-full bg-mist px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:ring-ink"
                  >
                    Semua produk {article.related_brand} <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {article.more.length > 0 && (
        <section aria-labelledby="judul-berita-lain" className="mt-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between gap-4">
              <h2 id="judul-berita-lain" className="text-2xl font-extrabold tracking-tight text-ink">Berita lainnya</h2>
              <Link href="/berita" className="group inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:ring-ink">
                Semua berita <ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {article.more.map((item, i) => (
                <NewsCard key={item.id} article={item} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
