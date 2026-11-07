import Link from 'next/link';
import { money, type Product } from '@/lib/api';

export default function ProductCard({ product }: { product: Product }) {
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

  return (
    <Link
      href={`/produk/${product.id}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-slate-200/60"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f7f7f7] p-3 sm:p-5">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
            Gambar tidak tersedia
          </div>
        )}

        {hasDiscount && (
          <span className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3">
            <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-extrabold text-white shadow sm:text-xs">
              -{discountPercent}%
            </span>
            {product.promo_name && (
              <span className="max-w-[7.5rem] truncate rounded-md bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                {product.promo_name}
              </span>
            )}
          </span>
        )}

        {product.stock <= 0 && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-900/85 px-2 py-2 text-center text-[10px] font-bold text-white sm:inset-x-3 sm:bottom-3">
            Stok habis
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">
          {product.category_name || 'Produk'}
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-10 text-xs font-bold leading-5 text-slate-800 transition group-hover:text-orange-700 sm:text-sm">
          {product.name}
        </h3>

        <div className="mt-3">
          {hasDiscount && (
            <p className="text-[10px] text-slate-400 line-through sm:text-xs">
              {money(originalPrice)}
            </p>
          )}

          <p className="break-words text-sm font-extrabold leading-5 tracking-tight text-slate-950 sm:text-base">
            {money(finalPrice)}
          </p>
        </div>

        <div className="mt-auto pt-3">
          <span
            className={`block rounded-lg py-2.5 text-center text-[10px] font-bold transition sm:text-xs ${
              product.stock > 0
                ? 'bg-orange-50 text-orange-700 group-hover:bg-orange-600 group-hover:text-white'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {product.stock > 0 ? 'Lihat produk →' : 'Lihat detail'}
          </span>
        </div>
      </div>
    </Link>
  );
}
