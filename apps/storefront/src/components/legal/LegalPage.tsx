import Link from 'next/link';

/** Kerangka halaman hukum: judul, tanggal, daftar isi, isi. */
export default function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: { id: string; title: string; body: React.ReactNode }[];
}) {
  return (
    <div className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Terakhir diperbarui: {updated}</p>

        <nav aria-label="Daftar isi" className="mt-6 rounded-2xl bg-mist p-5">
          <p className="text-sm font-bold text-ink">Daftar isi</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:text-ink hover:underline">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-xl font-extrabold text-ink">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-700 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
          Lihat juga:{' '}
          <Link href="/syarat-ketentuan" className="font-semibold underline">Syarat &amp; Ketentuan</Link>
          {' · '}
          <Link href="/kebijakan-privasi" className="font-semibold underline">Kebijakan Privasi</Link>
        </p>
      </article>
    </div>
  );
}
