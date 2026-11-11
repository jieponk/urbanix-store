import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import type { Category, StoreSettings } from '@/lib/api';
import { findPublicImage } from '@/lib/assets';
import { siteConfig } from '@/lib/siteConfig';
import ShopeeReviewsLink from '@/components/ShopeeReviewsLink';
import CourierBadge from '@/components/CourierBadge';
import { courierLogos } from '@/lib/courierLogos';
import { SHIPPING_BRANDS } from '@/lib/shipping';

/** 6281234567890 -> 0812-3456-7890 */
function displayPhone(number: string) {
  const local = number.replace(/\D/g, '').replace(/^62/, '0');
  return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
}

export default function Footer({
  categories,
  settings,
}: {
  categories: Category[];
  settings: StoreSettings | null;
}) {
  const { contact, paymentMethods, motto, name } = siteConfig;
  const whatsapp = (settings?.whatsapp_number || contact.whatsappNumber).replace(/\D/g, '');
  const logos = courierLogos();
  const payments = paymentMethods.map((method) => ({
    ...method,
    src: findPublicImage('payments', method.logo),
  }));

  return (
    <footer className="bg-cobalt-900 text-white/75">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <Link href="/" aria-label="Urbanix Store, ke beranda" className="inline-block">
            <BrandLogo tone="light" size="lg" />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6">{motto}</p>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-cobalt-900 hover:bg-sun-100"
            >
              Chat admin di WhatsApp
            </a>
          )}
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Belanja</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/produk?promo=1" className="hover:text-sun-400">Produk promo</Link></li>
            <li><Link href="/produk" className="hover:text-sun-400">Semua produk</Link></li>
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link href={`/produk?category=${category.id}`} className="hover:text-sun-400">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Bantuan</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/#cara-pesan" className="hover:text-sun-400">Cara pesan via WhatsApp</Link></li>
            <li><Link href="/cart" className="hover:text-sun-400">Keranjang belanja</Link></li>
            <li><Link href="/berita" className="hover:text-sun-400">Berita kamera &amp; fotografi</Link></li>
            <li><Link href="/tentang-kami" className="hover:text-sun-400">Tentang kami</Link></li>
            <li><Link href="/kontak" className="hover:text-sun-400">Kontak</Link></li>
            <li><Link href="/cek-pesanan" className="hover:text-sun-400">Cek pesanan</Link></li>
            <li><Link href="/syarat-ketentuan#pembayaran" className="hover:text-sun-400">Cara pembayaran</Link></li>
            <li><Link href="/syarat-ketentuan#pengiriman" className="hover:text-sun-400">Pengiriman</Link></li>
            <li><Link href="/syarat-ketentuan#pembatalan-retur" className="hover:text-sun-400">Pengembalian &amp; garansi</Link></li>
            <li><Link href="/syarat-ketentuan" className="hover:text-sun-400">Syarat &amp; Ketentuan</Link></li>
            <li><Link href="/kebijakan-privasi" className="hover:text-sun-400">Kebijakan Privasi</Link></li>
            {(settings?.shopee_reviews_url || settings?.shopee_store_url) && (
              <li>
                <ShopeeReviewsLink
                  reviewsUrl={settings?.shopee_reviews_url}
                  storeUrl={settings?.shopee_store_url}
                  className="hover:text-sun-400"
                  desktopLabel="Ulasan pembeli di Shopee"
                  mobileLabel="Ulasan pembeli di Shopee"
                />
              </li>
            )}
            {settings?.shopee_store_url && (
              <li>
                <a href={settings.shopee_store_url} target="_blank" rel="noopener noreferrer" className="hover:text-sun-400">
                  Toko kami di Shopee
                </a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white">Kontak</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="text-white">{contact.person}</li>
            {whatsapp && (
              <li>
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-sun-400">
                  WhatsApp {displayPhone(whatsapp)}
                </a>
              </li>
            )}
            <li>
              <a href={`mailto:${contact.email}`} className="hover:text-sun-400">{contact.email}</a>
            </li>
            <li>{contact.hours}</li>
          </ul>

          <h2 className="mt-7 text-sm font-bold text-white">Pembayaran</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {payments.map((method) => (
              <li key={method.name}>
                {method.src ? (
                  <span className="flex h-9 items-center gap-2 rounded-lg bg-white px-3">
                    <img src={method.src} alt={method.showName ? '' : method.name} loading="lazy" width={60} height={20} className="h-5 w-auto max-w-[80px] object-contain" />
                    {method.showName && <span className="text-xs font-bold text-cobalt-900">{method.name}</span>}
                  </span>
                ) : (
                  <span className="flex h-9 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-white">
                    {method.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Jasa pengiriman */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-sm font-bold text-white">Jasa pengiriman</h2>
            <Link href="/syarat-ketentuan#pengiriman" className="text-xs hover:text-sun-400">
              Ongkir sesuai tarif resmi ekspedisi · Detail
            </Link>
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SHIPPING_BRANDS.map((b) => (
              <li key={b.logo} className="flex flex-col items-center gap-2 rounded-xl bg-white/5 p-3 text-center ring-1 ring-white/10">
                <CourierBadge courier={b.courier} logo={logos[b.logo]} label={b.name} size="lg" />
                <span className="text-xs leading-5 text-white/80">{b.services}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/65 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {name} · {siteConfig.legal.company}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
}
