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
      className="relative flex items-center gap-1 transition-colors hover:text-brand-500"
    >
      Keranjang
      {count > 0 && (
        <span className="rounded-full bg-brand-accent px-2 py-0.5 text-xs font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
