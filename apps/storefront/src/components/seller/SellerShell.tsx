'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import BrandLogo from '@/components/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { icons, type IconName } from '@/components/seller/SellerIcons';
import { sellerApi } from '@/lib/seller';

type Me = { username: string; name: string; new_orders: number };

const MENU: { group: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { group: 'Penjualan', items: [
    { href: '/seller', label: 'Dashboard', icon: 'dashboard' },
    { href: '/seller/pesanan', label: 'Pesanan', icon: 'orders' },
  ] },
  { group: 'Produk', items: [
    { href: '/seller/produk', label: 'Produk & SKU', icon: 'products' },
    { href: '/seller/mass-update', label: 'Mass update', icon: 'bulk' },
  ] },
  { group: 'Marketing', items: [
    { href: '/seller/promo', label: 'Promo harga', icon: 'promo' },
    { href: '/seller/voucher', label: 'Voucher', icon: 'voucher' },
    { href: '/seller/banner', label: 'Banner & link', icon: 'banner' },
  ] },
  { group: 'Konten', items: [
    { href: '/seller/berita', label: 'Berita', icon: 'news' },
    { href: '/seller/ulasan', label: 'Ulasan', icon: 'reviews' },
  ] },
  { group: 'Toko', items: [{ href: '/seller/pengaturan', label: 'Pengaturan', icon: 'settings' }] },
];

type Toast = { id: number; message: string; type: 'success' | 'error' };

export default function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isLogin = pathname === '/seller/login';

  useEffect(() => {
    if (isLogin) return;
    sellerApi<Me>('me').then(setMe).catch(() => null);
  }, [isLogin, pathname]);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent).detail as Omit<Toast, 'id'>;
      const id = Date.now() + Math.random();
      setToasts((list) => [...list, { id, ...detail }]);
      window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3500);
    };
    window.addEventListener('seller-toast', onToast);
    return () => window.removeEventListener('seller-toast', onToast);
  }, []);

  const toastLayer = (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${t.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );

  if (isLogin) return <>{children}{toastLayer}</>;

  async function logout() {
    await fetch('/api/seller/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/seller/login';
  }

  const active = (href: string) => (href === '/seller' ? pathname === '/seller' : pathname.startsWith(href));
  const title = MENU.flatMap((g) => g.items).find((i) => active(i.href))?.label ?? 'Seller Center';

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu Seller Center">
      {MENU.map((group) => (
        <div key={group.group} className="mb-4">
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-white/40">{group.group}</p>
          {group.items.map((item) => {
            const Icon = icons[item.icon];
            const on = active(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? 'page' : undefined}
                className={`mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  on ? 'bg-white text-cobalt-900' : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.href === '/seller/pesanan' && (me?.new_orders ?? 0) > 0 && (
                  <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">{me?.new_orders}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-mist lg:flex">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-cobalt-900 lg:flex">
        <div className="px-6 pb-2 pt-5">
          <Link href="/seller" className="block">
            <span className="block text-lg font-extrabold tracking-tight text-white">URBANIX</span>
            <span className="text-xs font-semibold text-sun-400">Seller Center</span>
          </Link>
        </div>
        {nav}
        <div className="border-t border-white/10 p-3">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">
            {icons.store({ size: 18 })} Lihat toko
          </Link>
        </div>
      </aside>

      {/* Menu HP */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Tutup menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <aside className="relative flex h-full w-72 flex-col bg-cobalt-900">
            <div className="px-6 pb-2 pt-5">
              <span className="block text-lg font-extrabold text-white">URBANIX</span>
              <span className="text-xs font-semibold text-sun-400">Seller Center</span>
            </div>
            {nav}
            <div className="border-t border-white/10 p-3">
              <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-white/70">
                {icons.store({ size: 18 })} Lihat toko
              </Link>
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-surface/95 px-4 py-2.5 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink hover:bg-mist lg:hidden" aria-label="Buka menu">
            {icons.menu({ size: 20 })}
          </button>
          <span className="lg:hidden"><BrandLogo /></span>
          <p className="hidden text-sm font-bold text-slate-500 lg:block">{title}</p>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <span className="hidden px-2 text-sm font-semibold text-ink sm:block">{me?.name ?? ''}</span>
            <button type="button" onClick={logout} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-ink hover:bg-mist">
              {icons.logout({ size: 16 })}
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
      {toastLayer}
    </div>
  );
}
