'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  images: string[];
  alt: string;
  /** Gambar yang harus ditampilkan (misalnya gambar varian yang dipilih). */
  focusImage?: string | null;
  badge?: string;
};

/** Galeri foto produk: gambar besar, geser kiri/kanan (juga swipe di HP), dan thumbnail. */
export default function ProductGallery({ images, alt, focusImage, badge }: Props) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const thumbs = useRef<HTMLDivElement | null>(null);
  const count = images.length;

  useEffect(() => {
    if (!focusImage) return;
    const i = images.indexOf(focusImage);
    if (i >= 0) setIndex(i);
  }, [focusImage, images]);

  useEffect(() => {
    const el = thumbs.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index]);

  function go(step: number) {
    if (count < 2) return;
    setIndex((i) => (i + step + count) % count);
  }

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-400">Gambar produk tidak tersedia</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div
        className="relative flex aspect-square select-none items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <img
          key={images[index]}
          src={images[index]}
          alt={`${alt} - gambar ${index + 1}`}
          className="h-full w-full object-contain"
        />

        {badge && (
          <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-extrabold text-white shadow">
            {badge}
          </span>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Gambar sebelumnya"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-700 shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Gambar berikutnya"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-700 shadow hover:bg-white"
            >
              ›
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-0.5 text-xs font-semibold text-white">
              {index + 1}/{count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div ref={thumbs} className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Lihat gambar ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-1 transition sm:h-20 sm:w-20 ${
                i === index ? 'border-orange-600' : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
