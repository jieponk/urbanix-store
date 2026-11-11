import Link from 'next/link';
import { findPublicImage } from '@/lib/assets';

/** Merek unggulan di atas footer (urutan sesuai tampilan). Logo: public/brands/<slug>.svg|png|webp. */
const TOP_BRANDS = ['DJI', 'Insta360', 'Sony', 'Canon', 'Nikon', 'Fujifilm', 'Hollyland', 'Kodak'];

const slug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function topBrands() {
  return TOP_BRANDS.map((name) => ({ name, logo: findPublicImage('brands', slug(name)) }));
}

/** Deretan merek unggulan yang berjalan pelan + tautan ke semua produk. Kotak berukuran tetap agar logo tidak bertabrakan. */
export default function BrandMarquee({ brands }: { brands: { name: string; logo: string | null }[] }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {brands.map((b) => (
        <li key={b.name} className="shrink-0">
          <Link
            href={`/produk?q=${encodeURIComponent(b.name)}`}
            tabIndex={hidden ? -1 : undefined}
            title={`Produk ${b.name}`}
            className="group flex h-16 w-40 items-center justify-center overflow-hidden rounded-2xl bg-surface px-5 ring-1 ring-slate-200 transition hover:ring-slate-300"
          >
            {b.logo ? (
              <img
                src={b.logo}
                alt={b.name}
                loading="lazy"
                width={120}
                height={32}
                className="h-8 w-full object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 dark:invert"
              />
            ) : (
              <span className="truncate text-sm font-black uppercase tracking-[0.1em] text-slate-500 group-hover:text-ink">{b.name}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Merek unggulan" className="border-t border-slate-200 bg-mist py-8">
      <div className="marquee relative overflow-hidden">
        <div className="marquee-inner flex w-max">
          {row(false)}
          {row(true)}
          {row(true)}
          {row(true)}
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-mist to-transparent sm:w-24" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-mist to-transparent sm:w-24" />
      </div>
      <div className="mx-auto mt-4 flex max-w-7xl justify-end px-4 sm:px-6 lg:px-8">
        <Link href="/produk" className="group inline-flex items-center gap-1 text-sm font-bold text-ink hover:underline">
          Semua merek <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </section>
  );
}
