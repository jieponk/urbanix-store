import type { EventKey } from '@/lib/events';

/**
 * Tampilan tiap event (hanya warna palet toko). Tiap event punya karakter sendiri:
 * - harbolnas : merah penuh (paling meriah, setahun sekali)
 * - kembar    : hitam + aksen merah (klasik flash sale)
 * - gajian    : terang/bersih, mengikuti mode terang-gelap (hitam di atas putih keabuan)
 * - tengah    : abu arang + teks aksen merah muda
 */
export type EventTheme = {
  label: string;
  ribbon: string; // latar & teks pita atas
  ribbonBadge: string; // lencana angka di pita
  ribbonMuted: string;
  hero: string; // panel banner beranda
  heroBig: string; // angka besar samar
  heroChip: string; // chip "EVENT TERBATAS"
  heroSub: string;
  heroCta: string;
  countdown: 'dark' | 'light';
  card: string; // label kecil di kartu produk
};

export const EVENT_THEMES: Record<EventKey, EventTheme> = {
  harbolnas: {
    label: 'Merah meriah',
    ribbon: 'bg-sale-700 text-white',
    ribbonBadge: 'bg-white text-sale-700',
    ribbonMuted: 'text-white/80',
    hero: 'bg-sale-600 text-white',
    heroBig: 'text-sale-700',
    heroChip: 'bg-white text-sale-700',
    heroSub: 'text-white/85',
    heroCta: 'bg-white text-sale-700 hover:bg-white/90',
    countdown: 'dark',
    card: 'bg-sale-700 text-white',
  },
  kembar: {
    label: 'Hitam klasik',
    ribbon: 'bg-cobalt-900 text-white',
    ribbonBadge: 'bg-sale-600 text-white',
    ribbonMuted: 'text-white/75',
    hero: 'bg-cobalt-900 text-white',
    heroBig: 'text-cobalt-700',
    heroChip: 'bg-white text-cobalt-900',
    heroSub: 'text-white/75',
    heroCta: 'bg-white text-cobalt-900 hover:bg-white/85',
    countdown: 'dark',
    card: 'bg-cobalt-900 text-white',
  },
  gajian: {
    label: 'Terang bersih',
    ribbon: 'bg-mist text-ink border-b border-slate-200',
    ribbonBadge: 'bg-ink text-surface',
    ribbonMuted: 'text-slate-500',
    hero: 'bg-surface text-ink ring-1 ring-slate-200',
    heroBig: 'text-slate-100',
    heroChip: 'bg-sale-50 text-sale-700',
    heroSub: 'text-slate-600',
    heroCta: 'bg-ink text-surface hover:opacity-90',
    countdown: 'light',
    card: 'bg-ink text-surface',
  },
  tengah: {
    label: 'Abu arang',
    ribbon: 'bg-cobalt-800 text-white',
    ribbonBadge: 'bg-white text-cobalt-900',
    ribbonMuted: 'text-sun-300',
    hero: 'bg-cobalt-800 text-white',
    heroBig: 'text-cobalt-700',
    heroChip: 'bg-cobalt-700 text-sun-300',
    heroSub: 'text-white/75',
    heroCta: 'bg-white text-cobalt-900 hover:bg-white/85',
    countdown: 'dark',
    card: 'bg-cobalt-800 text-white',
  },
};

export const themeFor = (key: EventKey) => EVENT_THEMES[key] ?? EVENT_THEMES.kembar;
