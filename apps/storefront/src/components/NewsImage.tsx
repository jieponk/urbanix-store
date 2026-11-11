'use client';

import { useState } from 'react';

/**
 * Gambar sampul berita langsung dari situs sumber (tidak disalin ke server kita).
 * Kalau gambar tidak ada atau gagal dimuat, tampil ilustrasi kamera.
 */
export default function NewsImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-cobalt-800 to-cobalt-900 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/categories/kamera.svg" alt="" className="h-3/5 w-3/5 object-contain opacity-90" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`bg-mist object-cover ${className}`}
    />
  );
}
