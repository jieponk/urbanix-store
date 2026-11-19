'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/* Komponen kecil yang dipakai berulang di Seller Center. Warna mengikuti tema toko (terang/gelap). */

/* Gaya Tabler UI (tabler.io): sudut 6 px, garis tepi tipis, teks 14 px, tombol berikon. Warna = palet Urbanix. */
const BTN = 'inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold leading-5 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';
export const btn = {
  primary: `${BTN} bg-ink text-surface shadow-sm hover:opacity-90`,
  brand: `${BTN} bg-sale-600 text-white shadow-sm hover:bg-sale-700`,
  ghost: `${BTN} border border-slate-300 bg-surface text-ink shadow-sm hover:bg-mist`,
  danger: `${BTN} bg-red-600 text-white shadow-sm hover:bg-red-700`,
  small:
    'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-surface px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-mist disabled:opacity-50',
};

export const inputCls =
  'w-full rounded-md border border-slate-300 bg-surface px-3 py-2 text-[15px] leading-5 text-ink shadow-sm transition placeholder:text-slate-400 focus:border-ink focus:outline-none focus:ring-4 focus:ring-slate-200 sm:text-sm';

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
  pretitle,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  /** Teks kecil di atas judul (gaya Tabler). Bawaan: "Seller Center". */
  pretitle?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-ink">
            ← {back.label}
          </Link>
        )}
        {!back && (
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 lg:block">{pretitle ?? 'Seller Center'}</p>
        )}
        {/* HP: judul tampil di bar atas, di sini cukup untuk pembaca layar */}
        <h1 className={`text-xl font-bold leading-7 text-ink ${back ? '' : 'sr-only lg:not-sr-only'}`}>{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-surface shadow-[0_2px_4px_rgba(24,36,51,0.04)] ${className}`}>
      {(title || action) && (
        <div className="flex min-h-[56px] items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-semibold leading-6 text-ink">{title}</h2>
          {action}
        </div>
      )}
      <div className={padded ? 'p-4 sm:p-5' : ''}>{children}</div>
    </section>
  );
}

const TONES: Record<string, string> = {
  gray: 'bg-mist text-slate-600',
  blue: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-700',
  violet: 'bg-violet-100 text-violet-800',
};

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof TONES | string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.02em] ${TONES[tone] || TONES.gray}`}>
      {children}
    </span>
  );
}

export const ORDER_TONE: Record<string, string> = {
  PENDING: 'amber',
  PROCESSING: 'blue',
  SHIPPED: 'violet',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export const STATUS_TONE: Record<string, string> = {
  Berjalan: 'green',
  Terjadwal: 'blue',
  Selesai: 'gray',
  Nonaktif: 'red',
};

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
        checked ? 'bg-emerald-600' : 'bg-slate-300'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="space-y-3 py-2" role="status" aria-label={label}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-surface" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p className="font-bold">Gagal memuat data</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 font-bold underline">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="font-bold text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Pagination({
  page,
  pages,
  count,
  onPage,
}: {
  page: number;
  pages: number;
  count: number;
  onPage: (page: number) => void;
}) {
  if (pages <= 1) return <p className="px-4 py-3 text-xs text-slate-500">{count} data</p>;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm">
      <span className="text-xs text-slate-500">
        {count} data · halaman {page} dari {pages}
      </span>
      <div className="flex gap-2">
        <button type="button" className={btn.small} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹ Sebelumnya
        </button>
        <button type="button" className={btn.small} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Berikutnya ›
        </button>
      </div>
    </div>
  );
}

/** Panel samping (desktop) / layar penuh (HP) untuk form. */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-mist shadow-2xl sm:h-full sm:max-h-none sm:max-w-lg sm:rounded-none sm:rounded-l-3xl">
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-center justify-between border-b border-slate-200 bg-surface px-5 py-4">
          <h2 className="text-base font-extrabold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-mist" aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-slate-200 bg-surface px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">{footer}</div>}
      </div>
    </div>
  );
}

/** Tombol dengan konfirmasi dua langkah (tanpa dialog browser). */
export function ConfirmButton({
  children,
  confirmText = 'Yakin?',
  onConfirm,
  className = btn.small,
}: {
  children: React.ReactNode;
  confirmText?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const timer = window.setTimeout(() => setAsking(false), 4000);
    return () => window.clearTimeout(timer);
  }, [asking]);
  return asking ? (
    <button type="button" className={`${className} !bg-red-600 !text-white !ring-red-600`} onClick={() => { setAsking(false); onConfirm(); }}>
      {confirmText}
    </button>
  ) : (
    <button type="button" className={className} onClick={() => setAsking(true)}>
      {children}
    </button>
  );
}

/** Tab filter bergaris bawah (nav-tabs Tabler), dengan angka opsional. */
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-slate-200" role="tablist">
        {items.map((item) => {
          const on = value === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(item.value)}
              className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                on ? 'border-ink text-ink' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-ink'
              }`}
            >
              {item.label}
              {item.count !== undefined && (
                <span className={`rounded px-1.5 text-[11px] font-semibold ${on ? 'bg-ink text-surface' : 'bg-mist text-slate-600'}`}>{item.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Kartu angka ringkas (gaya "card-sm" Tabler): kotak ikon berwarna + angka + keterangan. */
export function StatCard({
  icon,
  tone = 'ink',
  label,
  value,
  foot,
}: {
  icon: React.ReactNode;
  tone?: 'ink' | 'red' | 'green' | 'amber' | 'blue';
  label: string;
  value: React.ReactNode;
  foot?: React.ReactNode;
}) {
  const tones = {
    ink: 'bg-ink text-surface',
    red: 'bg-sale-600 text-white',
    green: 'bg-emerald-600 text-white',
    amber: 'bg-amber-500 text-white',
    blue: 'bg-sky-600 text-white',
  };
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-surface p-3.5 shadow-[0_2px_4px_rgba(24,36,51,0.04)] sm:flex-row sm:items-center sm:p-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10 ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-4 text-slate-500 sm:text-sm">{label}</p>
        <p className="mt-0.5 break-words text-base font-bold leading-6 text-ink tabular-nums sm:text-xl">{value}</p>
        {foot && <div className="mt-0.5 text-xs leading-4">{foot}</div>}
      </div>
    </div>
  );
}

export function Thumb({ src, alt = '' }: { src?: string | null; alt?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="h-11 w-11 shrink-0 rounded-md border border-slate-200 bg-white object-contain" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-mist text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
      FOTO
    </span>
  );
}
