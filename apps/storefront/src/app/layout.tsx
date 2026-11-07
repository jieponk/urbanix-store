import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Footer from '@/components/Footer';
import SiteHeader from '@/components/SiteHeader';
import { themeScript } from '@/components/ThemeToggle';
import { getActiveProducts, getCategories, getStoreSettings, promoSummary } from '@/lib/api';
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
  description: siteConfig.motto,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings, products] = await Promise.all([
    getCategories(),
    getStoreSettings(),
    getActiveProducts().catch(() => []),
  ]);
  const promo = promoSummary(products);

  return (
    <html lang="id" className={jakarta.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader
          categories={categories}
          promo={promo}
          whatsappNumber={settings?.whatsapp_number ?? ''}
          whatsappDiscount={Number(settings?.whatsapp_discount_percent) || 0}
        />
        <main className="flex-1">{children}</main>
        <Footer categories={categories} settings={settings} />
      </body>
    </html>
  );
}
