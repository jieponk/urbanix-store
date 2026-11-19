import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import CategoryMenu from '@/components/CategoryMenu';
import HeaderActions, { ProductBackButton, ProductCartButton } from '@/components/HeaderMenu';
import SearchBox from '@/components/SearchBox';
import { iconBtn, slideLabel } from '@/components/headerLabel';
import { NewsIcon } from '@/components/Icons';
import type { Category } from '@/lib/api';
import { dateLocale, type Lang } from '@/lib/i18n';
import { getLang, getT } from '@/lib/lang-server';
import { EventPreviewBar, EventRibbon } from '@/components/EventMode';
import { getEventState } from '@/lib/event-server';
import TablerIcon from '@/components/TablerIcon';

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

export default async function SiteHeader({ categories, promo, whatsappNumber, whatsappDiscount }: Props) {
  const lang = getLang();
  const t = getT();
  const ends = endDate(promo?.endsAt ?? null, lang);
  const menuItems = categories.map(({ id, name }) => ({ id, name }));
  // Mode Event otomatis (tanggal kembar, payday, Harbolnas): pita event menggantikan pita promo biasa.
  // Dekor toko (Seller Center → Dekor toko): otomatis, mati, tema pilihan, atau pratinjau.
  const { event, upcoming, preview } = await getEventState();

  return (
    <header className="sticky top-0 z-50">
      {/* Pita pengumuman: isi diambil dari promo yang sedang berjalan */}
      {preview && <EventPreviewBar preview={preview} />}
      {(event || upcoming) && <EventRibbon event={event} upcoming={upcoming} />}
      {!event && !upcoming && (promo || whatsappDiscount > 0) && (
        <div className="bg-cobalt-800 text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-center text-xs leading-snug sm:text-[13px]">
            {promo && (
              <Link href="/produk?promo=1" className="truncate font-semibold hover:underline">
                <span className="text-sun-300">{promo.name}</span>
                {/* HP: satu baris ringkas; PC: kalimat lengkap */}
                <span className="sm:hidden"> · {t('s/d {n}%', { n: promo.maxDiscount })}</span>
                <span className="hidden sm:inline">
                  {t('{promo}: hemat sampai {n}%', { promo: '', n: promo.maxDiscount })}
                  {ends && <> {t('sampai {date}', { date: ends })}</>}
                </span>
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
          <ProductBackButton />
          <Link href="/" className="hdr-logo shrink-0" aria-label={t('Urbanix Store, ke beranda')}>
            <BrandLogo />
          </Link>

          {/* Desktop: kategori, promo, pencarian */}
          <div className="ml-4 hidden items-center gap-1 md:flex">
            <CategoryMenu categories={menuItems} showPromo={Boolean(promo)} />
            {promo && (
              <Link href="/produk?promo=1" aria-label={t('Promo')} title={t('Promo')} className={`${iconBtn} !text-sale-600 hover:!bg-sale-50`}>
                <PromoIcon />
                <span className={`${slideLabel} font-bold`}>{event ? `${t('Promo')} ${event.big}` : t('Promo')}</span>
              </Link>
            )}
            <Link href="/inspirasi" aria-label={t('Inspirasi')} title={t('Inspirasi')} className={iconBtn}>
              <NewsIcon size={19} />
              <span className={`${slideLabel} font-bold`}>{t('Inspirasi')}</span>
            </Link>
          </div>
          {/* Pencarian: di HP satu baris dengan logo */}
          <SearchBox className="flex min-w-0 flex-1" />

          {/* Desktop: cek pesanan, keranjang, ID/EN, tema. HP: pindah ke bar navigasi bawah */}
          <ProductCartButton />
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}

function PromoIcon() {
  return (
    <TablerIcon name="discount" size={20} />
  );
}
