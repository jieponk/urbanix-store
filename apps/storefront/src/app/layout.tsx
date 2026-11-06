import './globals.css';
import Link from 'next/link';
import CartLink from '@/components/CartLink';
import CategoryMenu from '@/components/CategoryMenu';
import Footer from '@/components/Footer';
import { getCategories } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

export const metadata = {
  title: 'URBANIX STORE - Electronics & Gadgets',
  description: siteConfig.motto,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();

  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">
        {/* Header / Navbar */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-brand-dark">
                URBANIX<span className="text-brand-accent">.</span>
              </span>
            </Link>

            <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold text-slate-700">
              <CategoryMenu
                categories={categories.map(({ id, name }) => ({ id, name }))}
              />
              <Link
                href="/produk"
                className="hover:text-brand-500 transition-colors"
              >
                Produk
              </Link>
              <CartLink />
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        <Footer />
      </body>
    </html>
  );
}
