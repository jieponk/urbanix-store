'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Item = { id: number; name: string };

export default function CategoryMenu({ categories }: { categories: Item[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (categories.length === 0) return null;

  return (
    <div ref={ref} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1 transition-colors hover:text-brand-500"
      >
        Kategori
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-4 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:inset-x-auto sm:left-0 sm:mt-3 sm:w-64">
          <Link
            href="/produk"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-50"
          >
            Semua produk
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/produk?category=${category.id}`}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-600"
            >
              {category.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
