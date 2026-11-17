import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import CategoryMenu from '@/components/CategoryMenu';
import HeaderMenu from '@/components/HeaderMenu';
import SearchBox from '@/components/SearchBox';
import { iconBtn, slideLabel } from '@/components/headerLabel';
import { NewsIcon } from '@/components/Icons';
import type { Category } from '@/lib/api';
import { dateLocale, type Lang } from '@/lib/i18n';
import { getLang, getT } from '@/lib/lang-server';

type Props = {
  categories: Category[];
  promo: { name: string; maxDiscount: number; endsAt: string | null } | null;
  whatsappNumber: string;
  whatsappDiscount: number;
};

function endDate(iso: string | null, lang: Lang) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });
}

export default function SiteHeader({ categories, promo, whatsappNumber, whatsappDiscount }: Props) {
  const lang = getLang();
  const t = getT();
  const ends = endDate(promo?.endsAt ?? null, lang);
  const menuItems = categories.map(({ id, name }) => ({ id, name }));

  return (
    <header className="sticky top-0 z-50">
      {/* Pita pengumuman: isi diambil dari promo yang sedang berjalan */}
      {(promo || whatsappDiscount > 0) && (
        <div className="bg-cobalt-800 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-center text-xs leading-snug sm:text-[13px]">
            {promo && (
              <Link href="/produk?promo=1" className="font-semibold hover:underline">
                <span className="text-sun-400">{promo.name}</span>
                {t('{promo}: hemat sampai {n}%', { promo: '', n: promo.maxDiscount })}
                {ends && <> {t('sampai {date}', { date: ends })}</>}
              </Link>
            )}
            {whatsappDiscount > 0 && whatsappNumber && (
              <a href="/#cara-pesan" className={`font-semibold hover:underline ${promo ? 'hidden md:inline' : ''}`}>
                {t('Pesan via WhatsApp, hemat {n}% lagi', { n: whatsappDiscount })}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="relative border-b border-slate-200 bg-surface/95 backdrop-blur">
        {/* Baris utama */}
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6 md:gap-3 lg:px-8">
          <Link href="/" className="shrink-0" aria-label={t('Urbanix Store, ke beranda')}>
            <BrandLogo />
          </Link>

          {/* Desktop: kategori, promo, pencarian */}
          <div className="ml-4 hidden items-center gap-1 md:flex">
            <CategoryMenu categories={menuItems} showPromo={Boolean(promo)} />
            {promo && (
              <Link href="/produk?promo=1" aria-label={t('Promo')} title={t('Promo')} className={`${iconBtn} !text-sale-600 hover:!bg-sale-50`}>
                <PromoIcon />
                <span className={`${slideLabel} font-bold`}>{t('Promo')}</span>
              </Link>
            )}
            <Link href="/inspirasi" aria-label={t('Inspirasi')} title={t('Inspirasi')} className={iconBtn}>
              <NewsIcon size={19} />
              <span className={`${slideLabel} font-bold`}>{t('Inspirasi')}</span>
            </Link>
          </div>
          <SearchBox className="hidden flex-1 md:flex" />

          {/* Satu tombol menu: keranjang, cek pesanan, inspirasi, chat, bahasa, tema meluncur ke kiri */}
          <div className="ml-auto md:ml-0">
            <HeaderMenu whatsappNumber={whatsappNumber} />
          </div>
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

function PromoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
