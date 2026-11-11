import Link from 'next/link';
import { findPublicImage } from '@/lib/assets';

/** Merek unggulan di atas footer (urutan sesuai tampilan). Logo: public/brands/<slug>.svg|png|webp. */
const TOP_BRANDS = ['DJI', 'Insta360', 'Sony', 'Canon', 'Nikon', 'Fujifilm', 'Hollyland', 'Kodak'];

const slug = (brand: string) => brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function topBrands() {
  return TOP_BRANDS.map((name) => ({ name, logo: findPublicImage('brands', slug(name)) }));
}

/** Deretan merek unggulan (diam, tanpa animasi) + tombol ke semua produk. */
export default function BrandMarquee({ brands }: { brands: { name: string; logo: string | null }[] }) {
  const tile =
    'group flex h-16 items-center justify-center overflow-hidden rounded-2xl bg-surface px-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-slate-300';
  return (
    <section aria-label="Merek unggulan" className="border-t border-slate-200 bg-mist py-8">
      <ul className="mx-auto grid max-w-7xl grid-cols-3 gap-3 px-4 sm:grid-cols-5 sm:px-6 lg:grid-cols-9 lg:px-8">
        {brands.map((b) => (
          <li key={b.name}>
            <Link href={`/produk?q=${encodeURIComponent(b.name)}`} title={`Produk ${b.name}`} className={tile}>
              {b.logo ? (
                <img
                  src={b.logo}
                  alt={b.name}
                  loading="lazy"
                  width={112}
                  height={32}
                  className="h-8 w-full object-contain opacity-70 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 dark:invert"
                />
              ) : (
                <span className="truncate text-sm font-black uppercase tracking-[0.1em] text-slate-500 group-hover:text-ink">
                  {b.name}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/produk" className={`${tile} gap-1 text-sm font-bold text-ink`}>
            Semua merek
            <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
