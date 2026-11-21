'use client';

import { sellerHref, shopHref } from '@/lib/sellerUrl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import TablerIcon from '@/components/TablerIcon';
import ThemeToggle from '@/components/ThemeToggle';
import { MENU } from '@/components/seller/menu';
import { icons } from '@/components/seller/SellerIcons';
import { sellerApi } from '@/lib/seller';

type Me = { username: string; name: string; new_orders: number };

/** Halaman Menu (tab "Menu" di HP): semua menu Seller Center dalam daftar per grup, gaya daftar Tabler. */
export default function SellerMenuPage() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    sellerApi<Me>('me').then(setMe).catch(() => null);
  }, []);

  async function logout() {
    await fetch('/api/seller/logout', { method: 'POST' }).catch(() => null);
    window.location.href = sellerHref('/seller/login');
  }

  const name = me?.name || me?.username || '';

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="sr-only">Menu Seller Center</h1>

      {/* Akun */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-surface p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-surface">
          {(name || 'U').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink">{name || 'Admin'}</span>
          <span className="block text-xs text-slate-500">Seller Center Urbanix</span>
        </span>
        <ThemeToggle />
      </div>

      {MENU.map((group) => (
        <section key={group.group}>
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{group.group}</h2>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-surface">
            {group.items.map((item) => {
              const Icon = icons[item.icon];
              const badge = item.href === '/seller/pesanan' && (me?.new_orders ?? 0) > 0 ? me!.new_orders : 0;
              return (
                <li key={item.href}>
                  <Link href={sellerHref(item.href)} className="flex items-center gap-3 px-4 py-3.5 transition active:bg-mist">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mist text-ink">
                      <Icon size={18} />
                    </span>
                    <span className="flex-1 text-[15px] font-medium text-ink">{item.label}</span>
                    {badge > 0 && <span className="rounded-full bg-sale-600 px-2 py-0.5 text-[11px] font-bold text-white">{badge}</span>}
                    <TablerIcon name="chevron-right" size={18} className="text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Lainnya</h2>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-surface">
          <li>
            <a href={shopHref('/')} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3.5 active:bg-mist">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-mist text-ink">{icons.store({ size: 18 })}</span>
              <span className="flex-1 text-[15px] font-medium text-ink">Lihat toko</span>
              <TablerIcon name="external-link" size={18} className="text-slate-400" />
            </a>
          </li>
          <li>
            <button type="button" onClick={logout} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-mist">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600">{icons.logout({ size: 18 })}</span>
              <span className="flex-1 text-[15px] font-medium text-red-600">Keluar</span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  );
}
