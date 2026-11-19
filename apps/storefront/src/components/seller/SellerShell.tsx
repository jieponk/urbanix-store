'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { icons, type IconName } from '@/components/seller/SellerIcons';
import { sellerApi } from '@/lib/seller';
import { MENU, type MenuItem } from '@/components/seller/menu';

type Me = { username: string; name: string; new_orders: number };
type Item = MenuItem;

const ALL = MENU.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

/** Tab bawah di HP (4 menu paling sering + "Menu"). */
const TABS: Item[] = [
  { href: '/seller', label: 'Beranda', icon: 'dashboard' },
  { href: '/seller/pesanan', label: 'Pesanan', icon: 'orders' },
  { href: '/seller/produk', label: 'Produk', icon: 'products' },
  { href: '/seller/promo', label: 'Promo', icon: 'promo' },
];

type Toast = { id: number; message: string; type: 'success' | 'error' };

const initials = (name?: string) =>
  (name || 'U')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

export default function SellerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const [palette, setPalette] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const isLogin = pathname === '/seller/login';

  useEffect(() => {
    if (isLogin) return;
    sellerApi<Me>('me').then(setMe).catch(() => null);
  }, [isLogin, pathname]);

  useEffect(() => {
    setPalette(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('seller-sidebar') === 'mini');
    } catch {
      /* abaikan */
    }
  }, []);

  // Ctrl/⌘ + K = cari menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-2xl ${
            t.type === 'error' ? 'bg-red-600' : 'bg-cobalt-900'
          }`}
        >
          <span aria-hidden="true">{t.type === 'error' ? '!' : '✓'}</span>
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

  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem('seller-sidebar', v ? 'full' : 'mini');
      } catch {
        /* abaikan */
      }
      return !v;
    });
  }

  const active = (href: string) =>
    href === '/seller' ? pathname === '/seller' : pathname === href || pathname.startsWith(`${href}/`);
  const current = ALL.find((i) => active(i.href));
  const title = current?.label ?? (pathname === '/seller/menu' ? 'Menu' : 'Seller Center');
  const newOrders = me?.new_orders ?? 0;

  const countBadge = (href: string, mini = false) =>
    href === '/seller/pesanan' && newOrders > 0 ? (
      <span
        className={
          mini
            ? 'absolute -right-1 -top-1 min-w-[18px] rounded-full bg-sale-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white'
            : 'rounded-full bg-sale-600 px-2 py-0.5 text-[11px] font-bold text-white'
        }
      >
        {newOrders > 99 ? '99+' : newOrders}
      </span>
    ) : null;

  return (
    <div className="seller-root min-h-screen bg-mist text-sm lg:flex">
      {/* ===== Sidebar PC ===== */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/5 bg-cobalt-900 transition-[width] duration-200 lg:flex ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        <div className={`flex items-center gap-3 pb-3 pt-5 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
          <Link href="/seller" className="flex min-w-0 items-center gap-3" aria-label="Seller Center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-black text-cobalt-900">U</span>
            {!collapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block text-[15px] font-extrabold tracking-tight text-white">URBANIX</span>
                <span className="block text-[11px] font-semibold text-sun-300">Seller Center</span>
              </span>
            )}
          </Link>
        </div>

        <div className={collapsed ? 'px-3 pb-2' : 'px-4 pb-2'}>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className={`flex w-full items-center gap-2 rounded-md bg-white/5 py-2 text-sm text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            aria-label="Cari menu"
          >
            {icons.search({ size: 16 })}
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Cari menu…</span>
                <kbd className="rounded bg-white/10 px-1.5 text-[10px] font-semibold">Ctrl K</kbd>
              </>
            )}
          </button>
        </div>

        <nav className="seller-nav-scroll flex-1 overflow-y-auto px-3 py-2" aria-label="Menu Seller Center">
          {MENU.map((group) => (
            <div key={group.group} className="mb-3">
              {collapsed ? (
                <div className="mx-auto my-2 h-px w-6 bg-white/10" />
              ) : (
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{group.group}</p>
              )}
              {group.items.map((item) => {
                const Icon = icons[item.icon];
                const on = active(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={on ? 'page' : undefined}
                    className={`group relative mb-0.5 flex items-center gap-3 rounded-md py-2 text-sm font-medium transition ${
                      collapsed ? 'justify-center px-0' : 'px-3'
                    } ${on ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}
                  >
                    {on && <span className="absolute left-0 top-2 h-[calc(100%-16px)] w-[3px] rounded-r bg-sun-400" aria-hidden="true" />}
                    <span className="relative">
                      <Icon size={18} />
                      {collapsed && countBadge(item.href, true)}
                    </span>
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && countBadge(item.href)}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/10 p-3">
          <Link
            href="/"
            target="_blank"
            title="Lihat toko"
            className={`flex items-center gap-3 rounded-xl py-2 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : 'px-3'
            }`}
          >
            {icons.store({ size: 18 })} {!collapsed && 'Lihat toko ↗'}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'}
            className={`flex w-full items-center gap-3 rounded-xl py-2 text-sm font-semibold text-white/65 hover:bg-white/5 hover:text-white ${
              collapsed ? 'justify-center' : 'px-3'
            }`}
          >
            {collapsed ? icons.expand({ size: 18 }) : icons.collapse({ size: 18 })} {!collapsed && 'Ciutkan menu'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ===== Header ===== */}
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-surface/90 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6 lg:h-16">
            {/* HP: judul halaman; PC: jejak menu */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-extrabold tracking-tight text-ink lg:hidden">{title}</p>
              <nav aria-label="Lokasi" className="hidden items-center gap-1.5 text-sm lg:flex">
                <Link href="/seller" className="font-semibold text-slate-500 hover:text-ink">Seller Center</Link>
                {current && current.href !== '/seller' && (
                  <>
                    {icons.chevron({ size: 14, className: 'text-slate-400' })}
                    <span className="text-slate-500">{current.group}</span>
                    {icons.chevron({ size: 14, className: 'text-slate-400' })}
                    <span className="font-bold text-ink">{current.label}</span>
                  </>
                )}
              </nav>
            </div>

            <button
              type="button"
              onClick={() => setPalette(true)}
              aria-label="Cari menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-mist lg:hidden"
            >
              {icons.search({ size: 19 })}
            </button>
            <Link
              href="/seller/pesanan?status=PENDING"
              aria-label={newOrders ? `${newOrders} pesanan baru` : 'Pesanan baru'}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-mist"
            >
              {icons.bell({ size: 19 })}
              {newOrders > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-sale-600 ring-2 ring-surface" />}
            </Link>
            <ThemeToggle />
            <UserMenu name={me?.name || me?.username || ''} onLogout={logout} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pt-6 lg:pb-10">{children}</main>
      </div>

      {/* ===== Tab bawah HP ===== */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((tab) => {
            const Icon = icons[tab.icon];
            const on = active(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-bold ${on ? 'text-ink' : 'text-slate-400'}`}
              >
                <span className={`relative flex h-8 w-12 items-center justify-center rounded-full transition ${on ? 'bg-mist' : ''}`}>
                  <Icon size={20} />
                  {countBadge(tab.href, true)}
                </span>
                {tab.label}
              </Link>
            );
          })}
          <Link
            href="/seller/menu"
            aria-current={pathname === '/seller/menu' ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 py-2 text-[11px] font-bold ${
              !TABS.some((t) => active(t.href)) ? 'text-ink' : 'text-slate-400'
            }`}
          >
            <span className={`flex h-8 w-12 items-center justify-center rounded-full ${!TABS.some((t) => active(t.href)) ? 'bg-mist' : ''}`}>
              {icons.grid({ size: 20 })}
            </span>
            Menu
          </Link>
        </div>
      </nav>

      {palette && <CommandPalette onClose={() => setPalette(false)} onGo={(href) => router.push(href)} />}
      {toastLayer}
    </div>
  );
}

function UserMenu({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Akun"
        className="ml-1 flex items-center gap-2 rounded-full p-1 hover:bg-mist sm:pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-extrabold text-surface">{initials(name)}</span>
        <span className="hidden max-w-[120px] truncate text-sm font-bold text-ink sm:block">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl bg-surface py-1 shadow-2xl ring-1 ring-slate-200">
          <p className="truncate px-4 py-2 text-xs text-slate-500">Masuk sebagai <b className="text-ink">{name || '-'}</b></p>
          <Link href="/seller/pengaturan" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mist">
            {icons.settings({ size: 16 })} Pengaturan
          </Link>
          <Link href="/" target="_blank" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-mist">
            {icons.store({ size: 16 })} Lihat toko ↗
          </Link>
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-mist">
            {icons.logout({ size: 16 })} Keluar
          </button>
        </div>
      )}
    </div>
  );
}

/** Cari & lompat ke menu (Ctrl/⌘ K). */
function CommandPalette({ onClose, onGo }: { onClose: () => void; onGo: (href: string) => void }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ALL;
    return ALL.filter((i) => `${i.label} ${i.group} ${i.keywords ?? ''}`.toLowerCase().includes(needle));
  }, [q]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Cari menu">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          {icons.search({ size: 18, className: 'text-slate-400' })}
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === 'Enter' && results[sel]) { onGo(results[sel].href); onClose(); }
            }}
            placeholder="Cari menu: pesanan, voucher, dekor…"
            className="h-14 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded bg-mist px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:block">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-slate-500">Menu tidak ditemukan.</li>}
          {results.map((item, i) => {
            const Icon = icons[item.icon];
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => { onGo(item.href); onClose(); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === sel ? 'bg-mist' : ''}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-ink ring-1 ring-slate-200">
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 font-semibold text-ink">{item.label}</span>
                  <span className="text-xs text-slate-400">{item.group}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
