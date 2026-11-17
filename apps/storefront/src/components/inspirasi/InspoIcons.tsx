/**
 * Ikon SVG untuk Inspirasi & Berita.
 * Semua memakai stroke `currentColor`, jadi ikut warna teks (mode terang/gelap).
 * Animasi halus ada di globals.css (kelas `ico-*`), aktif saat elemen induk punya kelas `group` di-hover.
 */
type P = { size?: number; className?: string };

const base = (size = 18, className = '') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: `shrink-0 ${className}`,
});

/** Panah kanan: batang + kepala, kepala "meluncur" saat di-hover. */
export const ArrowRight = ({ size, className }: P) => (
  <svg {...base(size, `ico-arrow ${className ?? ''}`)}>
    <path className="ico-arrow-line" d="M4 12h15" />
    <path className="ico-arrow-head" d="m13 6 6 6-6 6" />
  </svg>
);

export const ArrowLeft = ({ size, className }: P) => (
  <svg {...base(size, `ico-arrow-l ${className ?? ''}`)}>
    <path d="M20 12H5" />
    <path d="m11 6-6 6 6 6" />
  </svg>
);

export const ChevronRight = ({ size = 14, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const Calendar = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);

/** Jam dengan jarum yang berputar pelan saat hover. */
export const Clock = ({ size = 15, className }: P) => (
  <svg {...base(size, `ico-clock ${className ?? ''}`)}>
    <circle cx="12" cy="12" r="8.5" />
    <path className="ico-clock-hand" d="M12 7.5V12l3 2" />
  </svg>
);

export const Chat = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 20.5l1-4.4A8.5 8.5 0 1 1 20.5 12z" />
  </svg>
);

export const Pin = ({ size = 14, className }: P) => (
  <svg {...base(size, `ico-pin ${className ?? ''}`)}>
    <path d="M9 3h6l-1 6 3.5 3.5v1.5h-11v-1.5L10 9z" />
    <path d="M12 14v7" />
  </svg>
);

export const Tag = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1a2 2 0 0 1 1.4.6l6.4 6.4a2 2 0 0 1 0 2.8l-7 7a2 2 0 0 1-2.8 0l-6.5-6.3a2 2 0 0 1-.6-1.4z" />
    <circle cx="8.5" cy="8.5" r="1.5" />
  </svg>
);

export const Home = ({ size = 15, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m3.5 11 8.5-7 8.5 7" />
    <path d="M6 9.5V20h12V9.5" />
  </svg>
);

export const ListIcon = ({ size = 16, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </svg>
);

export const Newspaper = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 5.5h12.5v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z" />
    <path d="M16.5 9h3.5v9.5a2 2 0 0 1-4 0" />
    <path d="M7.5 9h5.5M7.5 12.5h5.5M7.5 16h3.5" />
  </svg>
);

export const Globe = ({ size = 14, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z" />
  </svg>
);

/** Bintang kecil berkelip, untuk aksen "Sorotan". */
export const Sparkle = ({ size = 16, className }: P) => (
  <svg {...base(size, `ico-sparkle ${className ?? ''}`)}>
    <path d="M12 3.5 13.9 10 20.5 12l-6.6 2L12 20.5 10.1 14 3.5 12l6.6-2z" fill="currentColor" stroke="none" />
  </svg>
);

/* ---------- Ikon kategori ---------- */

const Bulb = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
  </svg>
);

const Bag = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M5 8h14l-1 12.5H6z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

const Star = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />
  </svg>
);

const Ticket = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M3.5 8a1.5 1.5 0 0 0 1.5-1.5V6h14v.5a1.5 1.5 0 0 0 1.5 1.5v2a2 2 0 0 0 0 4v2a1.5 1.5 0 0 0-1.5 1.5v.5H5v-.5A1.5 1.5 0 0 0 3.5 16v-2a2 2 0 0 0 0-4z" />
    <path d="M10 9.5v1M10 13.5v1" />
  </svg>
);

const Camera = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M4 8.5A2 2 0 0 1 6 6.5h1.8l1.4-2h5.6l1.4 2H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

const Grid = ({ size, className }: P) => (
  <svg {...base(size, className)}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);

/** Ikon untuk kategori artikel berdasarkan slug-nya ("" = Semua). */
export function CategoryIcon({ slug, size = 16, className = '' }: { slug?: string; size?: number; className?: string }) {
  const s = slug || '';
  const cls = `ico-cat ${className}`;
  if (!s) return <Grid size={size} className={cls} />;
  if (/tips|tutorial|belajar/.test(s)) return <Bulb size={size} className={cls} />;
  if (/panduan|beli|rekomendasi/.test(s)) return <Bag size={size} className={cls} />;
  if (/review|ulas|banding/.test(s)) return <Star size={size} className={cls} />;
  if (/promo|event|diskon/.test(s)) return <Ticket size={size} className={cls} />;
  if (/berita|news/.test(s)) return <Newspaper size={size} className={cls} />;
  return <Camera size={size} className={cls} />;
}


export const CheckCircle = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.3 2.3 4.7-4.9" />
  </svg>
);

/** Ikon AI: kilau dua bintang, berkelip pelan. */
export const AiSpark = ({ size = 18, className }: P) => (
  <svg {...base(size, `ico-sparkle ${className ?? ''}`)}>
    <path d="M10 3.5 11.6 8.4 16.5 10l-4.9 1.6L10 16.5 8.4 11.6 3.5 10l4.9-1.6z" />
    <path d="M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </svg>
);

export const Quote = ({ size = 18, className }: P) => (
  <svg {...base(size, className)}>
    <path d="M9.5 7.5H6a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 6 13.5h3.5V16a3 3 0 0 1-3 3M19.5 7.5H16a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 1.5 1.5h3.5V16a3 3 0 0 1-3 3" />
  </svg>
);

export const External = ({ size = 16, className }: P) => (
  <svg {...base(size, `ico-ext ${className ?? ''}`)}>
    <path d="M14 4.5h5.5V10" />
    <path d="M19.5 4.5 11 13" />
    <path d="M17 13.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18V8.5A1.5 1.5 0 0 1 6 7h4.5" />
  </svg>
);
