'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  CartItem,
  getCart,
  removeFromCart,
  updateCartQuantity,
} from '@/lib/cart';

const money = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  const refreshCart = useCallback(() => {
    setItems(getCart());
  }, []);

  useEffect(() => {
    refreshCart();

    window.addEventListener('cart-updated', refreshCart);
    window.addEventListener('storage', refreshCart);

    return () => {
      window.removeEventListener('cart-updated', refreshCart);
      window.removeEventListener('storage', refreshCart);
    };
  }, [refreshCart]);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-slate-500 hover:text-orange-600">
          ← Kembali ke toko
        </Link>

        <h1 className="mb-6 mt-4 text-2xl font-black text-slate-900">
          Keranjang Belanja
        </h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="mb-4 text-slate-500">
              Keranjang belanja kamu masih kosong.
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-24 w-24 rounded-xl border border-slate-100 object-contain"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                      Tanpa gambar
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-900">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      {money(item.price)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Subtotal: {money(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        updateCartQuantity(item.id, item.quantity - 1);
                        refreshCart();
                      }}
                      disabled={item.quantity <= 1}
                      className="h-9 w-9 rounded-lg border disabled:opacity-30"
                    >
                      −
                    </button>

                    <span className="min-w-5 text-center">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        updateCartQuantity(item.id, item.quantity + 1);
                        refreshCart();
                      }}
                      disabled={item.quantity >= item.stock}
                      className="h-9 w-9 rounded-lg border disabled:opacity-30"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        removeFromCart(item.id);
                        refreshCart();
                      }}
                      className="ml-1 text-sm font-semibold text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold text-slate-600">
                  Total Belanja
                </span>
                <span className="text-xl font-black text-slate-900">
                  {money(total)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="mt-5 block rounded-xl bg-orange-600 px-5 py-4 text-center font-bold text-white hover:bg-orange-700"
              >
                Lanjut ke Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}