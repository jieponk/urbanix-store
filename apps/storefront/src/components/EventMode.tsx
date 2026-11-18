import Link from 'next/link';
import { Bolt, Countdown } from '@/components/FlashSale';
import { ArrowRight } from '@/components/inspirasi/InspoIcons';
import { getT } from '@/lib/lang-server';
import { daysUntil, type ShopEvent } from '@/lib/events';

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
    <div className="bg-cobalt-900 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center text-xs font-semibold sm:text-[13px]">
        <span className="inline-flex items-center gap-2">
          <span className="rounded-full bg-sale-600 px-2 py-0.5 text-[11px] font-extrabold tracking-wide">{ev.big}</span>
          {event ? t('{name} sedang berlangsung', { name: ev.title }) : t('{name} mulai {n} hari lagi', { name: ev.title, n: daysUntil(ev) })}
        </span>
        {event && (
          <span className="hidden items-center gap-2 text-white/75 sm:inline-flex">
            {t('Berakhir dalam')} <Countdown endsAt={event.endsAt} tone="dark" />
          </span>
        )}
        <Link href="/produk?promo=1" className="underline underline-offset-4 hover:text-white/80">
          {event ? t('Lihat semua deal') : t('Lihat promo sekarang')}
        </Link>
      </div>
    </div>
  );
}

/** Banner event di beranda (hanya saat event berjalan). Angka event besar samar di latar, tombol & hitung mundur. */
export function EventHero({ event, maxDiscount, promoCount }: { event: ShopEvent; maxDiscount: number; promoCount: number }) {
  const t = getT();
  return (
    <section aria-labelledby="judul-event" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-3xl bg-cobalt-900 px-6 py-8 text-white sm:px-12 sm:py-12">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-8 -z-10 select-none text-[9rem] font-extrabold leading-none tracking-[-0.06em] text-cobalt-700 sm:-right-8 sm:-top-14 sm:text-[17rem]"
        >
          {event.big}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-cobalt-900">
          <Bolt size={13} /> {t('EVENT TERBATAS')}
        </span>
        <h2 id="judul-event" className="mt-4 max-w-2xl text-[2.1rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
          {event.title}
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/75 sm:text-lg">
          {t(event.sub)}.{' '}
          {maxDiscount > 0
            ? t('{n} produk diskon sampai {p}%, original & bergaransi.', { n: promoCount, p: maxDiscount })
            : t('Kamera, lensa, mic & gear kreator original bergaransi.')}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/produk?promo=1"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-cobalt-900 transition hover:bg-white/85 sm:h-[52px] sm:text-base"
          >
            {t('Belanja sekarang')} <ArrowRight size={18} />
          </Link>
          <span className="inline-flex items-center gap-2 text-sm text-white/75">
            {t('Berakhir dalam')} <Countdown endsAt={event.endsAt} tone="dark" />
          </span>
        </div>
      </div>
    </section>
  );
}
