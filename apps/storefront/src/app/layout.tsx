import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Footer from '@/components/Footer';
import BrandMarquee, { topBrands } from '@/components/BrandMarquee';
import ShopChrome from '@/components/ShopChrome';
import SiteHeader from '@/components/SiteHeader';
import { MobileNav } from '@/components/HeaderMenu';
import { LangProvider } from '@/components/LangProvider';
import { getLang } from '@/lib/lang-server';
import { themeScript } from '@/components/ThemeToggle';
import { getActiveProducts, getCategories, getStoreSettings, promoSummary } from '@/lib/api';
import { SITE_URL, jsonLd, organizationJsonLd, websiteJsonLd } from '@/lib/seo';
import { siteConfig } from '@/lib/siteConfig';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata = {
  title: {
    default: `URBANIX STORE | ${siteConfig.tagline}`,
    template: '%s | URBANIX STORE',
  },
  description: siteConfig.metaDescription,
  metadataBase: new URL(SITE_URL),
  applicationName: siteConfig.name,
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Produk terbaru Urbanix Store' }] },
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: siteConfig.name,
    title: `URBANIX STORE | ${siteConfig.tagline}`,
    description: siteConfig.metaDescription,
    images: [{ url: '/brand/og-image.png', width: 1200, height: 630, alt: 'Urbanix Store' }],
  },
  twitter: { card: 'summary_large_image', images: ['/brand/og-image.png'] },
  // Kode verifikasi Google Search Console (opsional). Isi GOOGLE_SITE_VERIFICATION di .env
  // bila mendaftar lewat cara "tag HTML". Kalau kosong, baris ini tidak ditampilkan.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  // Safari iPhone otomatis mengubah nomor telepon jadi tautan, yang membuat
  // tampilan HP berbeda dari server ("Hydration failed"). Matikan deteksi otomatis itu.
  formatDetection: { telephone: false, email: false, address: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings, products] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getActiveProducts().catch(() => []),
  ]);
  const promo = promoSummary(products);
  const lang = getLang();

  return (
    <html lang={lang} className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Identitas toko & nama situs untuk Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(
            organizationJsonLd({ whatsapp: settings?.whatsapp_number, shopeeUrl: settings?.shopee_store_url })
          )}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(websiteJsonLd())} />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <LangProvider lang={lang}>
        <ShopChrome
          header={
            <SiteHeader
              categories={categories}
              promo={promo}
              whatsappNumber={settings?.whatsapp_number ?? ''}
              whatsappDiscount={Number(settings?.whatsapp_discount_percent) || 0}
            />
          }
          footer={
            <>
              <BrandMarquee brands={topBrands()} />
              <Footer categories={categories} settings={settings} />
              <MobileNav
                categories={categories.map(({ id, name }) => ({ id, name }))}
                whatsappNumber={settings?.whatsapp_number ?? ''}
                showPromo={Boolean(promo)}
              />
            </>
          }
        >
          {children}
        </ShopChrome>
        </LangProvider>
      </body>
    </html>
  );
}
