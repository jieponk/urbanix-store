'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type BannerSlide = {
  src: string;
  alt: string;
  href?: string;
};

const INTERVAL_MS = 5000;

export default function BannerSlider({ slides }: { slides: BannerSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (count < 2 || paused) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      INTERVAL_MS
    );

    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div
      className="relative h-full overflow-hidden rounded-[28px] bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Banner promo"
    >
      <div className="relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-full lg:min-h-[360px]">
        {slides.map((slide, i) => {
          const image = (
            <img
              src={slide.src}
              alt={slide.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              className="h-full w-full object-cover"
            />
          );

          return (
            <div
              key={slide.src}
              aria-hidden={i !== index}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              {slide.href ? (
                <Link
                  href={slide.href}
                  tabIndex={i === index ? 0 : -1}
                  className="block h-full w-full"
                >
                  {image}
                </Link>
              ) : (
                image
              )}
            </div>
          );
        })}
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

          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Tampilkan banner ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-surface' : 'w-2 bg-surface/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
