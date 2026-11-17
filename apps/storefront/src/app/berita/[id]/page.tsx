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
        <div className="mx-auto flex max-w-lg flex-col items-center border-y-[3px] border-ink p-8 text-center">
          <span className="text-slate-400">
            <Newspaper size={26} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold text-ink">Berita tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">Berita ini mungkin sudah lama atau disembunyikan.</p>
          <Link href="/berita" className="group mt-6 inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-ed hover:text-white">
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
    <div className="ed pb-16">
      {/* ---------- Kepala ---------- */}
      <header className="px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link href="/" aria-label="Beranda" className="hover:text-ink"><Home size={14} /></Link>
            <ChevronRight size={12} className="opacity-60" />
            <Link href="/inspirasi" className="hover:text-ink">Inspirasi</Link>
            <ChevronRight size={12} className="opacity-60" />
            <Link href="/berita" className="hover:text-ink">Berita</Link>
          </nav>
          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap items-center gap-4 border-t-[3px] border-ed pt-2">
              <span className="ed-kicker inline-flex items-center gap-1.5"><Globe size={13} /> {article.source}</span>
              {ai && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  <AiSpark size={13} /> Ada ringkasan
                </span>
              )}
            </div>
            <h1 className="mt-4 text-[1.9rem] font-extrabold leading-[1.12] tracking-[-0.025em] text-ink sm:text-5xl">{article.title}</h1>
          </div>
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-slate-200 py-3.5 text-sm text-slate-500">
            <time dateTime={article.published_at} className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> {date}
            </time>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} /> {newsDate(article.published_at)}
            </span>
          </p>
        </div>
      </header>

      <div className="mt-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="min-w-0">
            <figure className="inspo-reveal overflow-hidden rounded-md bg-mist">
              <NewsImage src={article.image_url} alt={article.title} className="aspect-[16/9] w-full" />
            </figure>
            {article.image_url && <p className="mt-2 text-xs text-slate-500">Foto: {article.source}</p>}

            <div className="max-w-[720px]">
              {(ai?.conclusion || article.summary) && (
                <p className="mt-8 text-lg leading-8 text-ink sm:text-xl sm:leading-9">{ai?.conclusion || article.summary}</p>
              )}

              {ai && ai.points.length > 0 && (
                <section aria-labelledby="inti-berita" className="mt-10">
                  <h2 id="inti-berita" className="flex items-center gap-2.5 border-t-[3px] border-ink pt-4 text-xl font-extrabold text-ink">
                    <CheckCircle size={20} className="text-ed" /> Inti beritanya
                  </h2>
                  <ol className="mt-5 divide-y divide-slate-200">
                    {ai.points.map((point, i) => (
                      <li key={i} className="inspo-reveal flex gap-4 py-3.5 text-[15.5px] leading-7 text-slate-700 sm:text-base" style={{ animationDelay: `${100 + i * 60}ms` }}>
                        <span className="w-6 shrink-0 text-lg font-extrabold leading-7 tabular-nums text-ed">{String(i + 1).padStart(2, '0')}</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {ai?.opinion && (
                <section aria-labelledby="kata-urbanix" className="mt-10 border-l-[3px] border-ed bg-mist px-5 py-5 sm:px-7">
                  <h2 id="kata-urbanix" className="flex items-center gap-2 text-lg font-extrabold text-ink">
                    <Quote size={18} className="text-ed" /> Kata Urbanix
                  </h2>
                  <p className="mt-3 text-[15.5px] leading-7 text-slate-700 sm:text-base sm:leading-8">{ai.opinion}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <AiSpark size={13} /> Ringkasan dan pendapat dibuat dengan bantuan AI, bisa keliru. Cek sumber aslinya untuk detail.
                  </p>
                </section>
              )}

              {article.body && <FullText text={article.body} />}

              <div className="mt-10 border-t-[3px] border-ink pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm leading-6 text-slate-600">
                    <p className="font-extrabold text-ink">Sumber: {article.source}</p>
                    {translatedTitle && <p className="mt-0.5">Judul asli: “{article.original_title}”</p>}
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-surface transition hover:bg-ed hover:text-white"
                  >
                    {article.body ? 'Buka di' : 'Baca lengkap di'} {article.source} <External size={16} />
                  </a>
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
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
              <div className="border-t-[3px] border-ink pt-4">
                <p className="ed-kicker">Ada di Urbanix</p>
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
                    className="group mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-sm font-bold text-ink hover:text-ed"
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
            <div className="flex items-end justify-between gap-4 border-t-[3px] border-ink pt-5">
              <h2 id="judul-berita-lain" className="text-2xl font-extrabold tracking-tight text-ink">Berita lainnya</h2>
              <Link href="/berita" className="group inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:text-ed">
                Semua berita <ArrowRight size={16} />
              </Link>
            </div>
            <div className="mt-7 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
