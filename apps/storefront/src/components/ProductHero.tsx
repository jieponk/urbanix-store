'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import ProductBuyButtons from '@/components/ProductBuyButtons';
import { siteConfig } from '@/lib/siteConfig';
import ProductGallery from '@/components/ProductGallery';
import { VoucherStrip } from '@/components/VoucherCard';
import { money, type Product, type Variation } from '@/lib/api';
import type { VoucherInfo } from '@/lib/vouchers';

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
          {product.name}
        </h1>

        {sku && (
          <p className="mt-3 text-xs text-slate-400">
            SKU: {sku}
            {selected?.name.trim() && <> · Varian: {selected.name.trim()}</>}
          </p>
        )}

        <div className="mt-4 border-y border-slate-200 py-4 sm:mt-6 sm:py-5">
          {product.promo_name && maxDiscount > 0 && (
            <p className="mb-2 inline-flex flex-wrap items-center gap-x-2 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
              {product.promo_name}
              {promoEnds && <span className="font-medium text-red-600">s/d {promoEnds}</span>}
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
            {priceVaries && <span className="mr-1.5 text-sm font-semibold text-slate-500">Mulai</span>}
            {money(priceVaries ? Math.min(...finals) : finalPrice)}
          </p>

          <p className="mt-1 text-xs text-slate-500">Harga sudah termasuk PPN</p>

          <p className={`mt-3 text-sm font-semibold ${stock > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
            {stock > 0
              ? `Stok ${selected ? 'varian ini' : 'tercatat'} tersedia (${stock})`
              : selected
                ? 'Stok varian ini habis'
                : 'Stok tercatat habis'}
          </p>
        </div>

        {vouchers.length > 0 && (
          <div className="mt-4">
            <VoucherStrip vouchers={vouchers} title="Voucher toko" stacked />
          </div>
        )}

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

        {/* Info pembayaran, pengiriman & retur di dekat tombol beli (juga syarat Google Merchant Center) */}
        <ul className="mt-5 grid gap-2 rounded-2xl bg-mist p-4 text-[13px] leading-5 text-slate-600 sm:grid-cols-3">
          <li>
            <b className="block text-ink">Pembayaran</b>
            {siteConfig.paymentMethods.map((m) => m.name).join(', ')}.{' '}
            <Link href="/syarat-ketentuan#pembayaran" className="font-semibold text-ink underline">Detail</Link>
          </li>
          <li>
            <b className="block text-ink">Pengiriman</b>
            Dikirim maks. {siteConfig.legal.shipProcessing} setelah bayar, ke {siteConfig.legal.shipArea}.{' '}
            <Link href="/syarat-ketentuan#pengiriman" className="font-semibold text-ink underline">Detail</Link>
          </li>
          <li>
            <b className="block text-ink">Retur & garansi</b>
            Maks. {siteConfig.legal.returnWindow} dengan video unboxing; ganti barang atau uang kembali.{' '}
            <Link href="/syarat-ketentuan#pembatalan-retur" className="font-semibold text-ink underline">Detail</Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
