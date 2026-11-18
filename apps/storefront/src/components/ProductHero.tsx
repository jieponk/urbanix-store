'use client';

import { FlashSaleStrip } from '@/components/FlashSale';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import ProductBuyButtons from '@/components/ProductBuyButtons';
import { siteConfig } from '@/lib/siteConfig';
import ProductGallery from '@/components/ProductGallery';
import { VoucherStrip } from '@/components/VoucherCard';
import { ChevronRight, Ticket } from '@/components/inspirasi/InspoIcons';
import type { Product, Variation } from '@/lib/api';
import { money, weightText } from '@/lib/money';
import type { VoucherInfo } from '@/lib/vouchers';
import { useT } from '@/components/LangProvider';

type Props = {
  product: Product;
  /** Varian yang wajib dipilih (kosong = produk biasa). */
  variants: Variation[];
  whatsappNumber: string;
  vouchers?: VoucherInfo[];
};

function promoEndText(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

/** Bagian atas halaman detail: galeri + judul + harga headline + pilihan varian + tombol beli. */
export default function ProductHero({ product, variants, whatsappNumber, vouchers = [] }: Props) {
  const t = useT();
  const hasVariants = variants.length > 0;
  const [variationId, setVariationId] = useState<string | null>(() => {
    const available = variants.filter((v) => v.stock > 0);
    return available.length === 1 ? available[0].variation_id : null;
  });
  const selected = variants.find((v) => v.variation_id === variationId) ?? null;

  // Gambar: utama + lainnya + gambar varian (bila belum ada di daftar).
  const images = useMemo(() => {
    const list = [product.image_url, ...(product.images ?? [])];
    for (const v of variants) if (v.image_url) list.push(v.image_url);
    return Array.from(new Set(list.filter(Boolean)));
  }, [product.image_url, product.images, variants]);

  // Harga headline mengikuti varian yang dipilih.
  const normalPrice = Number(selected ? selected.price : product.price) || 0;
  const finalPrice =
    Number(selected ? selected.final_price ?? selected.price : product.final_price ?? product.price) || 0;
  const discount = selected ? selected.discount_percent ?? 0 : product.discount_percent ?? 0;
  const hasDiscount = discount > 0 && finalPrice < normalPrice;

  const finals = variants.map((v) => Number(v.final_price ?? v.price) || 0).filter((p) => p > 0);
  const priceVaries = !selected && finals.length > 1 && Math.min(...finals) !== Math.max(...finals);
  const maxDiscount = Math.max(0, product.discount_percent ?? 0, ...variants.map((v) => v.discount_percent ?? 0));

  const stock = hasVariants
    ? selected
      ? selected.stock
      : variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : Number(product.stock) || 0;
  const sku = selected?.sku || (!hasVariants ? product.sku : '');
  const promoEnds = promoEndText(product.promo_ends_at);
  const flash = selected ? selected.flash ?? null : product.flash ?? null;
  const pkg = selected?.package ?? product.package;
  // Nama dari Shopee sering panjang: "URBANIX - Nama | kata kunci | ...". Judul = bagian utama, sisanya keterangan kecil.
  const title = useMemo(() => {
    const clean = product.name.replace(/^URBANIX\s*[-–—]\s*/i, '').trim();
    const [main, ...rest] = clean.split(/\s+\|\s+/);
    return { main: main || clean, extra: rest.join(' · ') };
  }, [product.name]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-5 sm:mt-6 md:grid-cols-2 md:gap-10 lg:gap-14">
      <ProductGallery
        images={images}
        alt={product.name}
        focusImage={selected?.image_url || null}
        badge={maxDiscount > 0 ? `-${maxDiscount}%` : undefined}
      />

      <section className="min-w-0 py-1 sm:py-3">
        <p className="text-xs font-semibold text-ink sm:text-sm">{product.category_name || 'Produk'}</p>

        <h1 className="mt-2 break-words text-xl font-extrabold leading-snug tracking-tight sm:mt-3 sm:text-3xl sm:leading-tight">
          {title.main}
        </h1>
        {title.extra && <p className="mt-2 text-sm leading-6 text-slate-500">{title.extra}</p>}

        {sku && (
          <p className="mt-3 text-xs text-slate-400">
            SKU: {sku}
            {selected?.name.trim() && <> · {t('Varian')}: {selected.name.trim()}</>}
          </p>
        )}

        <div className="mt-4 border-y border-slate-200 py-4 sm:mt-6 sm:py-5">
          {flash ? (
            <FlashSaleStrip flash={flash} />
          ) : product.promo_name && maxDiscount > 0 && (
            <p className="mb-2 inline-flex flex-wrap items-center gap-x-2 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
              {product.promo_name}
              {promoEnds && <span className="font-medium text-red-600">{t('s/d {date}', { date: promoEnds })}</span>}
            </p>
          )}

          {hasDiscount && !priceVaries && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <span className="line-through">{money(normalPrice)}</span>
              <span className="rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                -{discount}%
              </span>
            </p>
          )}

          <p className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
            {priceVaries && <span className="mr-1.5 text-sm font-semibold text-slate-500">{t('Mulai')}</span>}
            {money(priceVaries ? Math.min(...finals) : finalPrice)}
          </p>

          <p className="mt-1 text-xs text-slate-500">{t('Harga sudah termasuk PPN')}</p>

          <p className={`mt-3 text-sm font-semibold ${stock > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
            {stock > 0
              ? t(selected ? 'Stok varian ini: {n}' : 'Stok tersedia: {n}', { n: stock })
              : selected
                ? t('Stok varian ini habis')
                : t('Stok habis')}
          </p>

          {pkg?.ship_weight_grams ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 8 12 3 3 8v8l9 5 9-5V8z" />
                <path d="m3 8 9 5 9-5M12 13v8" />
              </svg>
              <span>
                {t('Berat kirim {w}', { w: weightText(pkg.ship_weight_grams) })}
                {pkg.volume_weight_grams && pkg.volume_weight_grams > (pkg.weight_grams ?? 0) ? ` (${t('berat volume')})` : ''}
              </span>
              {pkg.length_cm && pkg.width_cm && pkg.height_cm && (
                <span className="text-slate-400">· {pkg.length_cm}×{pkg.width_cm}×{pkg.height_cm} cm</span>
              )}
            </p>
          ) : null}
        </div>

        <ProductBuyButtons
          id={String(product.id)}
          name={product.name}
          sku={product.sku}
          price={finalPrice}
          imageUrl={selected?.image_url || product.image_url || null}
          stock={stock}
          variations={variants}
          variationId={variationId}
          onVariationChange={setVariationId}
          whatsappNumber={whatsappNumber}
        />

        {/* Voucher diringkas supaya tidak menutupi tombol beli */}
        {vouchers.length > 0 && (
          <details className="group mt-4 rounded-xl border border-slate-200">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sale-600 text-white">
                <Ticket size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-ink">{t('{n} voucher toko tersedia', { n: vouchers.length })}</b>
                <span className="block truncate text-xs text-slate-500">{vouchers.map((v) => v.headline).join(' · ')}</span>
              </span>
              <ChevronRight size={16} className="rotate-90 text-slate-500 transition-transform duration-300 group-open:-rotate-90" />
            </summary>
            <div className="border-t border-slate-200 p-3">
              <VoucherStrip vouchers={vouchers} stacked />
            </div>
          </details>
        )}

        {/* Info pembayaran, pengiriman & retur di dekat tombol beli (juga syarat Google Merchant Center) */}
        <ul className="mt-5 grid gap-3 border-t border-slate-200 pt-4 text-[13px] leading-5 text-slate-600 sm:grid-cols-3">
          <li>
            <b className="block text-ink">{t('Pembayaran')}</b>
            {siteConfig.paymentMethods.map((m) => m.name).join(', ')}.{' '}
            <Link href="/syarat-ketentuan#pembayaran" className="font-semibold text-ink underline">{t('Detail')}</Link>
          </li>
          <li>
            <b className="block text-ink">{t('Pengiriman')}</b>
            {t('Reguler & kargo (JNE/J&T), instan (GoSend/Grab). Dikirim maks. {d} setelah bayar.', { d: t(siteConfig.legal.shipProcessing) })}{' '}
            <Link href="/syarat-ketentuan#pengiriman" className="font-semibold text-ink underline">{t('Detail')}</Link>
          </li>
          <li>
            <b className="block text-ink">{t('Retur & garansi')}</b>
            {t('Maks. {d} dengan video unboxing; ganti barang atau uang kembali.', { d: t(siteConfig.legal.returnWindow) })}{' '}
            <Link href="/syarat-ketentuan#pembatalan-retur" className="font-semibold text-ink underline">{t('Detail')}</Link>
          </li>
        </ul>

        {/* Siapa penjualnya: toko & badan usaha nyata, untuk menumbuhkan kepercayaan */}
        <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-mist px-3.5 py-3 text-[13px] leading-5 text-slate-600">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-ink">
            <path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M3 9h18M9 20v-6h6v6" />
          </svg>
          <span>
            <b className="text-ink">Urbanix Store</b> · {siteConfig.city} ·{' '}
            {t('berjualan online sejak {d}', { d: t(siteConfig.since) })}.{' '}
            {t('Dikelola {c}, barang original bergaransi resmi.', { c: siteConfig.legal.company })}{' '}
            <Link href="/tentang-kami" className="font-semibold text-ink underline">{t('Tentang kami')}</Link>
          </span>
        </p>
      </section>
    </div>
  );
}
