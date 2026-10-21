export default function CheckoutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout Pesanan</h1>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-4">Alamat Pengiriman & Pembayaran</h2>
        <p className="text-slate-500 text-sm mb-4">Lengkapi data diri dan pilih metode pembayaran otomatis (QRIS / Virtual Account).</p>
      </div>
    </div>
  );
}
