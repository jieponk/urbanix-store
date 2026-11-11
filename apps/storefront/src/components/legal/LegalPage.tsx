import Link from 'next/link';
import FeatureIcon, { type FeatureIconName } from '@/components/FeatureIcon';
import { siteConfig } from '@/lib/siteConfig';

type Section = { id: string; title: string; body: React.ReactNode };
type Highlight = { icon: FeatureIconName; title: string; text: string };

/** Kerangka halaman hukum: pembuka, ringkasan, daftar isi menempel, isi per kartu, bantuan. */
export default function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  highlights = [],
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  highlights?: Highlight[];
  sections: Section[];
}) {
  const wa = (siteConfig.contact.whatsappNumber || '').replace(/\D/g, '');
  const others = [
    { href: '/syarat-ketentuan', label: 'Syarat & Ketentuan' },
    { href: '/kebijakan-privasi', label: 'Kebijakan Privasi' },
    { href: '/tentang-kami', label: 'Tentang Kami' },
    { href: '/kontak', label: 'Kontak' },
  ].filter((o) => o.label !== title);

  return (
    <div>
      {/* Pembuka */}
      <section className="relative overflow-hidden bg-cobalt-900 px-4 pb-20 pt-12 text-white sm:px-6 sm:pb-28 sm:pt-16 lg:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-white/60">
            <Link href="/" className="hover:text-white">Beranda</Link>
            <span className="mx-2">/</span>
            <span className="text-white/90">{title}</span>
          </nav>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-sun-400">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">{intro}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white/85 ring-1 ring-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Terakhir diperbarui {updated}
          </p>
        </div>
      </section>

      {/* Ringkasan singkat */}
      {highlights.length > 0 && (
        <section className="relative -mt-12 px-4 sm:-mt-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-2xl bg-surface p-5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15">
                  <FeatureIcon name={h.icon} size={20} />
                </span>
                <p className="mt-3 font-extrabold text-ink">{h.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{h.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Isi */}
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <nav aria-label="Daftar isi" className="rounded-2xl bg-mist p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar isi</p>
              <ol className="mt-3 space-y-1 text-sm">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex gap-3 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-surface hover:text-ink"
                    >
                      <span className="w-5 shrink-0 font-bold text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            {wa && (
              <div className="mt-4 hidden rounded-2xl bg-cobalt-900 p-5 text-white lg:block">
                <p className="font-extrabold">Ada yang kurang jelas?</p>
                <p className="mt-1 text-sm text-white/70">Admin kami siap menjelaskan.</p>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block rounded-xl bg-brand-600 text-white px-4 py-2.5 text-center text-sm font-bold hover:brightness-95"
                >
                  Chat admin
                </a>
              </div>
            )}
          </aside>

          <div className="space-y-5">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-32 rounded-2xl bg-surface p-6 ring-1 ring-slate-200 sm:p-8"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cobalt-900 text-sm font-extrabold text-sun-400">
                    {i + 1}
                  </span>
                  <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{s.title}</h2>
                </div>
                <div className="mt-4 space-y-3 text-[15px] leading-7 text-slate-700 sm:pl-14 [&_b]:text-ink [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:left-1 [&_ul>li]:before:top-[0.7rem] [&_ul>li]:before:h-1.5 [&_ul>li]:before:w-1.5 [&_ul>li]:before:rounded-full [&_ul>li]:before:bg-brand-500 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_ol>li]:pl-1 [&_ol>li]:marker:font-extrabold [&_ol>li]:marker:text-brand-600">
                  {s.body}
                </div>
              </section>
            ))}

            {/* Penutup */}
            <div className="flex flex-col gap-4 rounded-2xl bg-mist p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="font-extrabold text-ink">Masih ada pertanyaan?</p>
                <p className="mt-1 text-sm text-slate-600">Hubungi kami, atau baca halaman lainnya.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {others.map((o) => (
                    <Link
                      key={o.href}
                      href={o.href}
                      className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ink ring-1 ring-slate-200 hover:ring-ink"
                    >
                      {o.label}
                    </Link>
                  ))}
                </div>
              </div>
              {wa && (
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-xl bg-brand-600 px-6 py-3 text-center font-bold text-white hover:brightness-95"
                >
                  Chat admin via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
