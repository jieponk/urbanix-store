'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon, GridIcon } from '@/components/Icons';

type Item = { id: number; name: string };

/**
 * Tombol "Kategori" dengan menu dropdown.
 * HP: panel selebar layar tepat di bawah header. Desktop: panel 2 kolom di bawah tombol.
 */
export default function CategoryMenu({ categories, showPromo }: { categories: Item[]; showPromo: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="md:relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="menu-kategori"
        className={`flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-bold transition ${
          open ? 'bg-ink text-surface' : 'bg-mist text-ink hover:bg-slate-200'
        }`}
      >
        <GridIcon size={16} />
        Kategori
        <ChevronDownIcon size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id="menu-kategori"
          className="absolute inset-x-0 top-full z-50 max-h-[75vh] overflow-y-auto border-b border-slate-200 bg-surface px-4 pb-5 pt-3 shadow-xl md:inset-x-auto md:left-0 md:mt-2 md:w-[520px] md:rounded-2xl md:border md:p-3"
        >
          <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3">
            {showPromo && (
              <Link
                href="/produk?promo=1"
                onClick={close}
                className="rounded-xl bg-sale-600 px-3 py-3 text-sm font-bold text-white hover:bg-sale-700"
              >
                Produk promo
              </Link>
            )}
            <Link
              href="/produk"
              onClick={close}
              className={`rounded-xl bg-mist px-3 py-3 text-sm font-bold text-ink hover:bg-slate-200 ${showPromo ? '' : 'col-span-2'}`}
            >
              Semua produk
            </Link>
          </div>

          <ul className="mt-2 grid grid-cols-2 gap-x-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/produk?category=${category.id}`}
                  onClick={close}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-mist hover:text-ink"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
