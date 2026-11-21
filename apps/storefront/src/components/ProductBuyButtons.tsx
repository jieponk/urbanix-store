'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Variation } from '@/lib/api';
import { money } from '@/lib/money';
import { addToCart, cartLineId, type CartItem } from '@/lib/cart';
import { CartIcon } from '@/components/Icons';
import { ArrowRight } from '@/components/inspirasi/InspoIcons';
import { useT } from '@/components/LangProvider';
import { rememberProduct } from '@/lib/lastProduct';
import { publicSku } from '@/lib/seo';
import SimpleIcon from '@/components/SimpleIcon';

type Props = {
  id: string;
  name: string;
  /** SKU induk; dipakai bila produk tidak punya varian (atau varian tanpa SKU). */
  sku: string;
  price: number;
  imageUrl: string | null;
  stock: number;
  /** Varian yang wajib dipilih (kosong = produk biasa). */
  variations: Variation[];
  /** Varian yang sedang dipilih (dikendalikan oleh ProductHero). */
  variationId: string | null;
  onVariationChange: (variationId: string) => void;
  /** Nomor WhatsApp toko dari Pengaturan toko; kosong = tombol chat disembunyikan. */
  whatsappNumber: string;
};

export default function ProductBuyButtons({
  id,
  name,
  sku,
  price,
  imageUrl,
  stock,
  variations,
  variationId,
  onVariationChange,
  whatsappNumber,
}: Props) {
  const t = useT();
  const router = useRouter();
  const hasVariants = variations.length > 0;

  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [needVariant, setNeedVariant] = useState(false);

  // Ingat produk ini supaya tombol "Kembali" di keranjang/checkout bisa membawa pembeli ke sini lagi.
  useEffect(() => {
    rememberProduct({ href: window.location.pathname + window.location.search, name });
  }, [name]);

  const selected = variations.find((v) => v.variation_id === variationId) ?? null;
  // Harga yang masuk keranjang = harga akhir (termasuk promo). Server tetap menghitung ulang saat checkout.
  const currentPrice = selected ? Number(selected.final_price ?? selected.price) || 0 : price;
  const currentStock = hasVariants ? (selected ? selected.stock : 0) : stock;
  const currentSku = publicSku(selected?.sku || sku);
  const canBuy = hasVariants ? Boolean(selected) && currentStock > 0 : stock > 0;

  function choose(variation: Variation) {
    if (variation.stock < 1) return;
    onVariationChange(variation.variation_id);
    setQuantity((q) => Math.min(Math.max(1, q), variation.stock));
    setNeedVariant(false);
    setMessage('');
  }

  function buildItem(): CartItem | null {
    if (hasVariants && !selected) {
      setNeedVariant(true);
      document.getElementById('pilih-varian')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return null;
    }
    if (!canBuy) return null;
    return {
      id: cartLineId(id, selected?.variation_id),
      productId: id,
      variationId: selected?.variation_id,
      variationName: selected?.name.trim() || undefined,
      sku: currentSku || undefined,
      name,
      price: currentPrice,
      image_url: imageUrl,
      quantity: Math.min(quantity, currentStock),
      stock: currentStock,
    };
  }

  function addProduct() {
    const item = buildItem();
    if (!item) return;
    addToCart(item);
    setMessage(t('Produk berhasil ditambahkan ke keranjang.'));
  }

  function buyNow() {
    const item = buildItem();
    if (!item) return;
    addToCart(item);
    router.push('/checkout');
  }

  function chatUrl() {
    // Singkat saja: sapaan + link produk (pembeli tinggal mengetik pertanyaannya sendiri).
    const text = `Hai kak, saya mau nanya untuk link produk\n${window.location.href}`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  function openChat() {
    window.open(chatUrl(), '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="mt-6 space-y-5">
      {hasVariants && (
        <div>
          <p className={`mb-2 text-sm font-semibold ${needVariant ? 'text-red-600' : 'text-slate-700'}`}>
            {needVariant ? t('Pilih varian dulu ya') : t('Pilih varian')}
            <span className="font-normal text-slate-400"> ({t('{n} pilihan', { n: variations.length })})</span>
          </p>
          <div
            role="radiogroup"
            aria-label={t('Pilih varian')}
            id="pilih-varian"
            className={`grid grid-cols-2 gap-2 ${needVariant ? 'rounded-xl ring-2 ring-red-300 ring-offset-2' : ''}`}
          >
            {variations.map((variation) => {
              const active = variation.variation_id === variationId;
              const soldOut = variation.stock < 1;
              return (
                <button
                  key={variation.variation_id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={soldOut}
                  onClick={() => choose(variation)}
                  className={`min-w-0 break-words rounded-xl border-2 px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? 'border-ink bg-mist'
                      : 'border-slate-200 hover:border-slate-300'
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  <span className="block font-semibold text-slate-900">
                    {variation.name.trim() || 'Standar'}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {(variation.discount_percent ?? 0) > 0 && (
                      <span className="mr-1 text-slate-400 line-through">{money(variation.price)}</span>
                    )}
                    <span className={(variation.discount_percent ?? 0) > 0 ? 'font-semibold text-red-600' : ''}>
                      {money(variation.final_price ?? variation.price)}
                    </span>
                    {' · '}
                    {soldOut ? t('Habis') : t('Stok {n}', { n: variation.stock })}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}


      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-slate-700">{t('Jumlah')}</span>

        <div className="flex items-center rounded-xl border border-slate-300">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="px-4 py-2 text-lg disabled:opacity-30"
            aria-label={t('Kurangi jumlah')}
          >
            −
          </button>
          <span className="min-w-8 text-center font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(Math.max(1, currentStock), q + 1))}
            disabled={quantity >= currentStock}
            className="px-4 py-2 text-lg disabled:opacity-30"
            aria-label={t('Tambah jumlah')}
          >
            +
          </button>
        </div>

        <span className="text-xs text-slate-500">
          {hasVariants && !selected ? t('Pilih varian untuk melihat stok') : t('Stok: {n}', { n: currentStock })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={addProduct}
          disabled={!hasVariants && !canBuy}
          className="group inline-flex items-center justify-center gap-2 rounded-lg border-2 border-ink px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CartIcon size={18} className="transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
          {t('Tambah ke Keranjang')}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!hasVariants && !canBuy}
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3.5 text-sm font-bold text-onbrand transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('Beli Sekarang')}
          <ArrowRight size={18} />
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}{' '}
          <button type="button" onClick={() => router.push('/cart')} className="font-bold underline">
            {t('Lihat Keranjang')}
          </button>
        </div>
      )}

      {whatsappNumber && (
        <>
          <button
            type="button"
            onClick={openChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          >
            <ChatIcon />
            {t('Tanya produk ini ke admin (WhatsApp)')}
          </button>

          {/* Tombol chat melayang: selalu terlihat saat pembeli menggulir deskripsi */}
          <button
            type="button"
            onClick={openChat}
            aria-label={t('Chat admin lewat WhatsApp')}
            className="fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-full bg-emerald-600 sm:flex px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            <ChatIcon />
            <span>{t('Chat Admin')}</span>
          </button>
        </>
      )}

      {/* HP: bar beli menempel di bawah layar */}
      <div id="bar-beli" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface/95 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-slate-500">
              {hasVariants ? (selected ? selected.name.trim() || t('Standar') : t('Pilih varian dulu')) : t('Harga')}
            </p>
            <p className="truncate text-base font-extrabold text-ink">{money(currentPrice)}</p>
          </div>
          {whatsappNumber && (
            <button
              type="button"
              onClick={openChat}
              aria-label={t('Tanya admin lewat WhatsApp')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-600 text-emerald-700"
            >
              <ChatIcon />
            </button>
          )}
          <button
            type="button"
            onClick={addProduct}
            disabled={!hasVariants && !canBuy}
            aria-label={t('Tambah ke keranjang')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-ink disabled:opacity-40"
          >
            <CartIcon size={20} />
          </button>
          <button
            type="button"
            onClick={buyNow}
            disabled={!hasVariants && !canBuy}
            className="h-11 shrink-0 rounded-xl bg-brand-600 px-4 text-sm font-bold text-onbrand disabled:opacity-50"
          >
            {!hasVariants && !canBuy ? t('Stok habis') : t('Beli Sekarang')}
          </button>
        </div>
        {message && (
          <p className="mt-1.5 text-center text-xs font-semibold text-emerald-700">
            {t('Masuk keranjang.')}{' '}
            <button type="button" onClick={() => router.push('/cart')} className="underline">
              {t('Lihat')}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

/** Logo WhatsApp (Simple Icons), ikut warna teks tombol. */
function ChatIcon() {
  return <SimpleIcon name="whatsapp" color="current" size={18} />;
}
