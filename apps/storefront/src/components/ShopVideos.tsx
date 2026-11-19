'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useT } from '@/components/LangProvider';
import SimpleIcon from '@/components/SimpleIcon';
import TablerIcon from '@/components/TablerIcon';
import type { ShopVideo } from '@/lib/api';
import { money } from '@/lib/money';

const PLATFORM: Record<string, { label: string; icon?: 'youtube' | 'tiktok' | 'instagram' }> = {
  youtube: { label: 'YouTube' },
  tiktok: { label: 'TikTok' },
  instagram: { label: 'Instagram' },
};

/**
 * "Lihat langsung": deretan video vertikal (9:16) + produk di bawahnya. Video baru dimuat saat diketuk
 * (kartu hanya menampilkan sampul) supaya beranda tetap ringan. Diketuk → pemutar layar penuh.
 */
export default function ShopVideos({ videos }: { videos: ShopVideo[] }) {
  const t = useT();
  const [open, setOpen] = useState<ShopVideo | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: { key: string }) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!videos.length) return null;

  return (
    <section aria-labelledby="judul-video" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-cobalt-900 p-4 text-white sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/60">{t('Lihat langsung')}</p>
            <h2 id="judul-video" className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              {t('Video dari tim Urbanix')}
            </h2>
          </div>
        </div>

        <ul className="scroll-row -mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {videos.map((v) => (
            <li key={v.id} className="w-[46%] shrink-0 sm:w-[200px]">
              <button
                type="button"
                onClick={() => setOpen(v)}
                aria-label={t('Putar video: {title}', { title: v.title })}
                className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-cobalt-800 text-left"
              >
                {v.poster ? (
                  <img src={v.poster} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : v.kind === 'file' ? (
                  // Tanpa sampul: tampilkan bingkai awal video (hanya metadata yang diunduh)
                  <video src={`${v.src}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-white/40">
                    <TablerIcon name="video" size={40} stroke={1.5} />
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" aria-hidden="true" />
                <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-cobalt-900 shadow-lg transition group-hover:scale-110">
                  <TablerIcon name="player-play" size={20} filled />
                </span>
                {PLATFORM[v.kind] && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold">{PLATFORM[v.kind].label}</span>
                )}
                <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-[13px] font-bold leading-snug">{v.title}</span>
              </button>
              {v.products[0] && (
                <Link
                  href={`/produk/${v.products[0].id}`}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-white/10 p-1.5 pr-2 transition hover:bg-white/15"
                >
                  {v.products[0].image ? (
                    <img src={v.products[0].image} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-white/20" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] text-white/75">{v.products[0].name.replace(/^URBANIX\s*-\s*/i, '')}</span>
                    <span className="block text-[13px] font-extrabold">{money(Number(v.products[0].price))}</span>
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={open.title}>
          <button type="button" aria-label={t('Tutup video')} onClick={() => setOpen(null)} className="absolute inset-0" />
          <div className="relative flex max-h-full w-full max-w-[420px] flex-col gap-3">
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label={t('Tutup video')}
              className="absolute -top-1 right-0 z-10 flex h-10 w-10 -translate-y-full items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <TablerIcon name="x" size={20} />
            </button>
            <div className="relative aspect-[9/16] max-h-[78vh] w-full overflow-hidden rounded-2xl bg-black">
              {open.kind === 'file' ? (
                <video src={open.src} poster={open.poster || undefined} controls autoPlay playsInline className="h-full w-full object-contain" />
              ) : open.kind === 'link' ? (
                <a href={open.src} target="_blank" rel="noopener noreferrer" className="flex h-full w-full items-center justify-center text-sm font-bold text-white underline">
                  {t('Buka video')}
                </a>
              ) : (
                <iframe
                  src={open.src}
                  title={open.title}
                  className="h-full w-full"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              )}
            </div>
            {open.products.length > 0 && (
              <div className="relative flex gap-2 overflow-x-auto">
                {open.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/produk/${p.id}`}
                    onClick={() => setOpen(null)}
                    className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white p-2 text-cobalt-900"
                  >
                    {p.image && <img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" />}
                    <span className="min-w-0">
                      <span className="block truncate text-xs">{p.name.replace(/^URBANIX\s*-\s*/i, '')}</span>
                      <span className="block text-sm font-extrabold text-sale-600">{money(Number(p.price))}</span>
                    </span>
                    <TablerIcon name="chevron-right" size={16} className="ml-auto shrink-0" />
                  </Link>
                ))}
              </div>
            )}
            {open.link && open.kind !== 'file' && PLATFORM[open.kind] && (
              <a href={open.link} target="_blank" rel="noopener noreferrer" className="relative inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white/75 hover:text-white">
                {open.kind !== 'link' && <SimpleIconFor kind={open.kind} />}
                {t('Lihat di {p}', { p: PLATFORM[open.kind].label })}
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function SimpleIconFor({ kind }: { kind: string }) {
  if (kind === 'youtube' || kind === 'tiktok' || kind === 'instagram') {
    return <SimpleIcon name={kind} color="current" size={14} />;
  }
  return null;
}
