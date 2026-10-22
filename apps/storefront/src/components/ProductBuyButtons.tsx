'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addToCart, getCart, saveCart } from '@/lib/cart';

type Props = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stock: number;
};

export default function ProductBuyButtons({
  id,
  name,
  price,
  imageUrl,
  stock,
}: Props) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');

  function addProduct() {
    if (stock < 1) return;

    addToCart({
      id,
      name,
      price,
      image_url: imageUrl,
      quantity,
      stock,
    });

    setMessage('Produk berhasil ditambahkan ke keranjang.');
  }

  function buyNow() {
    if (stock < 1) return;

    const cart = getCart();
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      existing.quantity = Math.min(stock, existing.quantity + quantity);
      saveCart(cart);
    } else {
      addToCart({
        id,
        name,
        price,
        image_url: imageUrl,
        quantity,
        stock,
      });
    }

    router.push('/checkout');
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-slate-700">
          Jumlah
        </span>

        <div className="flex items-center rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="px-4 py-2 text-lg disabled:opacity-30"
            aria-label="Kurangi jumlah"
          >
            −
          </button>

          <span className="min-w-8 text-center font-semibold">
            {quantity}
          </span>

          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            disabled={quantity >= stock}
            className="px-4 py-2 text-lg disabled:opacity-30"
            aria-label="Tambah jumlah"
          >
            +
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Stok: {stock}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={addProduct}
          disabled={stock < 1}
          className="rounded-xl border-2 border-orange-600 px-5 py-3.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Tambah ke Keranjang
        </button>

        <button
          type="button"
          onClick={buyNow}
          disabled={stock < 1}
          className="rounded-xl bg-orange-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Beli Sekarang
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}{' '}
          <button
            type="button"
            onClick={() => router.push('/cart')}
            className="font-bold underline"
          >
            Lihat Keranjang
          </button>
        </div>
      )}
    </div>
  );
}