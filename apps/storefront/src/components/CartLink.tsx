'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getCart } from '@/lib/cart';
import { loadMotion, prefersReducedMotion } from '@/lib/motion';
import { iconBtn, slideLabel } from '@/components/headerLabel';

export default function CartLink() {
  const [count, setCount] = useState(0);
  const icon = useRef<SVGSVGElement | null>(null);

  // Ikon berdenyut sekali setiap produk ditambahkan ke keranjang.
  useEffect(() => {
    const pulse = () => {
      const el = icon.current;
      if (!el || prefersReducedMotion()) return;
      loadMotion()
        .then(({ animate }) => {
          animate(el, { scale: [1, 1.28, 1] }, { duration: 0.45, ease: 'easeInOut' }).then(() => {
            el.style.transform = '';
          });
        })
        .catch(() => {});
    };
    window.addEventListener('cart-added', pulse);
    return () => window.removeEventListener('cart-added', pulse);
  }, []);

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
      title="Keranjang"
      className={iconBtn}
    >
      <svg ref={icon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17" cy="20" r="1.3" />
      </svg>
      <span className={slideLabel}>Keranjang</span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ring-2 ring-surface">
          {count}
        </span>
      )}
    </Link>
  );
}
