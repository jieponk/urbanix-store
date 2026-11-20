import Link from 'next/link';
import { Bolt, Countdown } from '@/components/FlashSale';
import { ArrowRight } from '@/components/inspirasi/InspoIcons';
import { getT } from '@/lib/lang-server';
import { money } from '@/lib/api';
import { daysUntil, type EventKey, type ShopEvent } from '@/lib/events';
import { themeFor } from '@/lib/eventTheme';

/**
 * Pita paling atas saat Mode Event (lihat lib/events.ts):
 * - event berjalan → "[12.12] Harbolnas 12.12 sedang berlangsung · Berakhir dalam 05:12:09 · Lihat semua deal"
 * - event segera   → "[12.12] Harbolnas 12.12 mulai 3 hari lagi · Lihat promo sekarang"
 */
export function EventRibbon({ event, upcoming }: { event: ShopEvent | null; upcoming: ShopEvent | null }) {
  const t = getT();
  const ev = event ?? upcoming;
  if (!ev) return null;
  return (
    <div className={themeFor(ev.key).ribbon}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-xs font-semibold sm:text-[13px]">
        <span className="inline-flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${themeFor(ev.key).ribbonBadge}`}>{ev.big}</span>
          {event ? t('{name} sedang berlangsung', { name: ev.title }) : t('{name} mulai {n} hari lagi', { name: ev.title, n: daysUntil(ev) })}
        </span>
        {event && (
          <span className={`hidden items-center gap-2 sm:inline-flex ${themeFor(ev.key).ribbonMuted}`}>
            {t('Berakhir dalam')} <Countdown endsAt={event.endsAt} tone={themeFor(ev.key).countdown} />
          </span>
        )}
        <Link href="/produk?promo=1" className="underline underline-offset-4 hover:opacity-80">
          {event ? t('Lihat semua deal') : t('Lihat promo sekarang')}
        </Link>
      </div>
    </div>
  );
}

/** Banner event di beranda (hanya saat event berjalan). Angka event besar samar di latar, tombol & hitung mundur. */
export type HeroTile = { id: number; name: string; image: string; price: number };

export function EventHero({
  event,
  maxDiscount,
  promoCount,
  tiles = [],
  minPrice = 0,
  waPercent = 0,
}: {
  event: ShopEvent;
  maxDiscount: number;
  promoCount: number;
  /** 2 produk promo unggulan untuk kotak di kanan banner (PC). */
  tiles?: HeroTile[];
  /** Harga promo termurah ("Mulai dari"). */
  minPrice?: number;
  waPercent?: number;
}) {
  const t = getT();
  const th = themeFor(event.key);
  return (
    <section aria-labelledby="judul-event" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className={`relative isolate flex flex-wrap items-center gap-8 overflow-hidden rounded-3xl px-6 py-8 sm:px-12 sm:py-12 ${th.hero}`}>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -right-4 -top-8 -z-10 select-none text-[9rem] font-extrabold leading-none tracking-[-0.06em] sm:-right-8 ${th.heroBig} sm:-top-14 sm:text-[17rem]`}
        >
          {event.big}
        </span>
        <div className="min-w-0 flex-[1_1_420px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] ${th.heroChip}`}>
          <Bolt size={13} /> {t('EVENT TERBATAS')}
        </span>
        <h2 id="judul-event" className="mt-4 max-w-2xl text-[2.1rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
          {event.title}
        </h2>
        <p className={`mt-3 max-w-xl text-[15px] leading-7 sm:text-lg ${th.heroSub}`}>
          {t(event.sub)}.{' '}
          {maxDiscount > 0
            ? t('{n} produk diskon sampai {p}%, original & bergaransi.', { n: promoCount, p: maxDiscount })
            : t('Kamera, lensa, mic & gear kreator original bergaransi.')}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/produk?promo=1"
            className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-extrabold transition sm:h-[52px] sm:text-base ${th.heroCta}`}
          >
            {event.cta || t('Belanja sekarang')} <ArrowRight size={18} />
          </Link>
          <span className={`inline-flex items-center gap-2 text-sm ${th.heroSub}`}>
            {t('Berakhir dalam')} <Countdown endsAt={event.endsAt} tone={th.countdown} />
          </span>
        </div>
        </div>

        {/* Kotak kanan (PC): 2 produk unggulan + "Mulai dari" + hemat via WhatsApp, seperti mockup */}
        {tiles.length >= 2 && (
          <div className="hidden flex-[0_1_360px] grid-cols-2 gap-3 lg:grid">
            {[tiles[0], 'start', 'wa', tiles[1]].map((tile, i) =>
              typeof tile === 'object' ? (
                <Link key={i} href={`/produk/${tile.id}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-white p-3" title={tile.name}>
                  <img src={tile.image} alt={tile.name} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />
                  <span className="absolute inset-x-2 bottom-2 rounded-lg bg-white/90 px-2 py-1 text-center text-[12px] font-extrabold text-sale-600">
                    {money(tile.price)}
                  </span>
                </Link>
              ) : tile === 'start' ? (
                <Link key={i} href="/produk?promo=1&urut=termurah" className="flex aspect-square flex-col justify-center gap-1 rounded-2xl bg-mist p-4 text-ink">
                  <span className="text-xs font-bold text-slate-500">{t('Mulai dari')}</span>
                  <span className="text-2xl font-extrabold tracking-tight text-sale-600">{money(minPrice)}</span>
                  <span className="text-xs text-slate-500">{t('{n} produk promo', { n: promoCount })}</span>
                </Link>
              ) : (
                waPercent > 0 ? (
                  <a key={i} href="/#cara-pesan" className="flex aspect-square flex-col justify-center gap-1 rounded-2xl bg-white p-4 text-cobalt-900">
                    <span className="text-xs font-bold text-slate-500">{t('Hemat lagi')}</span>
                    <span className="text-2xl font-extrabold tracking-tight">{`${waPercent}%`}</span>
                    <span className="text-xs text-slate-500">{t('Pesan via WhatsApp')}</span>
                  </a>
                ) : (
                  <a key={i} href="/syarat-ketentuan#pembayaran" className="flex aspect-square flex-col justify-center gap-1 rounded-2xl bg-white p-4 text-cobalt-900">
                    <span className="text-xs font-bold text-slate-500">{t('Bayar mudah')}</span>
                    <span className="text-2xl font-extrabold tracking-tight">QRIS</span>
                    <span className="text-xs text-slate-500">{t('VA, e-wallet & kartu')}</span>
                  </a>
                )
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Garis kecil di atas toko saat penjual sedang melihat pratinjau tema (hanya di perangkat itu). */
export function EventPreviewBar({ preview }: { preview: EventKey }) {
  return (
    <div className="bg-amber-100 text-amber-900">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-1.5 text-xs font-semibold">
        <span>Pratinjau tema event: hanya terlihat di perangkat ini (1 jam).</span>
        <a href="/api/pratinjau-event?tema=selesai&ke=seller" className="font-extrabold underline underline-offset-4">
          Selesai pratinjau
        </a>
      </div>
    </div>
  );
}
