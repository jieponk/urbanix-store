'use client';

import Link from 'next/link';
import { BackLink } from '@/components/Icons';
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
    <div className="px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <BackLink href="/">Kembali ke toko</BackLink>

        <h1 className="mb-5 mt-4 text-2xl font-extrabold tracking-tight text-ink">
          Keranjang Belanja
        </h1>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-surface p-8 text-center">
            <p className="mb-4 text-slate-500">
              Keranjang belanja kamu masih kosong.
            </p>
            <Link
              href="/produk"
              className="inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-slate-800"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-surface px-4 sm:px-5">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 py-4 sm:gap-4 sm:py-5">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-white object-contain sm:h-24 sm:w-24"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-center text-[11px] text-slate-400 sm:h-24 sm:w-24">
                      Tanpa gambar
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-sm font-bold leading-snug text-ink sm:text-base">{item.name}</h2>
                    {(item.variationName || item.sku) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {item.variationName && <span className="font-semibold text-slate-700">{item.variationName}</span>}
                        {item.variationName && item.sku && <br className="sm:hidden" />}
                        {item.variationName && item.sku && <span className="hidden sm:inline"> · </span>}
                        {item.sku && <>SKU {item.sku}</>}
                      </p>
                    )}
                    <p className="mt-1.5 text-sm font-extrabold text-ink">{money(item.price)}</p>

                    <div className="mt-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center rounded-xl border border-slate-300">
                        <button
                          type="button"
                          onClick={() => {
                            updateCartQuantity(item.id, item.quantity - 1);
                            refreshCart();
                          }}
                          disabled={item.quantity <= 1}
                          aria-label="Kurangi jumlah"
                          className="h-10 w-10 text-lg disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateCartQuantity(item.id, item.quantity + 1);
                            refreshCart();
                          }}
                          disabled={item.quantity >= item.stock}
                          aria-label="Tambah jumlah"
                          className="h-10 w-10 text-lg disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          removeFromCart(item.id);
                          refreshCart();
                        }}
                        className="h-10 rounded-lg px-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-surface p-5 sm:p-6">
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
                className="mt-5 block rounded-xl bg-brand-500 px-5 py-4 text-center font-bold text-white hover:bg-brand-600"
              >
                Lanjut ke Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}