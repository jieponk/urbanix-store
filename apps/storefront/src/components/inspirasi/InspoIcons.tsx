/**
 * Ikon untuk Inspirasi & Berita — semuanya dari Tabler Icons (lihat components/TablerIcon.tsx).
 * Warna ikut teks (currentColor). Animasi halus ada di globals.css (kelas `ico-*`), aktif saat induk `group` di-hover.
 */
import TablerIcon, { type TablerName } from '@/components/TablerIcon';

type P = { size?: number; className?: string };

const make =
  (name: TablerName, defaultSize: number, extra = '', stroke = 2) =>
  ({ size = defaultSize, className = '' }: P) => (
    <TablerIcon name={name} size={size} stroke={stroke} className={`shrink-0 ${extra} ${className}`.trim()} />
  );

export const ArrowRight = make('arrow-right', 18, 'ico-arrow');
export const ArrowLeft = make('arrow-left', 18, 'ico-arrow-l');
export const ChevronRight = make('chevron-right', 14);
export const Calendar = make('calendar', 15);
export const Clock = make('clock', 15, 'ico-clock');
export const Chat = make('message-circle', 15);
export const Pin = make('map-pin', 14, 'ico-pin');
export const Tag = make('tag', 15);
export const Home = make('home', 15);
export const ListIcon = make('list', 16);
export const Newspaper = make('news', 18);
export const Globe = make('world', 14);
export const Sparkle = make('sparkles', 16, 'ico-sparkle');
export const Ticket = make('ticket', 18);
export const Camera = make('camera', 18);
export const CheckCircle = make('circle-check', 18);
export const AiSpark = make('sparkles', 18, 'ico-sparkle');
export const Quote = make('quote', 18);
export const External = make('external-link', 16, 'ico-ext');
export const XIcon = make('x', 16, 'ico-x', 2.5);

/** Centang: garisnya "tergambar" saat muncul (kelas ico-draw). */
export const Check = ({ size = 16, className = '' }: P) => (
  <TablerIcon name="check" size={size} stroke={2.5} pathLength={1} className={`ico-draw shrink-0 ${className}`} />
);

export const ShieldCheck = make('shield-check', 16);

const Grid = make('layout-grid', 16);
const Bulb = make('bulb', 16);
const Bag = make('shopping-bag', 16);
const Star = make('star', 16);

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
