'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { loadMotion, prefersReducedMotion } from '@/lib/motion';

const STAGGER = 0.06; // detik antar kartu yang muncul bersamaan
const OFFSET = 16; // px, naik sedikit

/**
 * Grid kartu yang anaknya muncul pelan (fade + naik sedikit) saat di-scroll, berurutan.
 * - Kartu yang sudah terlihat saat halaman dibuka tidak disembunyikan (tidak ada kedip, LCP aman).
 * - Tanpa JavaScript atau dengan prefers-reduced-motion: kartu tampil biasa tanpa animasi.
 */
export default function RevealGrid({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = ref.current;
    if (!grid || prefersReducedMotion()) return;

    let cancelled = false;
    let stopObserving: (() => void) | undefined;

    loadMotion().then(({ animate, inView }) => {
      if (cancelled) return;

      const hidden = Array.from(grid.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.getBoundingClientRect().top > window.innerHeight
      );
      if (hidden.length === 0) return;

      for (const el of hidden) {
        el.style.opacity = '0';
        el.style.transform = `translateY(${OFFSET}px)`;
      }

      // Kartu yang masuk layar pada frame yang sama diberi jeda berurutan.
      let batch: HTMLElement[] = [];
      let frame = 0;
      const flush = () => {
        frame = 0;
        batch.forEach((el, i) => {
          animate(
            el,
            { opacity: [0, 1], y: [OFFSET, 0] },
            { duration: 0.45, delay: i * STAGGER, ease: [0.22, 1, 0.36, 1] }
          ).then(() => {
            // Kembalikan ke gaya asli supaya efek hover kartu (translate) tetap jalan.
            el.style.opacity = '';
            el.style.transform = '';
          });
        });
        batch = [];
      };

      stopObserving = inView(
        hidden,
        (el) => {
          batch.push(el as HTMLElement);
          if (!frame) frame = requestAnimationFrame(flush);
          // Tanpa fungsi balik: animasi hanya sekali per kartu.
        },
        { margin: '0px 0px -8% 0px' }
      );
    });

    return () => {
      cancelled = true;
      stopObserving?.();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
