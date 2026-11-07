import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Footer from '@/components/Footer';
import SiteHeader from '@/components/SiteHeader';
import { getActiveProducts, getCategories, getStoreSettings, promoSummary } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata = {
  title: 'URBANIX STORE - Kamera, Lensa & Gear Kreator',
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
    <html lang="id" className={jakarta.variable}>
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
