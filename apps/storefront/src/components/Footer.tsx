import Link from 'next/link';
import FooterGroup from '@/components/FooterGroup';
import BrandLogo from '@/components/BrandLogo';
import type { Category, StoreSettings } from '@/lib/api';
import { findPublicImage } from '@/lib/assets';
import { siteConfig } from '@/lib/siteConfig';
import ShopeeReviewsLink from '@/components/ShopeeReviewsLink';
import { FOOTER_COURIERS, FOOTER_COURIERS_FALLBACK } from '@/lib/shipping';
import { LangLinks } from '@/components/HeaderMenu';
import { getT } from '@/lib/lang-server';
import SimpleIcon from '@/components/SimpleIcon';

/** 6281234567890 -> 0812-3456-7890 */
function displayPhone(number: string) {
  const local = number.replace(/\D/g, '').replace(/^62/, '0');
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

/** Logo pembayaran & kurir: abu-abu seragam, berwarna saat disorot (PC) atau disentuh (HP), seperti logo merek. */
const LOGO_MONO =
  'opacity-75 brightness-0 invert transition duration-300 group-hover/logo:opacity-100 group-hover/logo:brightness-100 group-hover/logo:invert-0 group-focus/logo:opacity-100 group-focus/logo:brightness-100 group-focus/logo:invert-0';
/** Logo berbentuk kotak penuh bertulisan putih (Lion Parcel): siluet putih akan menghapus tulisannya, jadi pakai abu terbalik. */
const LOGO_GRAY =
  'opacity-80 grayscale invert transition duration-300 group-hover/logo:opacity-100 group-hover/logo:grayscale-0 group-hover/logo:invert-0 group-focus/logo:opacity-100 group-focus/logo:grayscale-0 group-focus/logo:invert-0';
const SOLID_LOGOS = ['lion'];
/** Kotak logo: gelap transparan menyatu dengan footer hitam, jadi putih saat disorot/disentuh agar warna logo terbaca. */
const LOGO_BOX =
  'group/logo flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white/[0.06] px-2 ring-1 ring-white/15 outline-none transition duration-300 hover:bg-white hover:ring-white focus:bg-white focus:ring-white';

export default function Footer({
  categories,
  settings,
}: {
  categories: Category[];
  settings: StoreSettings | null;
}) {
  const t = getT();
  const { contact, paymentMethods, motto, name } = siteConfig;
  const whatsapp = (settings?.whatsapp_number || contact.whatsappNumber).replace(/\D/g, '');
  const active = settings?.couriers?.length ? settings.couriers : FOOTER_COURIERS_FALLBACK;
  const couriers = FOOTER_COURIERS.filter((c) => active.includes(c.code)).map((c) => ({
    ...c,
    src: c.file ? findPublicImage('couriers', c.file) : null,
  }));
  const payments = paymentMethods.map((method) => ({
    ...method,
    src: findPublicImage('payments', method.logo),
  }));

  return (
    <footer className="bg-cobalt-900 text-white/75">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 md:pt-12 lg:px-8">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.3fr_1fr_1fr_1fr_1.1fr] md:gap-8">
          {/* Merek toko */}
          <div className="pb-6 md:pb-0">
            <Link href="/" aria-label={t('Urbanix Store, ke beranda')} className="inline-block">
              <BrandLogo tone="light" size="lg" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6">{t(motto)}</p>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-cobalt-900 transition hover:bg-white/85"
              >
                <SimpleIcon name="whatsapp" size={18} />
                {t('Chat admin di WhatsApp')}
              </a>
            )}
          </div>

          <div className="border-t border-white/10 md:contents md:border-0">
            <FooterGroup title={t('Belanja')}>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/produk?promo=1" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Produk promo')}</Link></li>
                <li><Link href="/produk" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Semua produk')}</Link></li>
                {categories.slice(0, 6).map((category) => (
                  <li key={category.id}>
                    <Link href={`/produk?category=${category.id}`} className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{category.name}</Link>
                  </li>
                ))}
              </ul>
            </FooterGroup>

            <FooterGroup title={t('Bantuan')}>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/#cara-pesan" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Cara pesan via WhatsApp')}</Link></li>
                <li><Link href="/cek-pesanan" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Cek pesanan')}</Link></li>
                <li><Link href="/cart" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Keranjang belanja')}</Link></li>
                <li><Link href="/syarat-ketentuan#pembayaran" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Cara pembayaran')}</Link></li>
                <li><Link href="/syarat-ketentuan#pengiriman" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Pengiriman')}</Link></li>
                <li><Link href="/syarat-ketentuan#pembatalan-retur" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Pengembalian & garansi')}</Link></li>
              </ul>
            </FooterGroup>

            <FooterGroup title={t('Tentang Urbanix')}>
              <ul className="space-y-2.5 text-sm">
                <li><Link href="/tentang-kami" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Tentang kami')}</Link></li>
                <li><Link href="/inspirasi" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Inspirasi: tips & review')}</Link></li>
                <li><Link href="/berita" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Berita kamera & fotografi')}</Link></li>
                {(settings?.shopee_reviews_url || settings?.shopee_store_url) && (
                  <li>
                    <ShopeeReviewsLink
                      reviewsUrl={settings?.shopee_reviews_url}
                      storeUrl={settings?.shopee_store_url}
                      className="transition-colors hover:text-white hover:underline hover:underline-offset-4"
                      desktopLabel={t('Ulasan pembeli di Shopee')}
                      mobileLabel={t('Ulasan pembeli di Shopee')}
                    />
                  </li>
                )}
                {settings?.shopee_store_url && (
                  <li>
                    <a href={settings.shopee_store_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-white hover:underline hover:underline-offset-4"><SimpleIcon name="shopee" size={15} />{t('Toko kami di Shopee')}</a>
                  </li>
                )}
                <li><Link href="/syarat-ketentuan" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Syarat & Ketentuan')}</Link></li>
                <li><Link href="/kebijakan-privasi" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Kebijakan Privasi')}</Link></li>
              </ul>
            </FooterGroup>

            <FooterGroup title={t('Kontak')}>
              <ul className="space-y-2.5 text-sm">
                <li className="text-white">{contact.person}</li>
                {whatsapp && (
                  <li>
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-white hover:underline hover:underline-offset-4"><SimpleIcon name="whatsapp" size={15} />WhatsApp {displayPhone(whatsapp)}</a>
                  </li>
                )}
                <li><a href={`mailto:${contact.email}`} className="transition-colors hover:text-white hover:underline hover:underline-offset-4 break-all">{contact.email}</a></li>
                <li>{t(contact.hours)}</li>
                <li><Link href="/kontak" className="transition-colors hover:text-white hover:underline hover:underline-offset-4">{t('Semua kontak & alamat')}</Link></li>
              </ul>
            </FooterGroup>
          </div>
        </div>

        {/* Pembayaran & pengiriman: satu baris rapi */}
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-white/10 py-7 sm:grid-cols-2 md:mt-10">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">{t('Pembayaran')}</h2>
            <ul className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-5">
              {payments.map((method) => (
                <li key={method.name}>
                  <span title={method.name} tabIndex={0} className={LOGO_BOX}>
                    {method.simple && (
                      <SimpleIcon
                        name={method.simple}
                        size={30}
                        color="current"
                        title={method.name}
                        className={`text-white/75 transition ${method.simple === 'visa' ? 'group-hover/logo:text-[#1A1F71] group-focus/logo:text-[#1A1F71]' : 'group-hover/logo:text-[#EB001B] group-focus/logo:text-[#EB001B]'}`}
                      />
                    )}
                    {!method.simple && method.src && (
                      <img
                        src={method.src}
                        alt={method.showName ? '' : method.name}
                        loading="lazy"
                        width={60}
                        height={20}
                        className={`${method.showName ? 'h-4 w-auto' : 'h-5 w-full object-contain'} ${LOGO_MONO}`}
                      />
                    )}
                    {!method.simple && (!method.src || method.showName) && (
                      <span className="truncate text-[11px] font-black text-white/75 transition group-hover/logo:text-cobalt-900 group-focus/logo:text-cobalt-900">{method.name}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="flex items-baseline gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">{t('Pengiriman')}</h2>
              <Link href="/syarat-ketentuan#pengiriman" className="text-xs text-white/60 hover:text-white hover:underline">
                {t('Detail')}
              </Link>
            </div>
            <ul className="mt-3 grid grid-cols-4 gap-2 lg:grid-cols-5">
              {couriers.map((c) => (
                <li key={c.code}>
                  <span title={c.name} tabIndex={0} className={LOGO_BOX}>
                    {c.simple ? (
                      <>
                        <SimpleIcon
                          name={c.simple}
                          size={c.simple === 'grab' ? 34 : 16}
                          color="current"
                          title={c.simple === 'grab' ? c.name : undefined}
                          className={`text-white/75 transition ${c.simple === 'grab' ? 'group-hover/logo:text-[#00B14F] group-focus/logo:text-[#00B14F]' : 'group-hover/logo:text-[#00AA13] group-focus/logo:text-[#00AA13]'}`}
                        />
                        {c.simple === 'gojek' && (
                          <span className="text-[11px] font-black text-white/75 transition group-hover/logo:text-[#00AA13] group-focus/logo:text-[#00AA13]">GoSend</span>
                        )}
                      </>
                    ) : c.src ? (
                      <img src={c.src} alt={c.name} loading="lazy" width={60} height={20} className={`h-5 w-full object-contain ${SOLID_LOGOS.includes(c.code) ? LOGO_GRAY : LOGO_MONO}`} />
                    ) : (
                      <span className="truncate text-[11px] font-black text-white/75 transition group-hover/logo:text-slate-700 group-focus/logo:text-slate-700">{c.name}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-start gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs leading-5 text-white/65">
          © {new Date().getFullYear()} {name} · {siteConfig.legal.company}. {t('Seluruh hak cipta dilindungi.')}
        </p>
        <LangLinks />
        </div>
      </div>
    </footer>
  );
}
