import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'URBANIX STORE — Official Flagship Store',
  description: 'Platform E-Commerce Modern & Premium untuk Kebutuhan Gaya Hidup Perkotaan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col justify-between">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-2xl font-black tracking-tight text-slate-900">
              URBANIX<span className="text-blue-600">STORE</span>
            </Link>
            <nav className="flex items-center gap-6 font-medium text-sm text-slate-600">
              <Link href="/" className="hover:text-blue-600">Katalog</Link>
              <Link href="/cart" className="hover:text-blue-600">Keranjang</Link>
              <Link href="/orders" className="hover:text-blue-600">Pesanan Saya</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
          {children}
        </main>

        <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm">
            &copy; 2026 URBANIX STORE. All rights reserved. Monorepo Polyglot Platform.
          </div>
        </footer>
      </body>
    </html>
  )
}
