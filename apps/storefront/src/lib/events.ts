/**
 * Kalender "Mode Event" otomatis (waktu WIB), seperti marketplace:
 * - Tanggal kembar  : 1.1, 2.2, … 11.11 (sehari penuh)
 * - Harbolnas 12.12 : 12 Desember (sehari penuh, prioritas tertinggi)
 * - Payday tengah bulan : tanggal 15–16
 * - Gajian Sale (payday akhir bulan) : tanggal 25–28
 *
 * Tampilan (pita header, banner event, label kartu produk) ikut berubah otomatis selama event berjalan.
 * Diskonnya sendiri tetap diatur di Seller Center → Promo; mode event hanya "panggung"-nya.
 * Ganti nama/tanggal di EVENT_RULES. Matikan seluruhnya dengan EVENTS_ENABLED = false.
 */

export const EVENTS_ENABLED = true;
/** Berapa hari sebelum event, pita "segera hadir" mulai tampil. */
export const TEASER_DAYS = 3;

export type EventKey = 'kembar' | 'harbolnas' | 'tengah' | 'gajian';

export type ShopEvent = {
  key: EventKey;
  /** Teks besar & label kartu, mis. "12.12", "25", "15". */
  big: string;
  title: string;
  sub: string;
  startsAt: string; // ISO (UTC)
  endsAt: string; // ISO (UTC)
  /** Teks tombol banner (opsional, dari Dekor toko). */
  cta?: string;
};

type Rule = {
  key: EventKey;
  priority: number;
  /** Hari-hari dalam bulan (WIB) saat event berlangsung; kosong = bukan bulan ini. */
  days: (year: number, month: number) => number[];
  big: (month: number, day: number) => string;
  title: (month: number, day: number) => string;
  sub: string;
};

export const EVENT_RULES: Rule[] = [
  {
    key: 'harbolnas',
    priority: 4,
    days: (_y, m) => (m === 12 ? [12] : []),
    big: () => '12.12',
    title: () => 'Harbolnas 12.12',
    sub: 'Hari Belanja Online Nasional, puncak promo akhir tahun',
  },
  {
    key: 'kembar',
    priority: 3,
    days: (_y, m) => (m <= 11 ? [m] : []),
    big: (m) => `${m}.${m}`,
    title: (m) => `Sale ${m}.${m}`,
    sub: 'Tanggal kembar, harga spesial cuma sehari',
  },
  {
    key: 'gajian',
    priority: 2,
    days: () => [25, 26, 27, 28],
    big: () => '25',
    title: () => 'Gajian Sale',
    sub: 'Gajian datang, waktunya upgrade gear',
  },
  {
    key: 'tengah',
    priority: 1,
    days: () => [15, 16],
    big: () => '15',
    title: () => 'Payday Tengah Bulan',
    sub: 'Promo pertengahan bulan untuk gear kreator',
  },
];

const WIB_OFFSET_MS = 7 * 3600 * 1000; // WIB tidak punya jam musim panas

/** Tanggal (tahun, bulan 1–12, hari) menurut WIB. */
function wibParts(date: Date) {
  const d = new Date(date.getTime() + WIB_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/** Waktu UTC untuk pukul 00:00 WIB pada tanggal tsb. */
function wibMidnight(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d) - WIB_OFFSET_MS);
}

/** Pecah hari-hari jadi rentang berurutan (mis. [25,26,27,28] → satu rentang). */
function ranges(days: number[]) {
  const out: [number, number][] = [];
  for (const day of [...days].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last[1] === day - 1) last[1] = day;
    else out.push([day, day]);
  }
  return out;
}

function monthEvents(y: number, m: number): (ShopEvent & { priority: number })[] {
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out: (ShopEvent & { priority: number })[] = [];
  for (const rule of EVENT_RULES) {
    const days = rule.days(y, m).filter((d) => d >= 1 && d <= daysInMonth);
    for (const [from, to] of ranges(days)) {
      out.push({
        key: rule.key,
        priority: rule.priority,
        big: rule.big(m, from),
        title: rule.title(m, from),
        sub: rule.sub,
        startsAt: wibMidnight(y, m, from).toISOString(),
        endsAt: new Date(wibMidnight(y, m, to).getTime() + 24 * 3600 * 1000 - 1000).toISOString(),
      });
    }
  }
  return out;
}

/** Event yang sedang berjalan (prioritas tertinggi bila bentrok), atau null. */
export function currentEvent(now: Date = new Date()): ShopEvent | null {
  if (!EVENTS_ENABLED) return null;
  const { y, m } = wibParts(now);
  const t = now.getTime();
  const running = monthEvents(y, m)
    .filter((e) => Date.parse(e.startsAt) <= t && t <= Date.parse(e.endsAt))
    .sort((a, b) => b.priority - a.priority);
  if (!running[0]) return null;
  const { priority: _p, ...event } = running[0];
  return event;
}

/** Event berikutnya dalam TEASER_DAYS hari (untuk pita "segera hadir"), atau null. */
export function upcomingEvent(now: Date = new Date(), withinDays = TEASER_DAYS): ShopEvent | null {
  if (!EVENTS_ENABLED || currentEvent(now)) return null;
  const { y, m } = wibParts(now);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const t = now.getTime();
  const limit = t + withinDays * 24 * 3600 * 1000;
  const soon = [...monthEvents(y, m), ...monthEvents(next.y, next.m)]
    .filter((e) => Date.parse(e.startsAt) > t && Date.parse(e.startsAt) <= limit)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || b.priority - a.priority);
  if (!soon[0]) return null;
  const { priority: _p, ...event } = soon[0];
  return event;
}

/** Sisa hari (dibulatkan ke atas) sampai event mulai. */
export function daysUntil(event: ShopEvent, now: Date = new Date()) {
  return Math.max(1, Math.ceil((Date.parse(event.startsAt) - now.getTime()) / (24 * 3600 * 1000)));
}

/* ---------------- Dekor toko (diatur di Seller Center → Dekor toko) ---------------- */

export const EVENT_KEYS: EventKey[] = ['kembar', 'harbolnas', 'tengah', 'gajian'];

export type EventConfig = {
  mode: 'auto' | 'off' | 'force';
  theme: EventKey | null;
  until: string | null;
  teaser_days: number;
  /** Teks pengganti untuk banner event (opsional, dari Dekor toko). */
  title?: string | null;
  subtitle?: string | null;
  cta?: string | null;
};

export const DEFAULT_EVENT_CONFIG: EventConfig = { mode: 'auto', theme: null, until: null, teaser_days: TEASER_DAYS };

/** Event untuk tema yang dipilih manual: berlaku dari awal hari ini (WIB) sampai `until` atau akhir hari ini. */
export function themeEvent(key: EventKey, now: Date = new Date(), until: string | null = null): ShopEvent {
  const rule = EVENT_RULES.find((r) => r.key === key) ?? EVENT_RULES[0];
  const { y, m, d } = wibParts(now);
  const ruleDays = rule.days(y, m);
  const day = ruleDays[0] ?? d;
  const start = wibMidnight(y, m, d);
  const endOfToday = new Date(start.getTime() + 24 * 3600 * 1000 - 1000);
  const end = until && Date.parse(until) > now.getTime() ? new Date(until) : endOfToday;
  return {
    key,
    big: key === 'kembar' ? rule.big(m, m) : rule.big(m, day),
    title: key === 'kembar' ? rule.title(m, m) : rule.title(m, day),
    sub: rule.sub,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

export type EventState = { event: ShopEvent | null; upcoming: ShopEvent | null; preview: EventKey | null };

/** Gabungkan kalender otomatis + pengaturan Dekor toko + pratinjau (cookie, hanya untuk perangkat penjual). */
export function resolveEvent(config: EventConfig, preview: EventKey | null, now: Date = new Date()): EventState {
  if (preview && EVENT_KEYS.includes(preview)) return { event: themeEvent(preview, now), upcoming: null, preview };
  if (!EVENTS_ENABLED || config.mode === 'off') return { event: null, upcoming: null, preview: null };
  const forced =
    config.mode === 'force' && config.theme && (!config.until || Date.parse(config.until) > now.getTime());
  if (forced) return { event: themeEvent(config.theme as EventKey, now, config.until), upcoming: null, preview: null };
  const event = currentEvent(now);
  const upcoming = event || config.teaser_days <= 0 ? null : upcomingEvent(now, config.teaser_days);
  return { event, upcoming, preview: null };
}

/** Jadwal event otomatis mulai hari ini sampai `months` bulan ke depan (untuk Seller Center). */
export function upcomingSchedule(now: Date = new Date(), months = 2): ShopEvent[] {
  let { y, m } = wibParts(now);
  const out: ShopEvent[] = [];
  for (let i = 0; i <= months; i++) {
    const evs = monthEvents(y, m)
      .filter((e) => Date.parse(e.endsAt) >= now.getTime())
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || b.priority - a.priority);
    for (const { priority: _p, ...e } of evs) {
      // tanggal yang bentrok: hanya event berprioritas tertinggi yang tampil
      if (!out.some((o) => o.startsAt === e.startsAt)) out.push(e);
    }
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
