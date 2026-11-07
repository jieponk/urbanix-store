'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/cart';

export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () =>
      setCount(getCart().reduce((total, item) => total + item.quantity, 0));

    update();
    window.addEventListener('cart-updated', update);
    window.addEventListener('storage', update);

    return () => {
      window.removeEventListener('cart-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Keranjang, ${count} barang` : 'Keranjang'}
      className="relative flex h-10 items-center gap-2 rounded-full px-2.5 text-sm font-semibold text-ink transition hover:bg-mist sm:px-3"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className="hidden sm:inline">Keranjang</span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white sm:static sm:h-auto sm:py-0.5">
          {count}
        </span>
      )}
    </Link>
  );
}
