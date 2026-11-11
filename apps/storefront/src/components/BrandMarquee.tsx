import Link from 'next/link';
import type { Product } from '@/lib/api';
import { findPublicImage } from '@/lib/assets';
import { detectBrand } from '@/lib/seo';

const slug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Merek yang dijual (dihitung dari produk aktif), terbanyak lebih dulu.
 * Begitu ada minimal 6 logo di public/brands, hanya merek berlogo yang tampil;
 * merek lain otomatis ikut muncul setelah logonya ditambahkan.
 */
export function brandsFromProducts(products: Product[], limit = 24) {
  const count = new Map<string, number>();
  for (const p of products) {
    const brand = detectBrand(p.name);
    if (brand) count.set(brand, (count.get(brand) ?? 0) + 1);
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, total]) => ({ name, total, logo: findPublicImage('brands', slug(name)) }))
    .filter((b, _i, all) => {
      // Kalau sudah ada cukup logo, tampilkan hanya merek yang punya logo (lebih rapi).
      const withLogo = all.filter((x) => x.logo).length;
      return withLogo >= 6 ? Boolean(b.logo) : true;
    })
    .slice(0, limit);
}

/**
 * Deretan merek berjalan di atas footer. Logo opsional: taruh file resmi di
 * public/brands/<nama-merek>.svg|png|webp (mis. dji.svg, insta360.svg); kalau belum ada, tampil nama merek.
 */
export default function BrandMarquee({ brands }: { brands: { name: string; total: number; logo: string | null }[] }) {
  if (brands.length < 4) return null;
  const row = (hidden: boolean) => (
    <ul className="marquee-track flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {brands.map((b) => (
        <li key={b.name} className="shrink-0">
          <Link
            href={`/produk?q=${encodeURIComponent(b.name)}`}
            tabIndex={hidden ? -1 : undefined}
            title={`${b.total} produk ${b.name}`}
            className="group flex h-16 w-40 items-center justify-center overflow-hidden rounded-2xl bg-surface px-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300"
          >
            {b.logo ? (
              <img
                src={b.logo}
                alt={b.name}
                loading="lazy"
                width={128}
                height={36}
                className="h-9 w-full object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 dark:invert"
              />
            ) : (
              <span className="whitespace-nowrap text-[15px] font-black uppercase tracking-[0.12em] text-slate-500 transition group-hover:text-ink">
                {b.name}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="judul-merek" className="border-t border-slate-200 bg-mist py-8">
      <div className="mx-auto mb-4 flex max-w-7xl items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <h2 id="judul-merek" className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
          Merek resmi yang kami jual
        </h2>
        <Link href="/produk" className="shrink-0 text-sm font-bold text-ink hover:underline">
          Semua produk
        </Link>
      </div>
      <div className="marquee group/marquee relative overflow-hidden">
        <div className="marquee-inner flex w-max">
          {row(false)}
          {row(true)}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-mist to-transparent sm:w-24" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-mist to-transparent sm:w-24" />
      </div>
    </section>
  );
}
