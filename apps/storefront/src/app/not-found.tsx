import Link from 'next/link';

export const metadata = { title: 'Halaman tidak ditemukan', robots: { index: false } };

export default function NotFound() {
  return (
    <div className="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-7xl font-extrabold tracking-tight text-cobalt-800 dark:text-sky-300 sm:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-slate-600">
          Link yang kamu buka mungkin salah ketik, atau produknya sudah tidak tersedia.
        </p>

        <form action="/produk" className="mx-auto mt-8 flex max-w-md gap-2">
          <input
            name="q"
            placeholder="Cari kamera, lensa, drone…"
            aria-label="Cari produk"
            className="w-full rounded-xl border border-slate-300 bg-surface px-4 py-3 text-base text-ink outline-none focus:border-ink sm:text-sm"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-ink px-5 text-sm font-bold text-surface hover:bg-slate-800">
            Cari
          </button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-bold">
          <Link href="/" className="rounded-full bg-surface px-4 py-2 text-ink ring-1 ring-slate-200 hover:bg-mist">Beranda</Link>
          <Link href="/produk" className="rounded-full bg-surface px-4 py-2 text-ink ring-1 ring-slate-200 hover:bg-mist">Semua produk</Link>
          <Link href="/produk?promo=1" className="rounded-full bg-surface px-4 py-2 text-ink ring-1 ring-slate-200 hover:bg-mist">Promo</Link>
          <Link href="/berita" className="rounded-full bg-surface px-4 py-2 text-ink ring-1 ring-slate-200 hover:bg-mist">Berita</Link>
        </div>
      </div>
    </div>
  );
}
