import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import CartLink from '@/components/CartLink';
import CategoryMenu from '@/components/CategoryMenu';
import ThemeToggle from '@/components/ThemeToggle';
import SearchBox from '@/components/SearchBox';
import { NewsIcon } from '@/components/Icons';
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
  const menuItems = categories.map(({ id, name }) => ({ id, name }));

  return (
    <header className="sticky top-0 z-50">
      {/* Pita pengumuman: isi diambil dari promo yang sedang berjalan */}
      {(promo || whatsappDiscount > 0) && (
        <div className="bg-cobalt-800 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-center text-xs leading-snug sm:text-[13px]">
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

      <div className="relative border-b border-slate-200 bg-surface/95 backdrop-blur">
        {/* Baris utama */}
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6 md:gap-3 lg:px-8">
          <Link href="/" className="shrink-0" aria-label="Urbanix Store, ke beranda">
            <BrandLogo />
          </Link>

          {/* Desktop: kategori, promo, pencarian */}
          <div className="ml-4 hidden items-center gap-2 md:flex">
            <CategoryMenu categories={menuItems} showPromo={Boolean(promo)} />
            {promo && (
              <Link
                href="/produk?promo=1"
                className="flex h-10 items-center rounded-full px-3.5 text-sm font-bold text-sale-600 hover:bg-sale-50"
              >
                Promo
              </Link>
            )}
            <Link
              href="/berita"
              className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold text-ink hover:bg-mist"
            >
              <NewsIcon size={17} />
              Berita
            </Link>
          </div>
          <SearchBox className="hidden flex-1 md:flex" />

          <nav className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink hover:bg-mist lg:flex"
              >
                <ChatIcon />
                Chat admin
              </a>
            )}
            <Link
              href="/berita"
              aria-label="Berita kamera"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-mist md:hidden"
            >
              <NewsIcon size={20} />
            </Link>
            <ThemeToggle />
            <CartLink />
          </nav>
        </div>

        {/* HP: kategori + pencarian di baris kedua */}
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pb-2.5 sm:px-6 md:hidden">
          <CategoryMenu categories={menuItems} showPromo={Boolean(promo)} />
          <SearchBox className="flex min-w-0 flex-1" />
        </div>
      </div>
    </header>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20.5l1.5-4.6A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    </svg>
  );
}
