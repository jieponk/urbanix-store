import Link from 'next/link';
import { money, type Product } from '@/lib/api';
import { productImg } from '@/lib/img';
import { getT } from '@/lib/lang-server';
import { Bolt, QuotaBar } from '@/components/FlashSale';
import { getEventState } from '@/lib/event-server';
import { themeFor } from '@/lib/eventTheme';
import { cardProductName } from '@/lib/seo';

export default async function ProductCard({ product }: { product: Product }) {
  const t = getT();
  const originalPrice = Number(product.price) || 0;
  // final_price sudah termasuk promo "Potong harga" (dihitung di backend).
  const discountedPrice =
    Number(product.final_price ?? product.discount_price) || 0;

  const hasDiscount =
    discountedPrice > 0 && discountedPrice < originalPrice;

  const finalPrice = hasDiscount ? discountedPrice : originalPrice;

  const discountPercent = hasDiscount
    ? product.discount_percent ||
      Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
    : 0;

  // Selama Mode Event, produk diskon diberi label event (mis. "12.12"), seperti di marketplace.
  const event = hasDiscount ? (await getEventState()).event : null;

  return (
    <Link
      href={`/produk/${product.id}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface md:transition md:duration-200 md:hover:-translate-y-1 md:hover:border-slate-300 md:hover:shadow-xl md:hover:shadow-slate-200/60"
    >
      <div className="relative aspect-square overflow-hidden bg-white p-3 sm:p-5">
        {product.image_url ? (
          <img
            src={productImg(product.image_url, 450)}
            alt={cardProductName(product.name)}
            loading="lazy"
            className="h-full w-full object-contain md:transition md:duration-300 md:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
            {t('Gambar tidak tersedia')}
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
            <span className="flex items-center gap-1">
              <span className="rounded-md bg-sale-600 px-2 py-1 text-[10px] font-extrabold text-white shadow sm:text-xs">
                -{discountPercent}%
              </span>
              {event && (
                <span className={`rounded-md px-1.5 py-1 text-[10px] font-extrabold shadow sm:text-xs ${themeFor(event.key).card}`}>
                  {event.big}
                </span>
              )}
            </span>
            {product.promo_name && (
              <span className="flex max-w-[7.5rem] items-center gap-0.5 truncate rounded-md bg-cobalt-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                {product.flash && <Bolt size={11} />}
                {product.promo_name}
              </span>
            )}
          </span>
        )}

        {product.stock > 0 && product.stock <= 3 && (
          <span className="absolute right-2 top-2 rounded-md bg-sale-600 px-1.5 py-0.5 text-[10px] font-bold text-white sm:right-3 sm:top-3">
            {t('Sisa {n}', { n: product.stock })}
          </span>
        )}

        {product.stock <= 0 && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/75 px-2 py-2 text-center text-[10px] font-bold text-white sm:inset-x-3 sm:bottom-3">
            {t('Stok habis')}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">
          {product.category_name || 'Produk'}
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-10 text-xs font-bold leading-5 text-slate-800 transition group-hover:text-slate-900 sm:text-sm">
          {cardProductName(product.name)}
        </h3>

        {/* Bukti sosial jujur: hanya dari ulasan pembeli terverifikasi & pesanan web asli */}
        {(Boolean(product.review_count) || Boolean(product.sold_count)) && (
          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500 sm:text-xs">
            {Boolean(product.review_count) && product.rating_avg != null && (
              <span className="inline-flex items-center gap-0.5 font-semibold text-slate-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-ink">
                  <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
                </svg>
                {product.rating_avg.toFixed(1)}
                <span className="font-normal text-slate-500">({product.review_count})</span>
              </span>
            )}
            {Boolean(product.review_count) && Boolean(product.sold_count) && <span aria-hidden="true">·</span>}
            {Boolean(product.sold_count) && <span>{t('Terjual {n}', { n: product.sold_count ?? 0 })}</span>}
          </p>
        )}

        <div className="mt-3">
          {hasDiscount && (
            <p className="text-[10px] text-slate-400 line-through sm:text-xs">
              {money(originalPrice)}
            </p>
          )}

          <p className={`break-words text-sm font-extrabold leading-5 tracking-tight sm:text-base ${hasDiscount ? 'text-sale-600' : 'text-ink'}`}>
            {money(finalPrice)}
          </p>
          {product.flash?.quota != null && (
            <span className="mt-2 block">
              <QuotaBar flash={product.flash} />
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <span
            className={`block rounded-lg py-2.5 text-center text-[10px] font-bold transition sm:text-xs ${
              product.stock > 0
                ? 'bg-mist text-ink group-hover:bg-ink group-hover:text-surface'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {product.stock > 0 ? t('Lihat produk') : t('Lihat detail')}
          </span>
        </div>
      </div>
    </Link>
  );
}
