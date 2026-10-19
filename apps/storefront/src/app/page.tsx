'use client'

import { useState } from 'react'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Urbanix Wireless ANC Headphones', price: 'Rp 1.499.000', stock: 12, category: 'Audio', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500' },
  { id: 2, name: 'Minimalist Matte Smartwatch', price: 'Rp 2.199.000', stock: 5, category: 'Wearables', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500' },
  { id: 3, name: 'Ergonomic Mechanical Keyboard', price: 'Rp 1.150.000', stock: 8, category: 'Peripherals', image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500' },
  { id: 4, name: 'Urban Waterproof Backpack 25L', price: 'Rp 650.000', stock: 15, category: 'Lifestyle', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500' },
]

export default function Home() {
  const [cartCount, setCartCount] = useState(0)

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white rounded-2xl p-8 md:p-12 shadow-xl">
        <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400/30">
          Koleksi Terbaru 2026
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold mt-4 tracking-tight">
          Inovasi Teknologi & Gaya Perkotaan Modern
        </h1>
        <p className="mt-2 text-slate-300 max-w-2xl">
          Dapatkan produk-produk pilihan premium dengan garansi resmi dan sistem pembayaran otomatis bebas ribet.
        </p>
      </section>

      {/* Catalog Grid */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Katalog Produk</h2>
          <span className="text-sm text-slate-500">Menampilkan {MOCK_PRODUCTS.length} produk</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_PRODUCTS.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="h-48 bg-slate-100 relative">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 bg-white/90 text-slate-800 text-xs px-2 py-1 rounded font-medium">
                  {product.category}
                </span>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                <p className="text-blue-600 font-bold text-lg">{product.price}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>Stok: {product.stock} unit</span>
                  <button 
                    onClick={() => setCartCount(cartCount + 1)}
                    className="bg-slate-900 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    + Keranjang
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
