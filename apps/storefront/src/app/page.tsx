import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { API, getFeaturedProducts, type Product } from '@/lib/api';
import { siteConfig } from '@/lib/siteConfig';

export default async function HomePage() {
  let products: Product[] = [];
  let productError = false;

  try {
    products = await getFeaturedProducts(4);
  } catch {
    productError = true;
  }

  const { highlights, motto, mottoSub } = siteConfig;

  return (
    <div className="bg-white text-slate-900">
      {/* 1. Banner */}
      <section className="bg-gradient-to-br from-[#171717] via-[#1f1f1f] to-[#2b1608] text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-orange-400 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              URBANIX STORE
            </span>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Gear terbaik.
              <br />
              <span className="text-orange-500">Cerita dimulai.</span>
            </h1>

            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 sm:text-base">
              Temukan perlengkapan kamera dan gear kreator untuk setiap
              momen yang ingin kamu abadikan.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/produk"
                className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Belanja sekarang
              </Link>
              <Link
                href="#produk-pilihan"
                className="rounded-xl border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Lihat pilihan kami
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Produk pilihan (4 produk) */}
      <section
        id="produk-pilihan"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
              Pilihan untukmu
            </p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              Produk pilihan
            </h2>
          </div>
          <Link
            href="/produk"
            className="shrink-0 text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            Lihat semua →
          </Link>
        </div>

        {productError ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-bold text-red-700">Produk gagal dimuat</p>
            <p className="mt-2 text-sm text-slate-600">
              Pastikan backend Django berjalan dan API produk dapat diakses.
            </p>
            <p className="mt-2 break-all text-xs text-slate-500">
              API: {API}/products/
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center">
            <p className="font-bold">Produk belum tersedia</p>
            <p className="mt-2 text-sm text-slate-500">
              Silakan cek kembali sebentar lagi.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Moto toko */}
      <section className="bg-orange-50">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 sm:text-xs">
            Moto kami
          </p>
          <h2 className="mt-3 text-2xl font-black leading-snug tracking-tight text-slate-900 sm:text-4xl">
            &ldquo;{motto}&rdquo;
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            {mottoSub}
          </p>
        </div>
      </section>

      {/* 4. Teks berjalan: keunggulan pelayanan */}
      <section
        aria-label="Keunggulan Urbanix Store"
        className="overflow-hidden border-y border-slate-200 bg-white py-4"
      >
        <div className="marquee-track flex w-max text-sm font-semibold text-slate-700">
          {[...highlights, ...highlights].map((text, index) => (
            <span
              key={index}
              aria-hidden={index >= highlights.length}
              className="flex items-center gap-3 whitespace-nowrap pr-12"
            >
              <span className="text-orange-500">★</span>
              {text}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
