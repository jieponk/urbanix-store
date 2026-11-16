'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export type BannerSlide = {
  src: string;
  alt: string;
  href?: string;
  /** Gambar khusus HP (opsional, dari Seller Center). */
  mobileSrc?: string;
  /** Versi ukuran kecil (srcset) agar HP tidak mengunduh gambar 1600 px. */
  srcSet?: string;
};

const INTERVAL_MS = 5500;
const SWIPE_PX = 40;

export default function BannerSlider({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  // Geser otomatis hanya bila >1 banner & pengguna tidak mematikan animasi.
  useEffect(() => {
    setAutoplay(count > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [count]);

  if (count === 0) return null;

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div
      className="relative h-full overflow-hidden rounded-[28px] bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? index + 1 : index - 1);
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Banner promo"
    >
      <div className="relative aspect-[16/9] overflow-hidden sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[360px]">
        <div
          className="flex h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => {
            const image = (
              <picture>
                {slide.mobileSrc && <source media="(max-width: 639px)" srcSet={slide.mobileSrc} />}
                <img
                  src={slide.src}
                  srcSet={slide.srcSet}
                  sizes={slide.srcSet ? '(max-width: 1024px) 100vw, 64vw' : undefined}
                  width={1600}
                  height={686}
                  alt={slide.alt}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  // Banner pertama = gambar LCP: minta browser mengunduhnya paling dulu.
                  {...(i === 0 ? { fetchpriority: 'high' } : {})}
                  decoding={i === 0 ? 'sync' : 'async'}
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              </picture>
            );

            return (
              <div
                key={slide.src}
                aria-hidden={i !== index}
                aria-roledescription="slide"
                aria-label={`${i + 1} dari ${count}`}
                className={`h-full w-full shrink-0 ${i === index ? '' : 'pointer-events-none'}`}
              >
                {slide.href ? (
                  <Link href={slide.href} tabIndex={i === index ? 0 : -1} className="block h-full w-full">
                    {image}
                  </Link>
                ) : (
                  image
                )}
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Banner sebelumnya"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 sm:left-3 sm:h-10 sm:w-10"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Banner berikutnya"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 sm:right-3 sm:h-10 sm:w-10"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>

          <div className="absolute inset-x-0 bottom-1 flex justify-center">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Tampilkan banner ${i + 1}`}
                aria-current={i === index}
                className="flex h-7 min-w-[28px] items-center justify-center px-1"
              >
                {i === index ? (
                  <span className="relative block h-2 w-8 overflow-hidden rounded-full bg-surface/50">
                    <span
                      key={`${index}-${autoplay}`}
                      className={`absolute inset-y-0 left-0 rounded-full bg-surface ${autoplay ? 'banner-progress' : 'w-full'}`}
                      style={autoplay ? { animationDuration: `${INTERVAL_MS}ms`, animationPlayState: paused ? 'paused' : 'running' } : undefined}
                      onAnimationEnd={() => go(index + 1)}
                    />
                  </span>
                ) : (
                  <span className="block h-2 w-2 rounded-full bg-surface/50 transition-all" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
