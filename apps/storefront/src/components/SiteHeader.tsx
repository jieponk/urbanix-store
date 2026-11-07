import Link from 'next/link';
import CartLink from '@/components/CartLink';
import type { Category } from '@/lib/api';

type Props = {
  categories: Category[];
  promo: { name: string; maxDiscount: number; endsAt: string | null } | null;
  whatsappNumber: string;
  whatsappDiscount: number;
};

function endDate(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
}

export default function SiteHeader({ categories, promo, whatsappNumber, whatsappDiscount }: Props) {
  const ends = endDate(promo?.endsAt ?? null);

  return (
    <header className="sticky top-0 z-50">
      {/* Pita pengumuman: isi diambil dari promo yang sedang berjalan */}
      {(promo || whatsappDiscount > 0) && (
        <div className="bg-cobalt-800 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-xs sm:text-[13px]">
            {promo && (
              <Link href="/produk?promo=1" className="font-semibold hover:underline">
                <span className="text-sun-400">{promo.name}</span>: hemat sampai {promo.maxDiscount}%
                {ends && <> sampai {ends}</>}
              </Link>
            )}
            {whatsappDiscount > 0 && whatsappNumber && (
              <a href="/#cara-pesan" className={`font-semibold hover:underline ${promo ? 'hidden md:inline' : ''}`}>
                Pesan via WhatsApp, hemat {whatsappDiscount}% lagi
              </a>
            )}
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Urbanix Store, ke beranda">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="#ff5b14" />
              <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="3.2" fill="#ffc93c" />
            </svg>
            <span className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">URBANIX</span>
          </Link>

          <form action="/produk" method="GET" className="hidden flex-1 md:block" role="search">
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-mist px-4 py-2.5 focus-within:border-brand-500 focus-within:bg-white">
              <SearchIcon />
              <input
                type="search"
                name="q"
                placeholder="Cari kamera, lensa, mic, drone…"
                aria-label="Cari produk"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
          </form>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/produk"
              aria-label="Cari produk"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-mist md:hidden"
            >
              <SearchIcon />
            </Link>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-mist sm:flex"
              >
                <ChatIcon />
                Chat admin
              </a>
            )}
            <CartLink />
          </nav>
        </div>

        {/* Kategori: satu baris, geser di HP */}
        {categories.length > 0 && (
          <nav aria-label="Kategori" className="mx-auto max-w-7xl px-4 pb-2.5 sm:px-6 lg:px-8">
            <ul className="scroll-row flex gap-2 overflow-x-auto text-[13px] font-semibold">
              {promo && (
                <li>
                  <Link
                    href="/produk?promo=1"
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sale-600 px-3.5 py-1.5 text-white hover:bg-sale-700"
                  >
                    <span aria-hidden="true">%</span> Promo
                  </Link>
                </li>
              )}
              <li>
                <Link href="/produk" className="block whitespace-nowrap rounded-full bg-mist px-3.5 py-1.5 text-ink hover:bg-brand-100">
                  Semua produk
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/produk?category=${category.id}`}
                    className="block whitespace-nowrap rounded-full bg-mist px-3.5 py-1.5 text-slate-700 hover:bg-brand-100 hover:text-ink"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="shrink-0 text-slate-500">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    </svg>
  );
}
