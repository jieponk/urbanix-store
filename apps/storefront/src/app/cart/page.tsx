import Link from 'next/link';

export default function CartPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Keranjang Belanja</h1>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
        <p className="text-slate-500 text-sm mb-4">Keranjang belanja kamu masih kosong.</p>
        <Link
          href="/"
          className="inline-block bg-brand-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all"
        >
          Mulai Belanja Now
        </Link>
      </div>
    </div>
  );
}
