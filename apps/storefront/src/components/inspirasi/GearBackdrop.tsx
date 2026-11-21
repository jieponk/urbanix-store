import { UrbanixMark } from '@/components/BrandSvg';

/**
 * Aksen latar dekoratif untuk kepala halaman (Inspirasi, Berita, artikel):
 * logo "U" Urbanix bergaris besar + siluet gear (kamera, lensa, mic, drone, dll.) + pola titik halus.
 * Monokrom & samar (ikut warna teks), jadi rapi di mode terang maupun gelap. Tidak bisa diklik.
 */
const GEAR: { d: string; x: number; y: number; s: number; r: number; delay: number }[] = [
  // kamera
  { d: 'M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 16.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', x: 6, y: 18, s: 64, r: -12, delay: 0 },
  // lensa
  { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', x: 28, y: 62, s: 54, r: 0, delay: 1.2 },
  // mic
  { d: 'M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7', x: 47, y: 14, s: 52, r: 10, delay: 2.1 },
  // drone
  { d: 'M9 10h6v4H9zM9 12H5M15 12h4M5 9.5a2.5 1 0 1 0 0 .01M19 9.5a2.5 1 0 1 0 0 .01M5 12V9.5M19 12V9.5M10 14l-1.5 3M14 14l1.5 3', x: 64, y: 58, s: 60, r: -6, delay: 0.6 },
  // tripod
  { d: 'M8 3h8v4H8zM12 7v5M12 12l-6 9M12 12l6 9M12 12v9', x: 82, y: 22, s: 50, r: 6, delay: 1.7 },
  // kartu memori
  { d: 'M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 3v4M11.5 3v4M14 3v3', x: 90, y: 66, s: 44, r: -14, delay: 2.6 },
  // aperture
  { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM14.3 3.3 9 12.5M20.6 9.5H9.9M18.3 18.4 13 9.2M9.7 20.7 15 11.5M3.4 14.5h10.7M5.7 5.6 11 14.8', x: 38, y: 34, s: 40, r: 0, delay: 3.1 },
];

export default function GearBackdrop({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      {/* pola titik halus, memudar ke kiri */}
      <div className="gear-dots absolute inset-y-0 right-0 w-full sm:w-3/4" />
      {/* logo U besar bergaris */}
      <UrbanixMark className="absolute -right-10 top-1/2 h-[120%] w-auto -translate-y-1/2 text-ink opacity-[0.05] sm:right-4 sm:h-[135%]" />
      {/* siluet gear melayang pelan */}
      <div className="absolute inset-y-0 right-0 hidden w-[58%] sm:block">
        {GEAR.map((g, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            width={g.s}
            height={g.s}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="gear-float absolute text-ink opacity-[0.11]"
            style={{ left: `${g.x}%`, top: `${g.y}%`, rotate: `${g.r}deg`, animationDelay: `${g.delay}s` }}
          >
            <path d={g.d} />
          </svg>
        ))}
      </div>
    </div>
  );
}
