import Link from 'next/link';
import { money, type Product } from '@/lib/api';
import { productImg } from '@/lib/img';

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
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/60"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f7f7f7] p-3 sm:p-5">
        {product.image_url ? (
          <img
            src={productImg(product.image_url, 450)}
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
            <span className="rounded-md bg-sale-600 px-2 py-1 text-[10px] font-extrabold text-white shadow sm:text-xs">
              -{discountPercent}%
            </span>
            {product.promo_name && (
              <span className="max-w-[7.5rem] truncate rounded-md bg-cobalt-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                {product.promo_name}
              </span>
            )}
          </span>
        )}

        {product.stock > 0 && product.stock <= 3 && (
          <span className="absolute right-2 top-2 rounded-md bg-sun-400 px-1.5 py-0.5 text-[10px] font-bold text-cobalt-900 sm:right-3 sm:top-3">
            Sisa {product.stock}
          </span>
        )}

        {product.stock <= 0 && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/75 px-2 py-2 text-center text-[10px] font-bold text-white sm:inset-x-3 sm:bottom-3">
            Stok habis
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">
          {product.category_name || 'Produk'}
        </p>

        <h3 className="mt-1 line-clamp-2 min-h-10 text-xs font-bold leading-5 text-slate-800 transition group-hover:text-slate-900 sm:text-sm">
          {product.name}
        </h3>

        <div className="mt-3">
          {hasDiscount && (
            <p className="text-[10px] text-slate-400 line-through sm:text-xs">
              {money(originalPrice)}
            </p>
          )}

          <p className={`break-words text-sm font-extrabold leading-5 tracking-tight sm:text-base ${hasDiscount ? 'text-sale-600' : 'text-ink'}`}>
            {money(finalPrice)}
          </p>
        </div>

        <div className="mt-auto pt-3">
          <span
            className={`block rounded-lg py-2.5 text-center text-[10px] font-bold transition sm:text-xs ${
              product.stock > 0
                ? 'bg-mist text-ink group-hover:bg-ink group-hover:text-surface'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {product.stock > 0 ? 'Lihat produk' : 'Lihat detail'}
          </span>
        </div>
      </div>
    </Link>
  );
}
