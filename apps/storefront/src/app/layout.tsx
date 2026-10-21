import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'URBANIX STORE - Electronics & Gadgets',
  description: 'Inovasi Teknologi & Gaya Perkotaan Modern',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col">
        {/* Header / Navbar */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-wider text-brand-dark">
                URBANIX<span className="text-brand-accent">.</span>
              </span>
            </Link>

            <nav className="flex items-center space-x-6 text-sm font-semibold text-slate-700">
              <Link href="/" className="hover:text-brand-500 transition-colors">
                Katalog
              </Link>
              <Link href="/cart" className="relative hover:text-brand-500 transition-colors">
                Keranjang
                <span className="ml-1 px-2 py-0.5 text-xs bg-brand-accent text-white rounded-full font-bold">
                  0
                </span>
              </Link>
              <Link href="/checkout" className="hover:text-brand-500 transition-colors">
                Checkout
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-brand-dark text-slate-400 py-8 border-t border-slate-800 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            <p>&copy; 2026 URBANIX STORE. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
