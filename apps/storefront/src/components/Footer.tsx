import Link from 'next/link';
import type { Category, StoreSettings } from '@/lib/api';
import { findPublicImage } from '@/lib/assets';
import { siteConfig } from '@/lib/siteConfig';

/** 6281234567890 -> 0812-3456-7890 */
function displayPhone(number: string) {
  const local = number.replace(/^62/, '0');
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
  const whatsapp = settings?.whatsapp_number || contact.whatsappNumber;
  const payments = paymentMethods.map((method) => ({
    ...method,
    src: findPublicImage('payments', method.logo),
  }));

  return (
    <footer className="bg-cobalt-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="#ff5b14" />
              <circle cx="16" cy="16" r="8.5" fill="none" stroke="#fff" strokeWidth="2.5" />
              <circle cx="16" cy="16" r="3.2" fill="#ffc93c" />
            </svg>
            <span className="text-xl font-extrabold tracking-tight text-white">URBANIX</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6">{motto}</p>
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
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
            {settings?.shopee_reviews_url && (
              <li>
                <a href={settings.shopee_reviews_url} target="_blank" rel="noopener noreferrer" className="hover:text-sun-400">
                  Ulasan pembeli di Shopee
                </a>
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
            {whatsapp && <li>WhatsApp {displayPhone(whatsapp)}</li>}
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
                    <img src={method.src} alt={method.showName ? '' : method.name} loading="lazy" className="h-5 w-auto max-w-[80px] object-contain" />
                    {method.showName && <span className="text-xs font-bold text-ink">{method.name}</span>}
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

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-slate-400 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} {name}. Harga dan stok dapat berubah sewaktu-waktu.
        </p>
      </div>
    </footer>
  );
}
