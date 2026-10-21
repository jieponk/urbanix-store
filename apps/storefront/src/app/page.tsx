import Image from 'next/image';
import Link from 'next/link';

// Dummy list / sample view
const sampleProducts = [
  {
    id: '1',
    name: 'Saramonic Air SE 01 Mic Wireless Clip On 2-in-1',
    price: 'Rp 1.299.000',
    category: 'Audio / Microphones',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60',
    stock: 12,
  },
  {
    id: '2',
    name: 'Insta360 Link 2 Pro 4K AI UHD Webcam',
    price: 'Rp 5.999.000',
    category: 'Action Cameras',
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&auto=format&fit=crop&q=60',
    stock: 15,
  },
  {
    id: '3',
    name: 'Fujifilm X-M5 Body Only Mirrorless Camera',
    price: 'Rp 12.499.000',
    category: 'Cameras',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&auto=format&fit=crop&q=60',
    stock: 5,
  },
  {
    id: '4',
    name: 'K&F Concept Camera Battery & Card Case',
    price: 'Rp 249.000',
    category: 'Camera Accessories',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
    stock: 50,
  },
];

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-brand-dark to-slate-800 text-white rounded-2xl p-8 sm:p-12 mb-10 shadow-lg">
        <span className="text-brand-accent font-bold tracking-widest uppercase text-xs">
          Koleksi Terbaru 2026
        </span>
        <h1 className="text-3xl sm:text-5xl font-black mt-2 mb-4 leading-tight">
          Inovasi Teknologi & Gaya Perkotaan Modern
        </h1>
        <p className="text-slate-300 max-w-2xl text-sm sm:text-base mb-6">
          Dapatkan produk-produk pilihan premium dengan garansi resmi dan sistem pembayaran otomatis bebas ribet.
        </p>
        <a
          href="#katalog"
          className="inline-block bg-brand-accent hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md"
        >
          Jelajahi Katalog
        </a>
      </div>

      {/* Product Catalog Section */}
      <div id="katalog">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Katalog Produk</h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
            206 Produk Terdaftar
          </span>
        </div>

        {/* Grid 4 Kolom */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sampleProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              <div className="relative aspect-square bg-slate-100 overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 bg-white/90 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {p.category}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 mb-2 group-hover:text-brand-600 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-lg font-black text-brand-dark mb-4">{p.price}</p>
                </div>

                <button className="w-full bg-brand-dark hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center space-x-1">
                  <span>+ Tambah ke Keranjang</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
