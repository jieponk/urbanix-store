'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/* Komponen kecil yang dipakai berulang di Seller Center. Warna mengikuti tema toko (terang/gelap). */

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-surface transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50',
  brand:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-slate-200 transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50',
  small:
    'inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-xs font-bold text-ink ring-1 ring-slate-200 transition hover:bg-mist disabled:opacity-50',
};

export const inputCls =
  'w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-sm text-ink ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ink';

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
    <section className={`rounded-2xl bg-surface ring-1 ring-slate-200 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-extrabold text-ink">{title}</h2>
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
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${TONES[tone] || TONES.gray}`}>
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
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-ink" />
      {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
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
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-mist shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-surface px-5 py-4">
          <h2 className="text-base font-extrabold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-mist" aria-label="Tutup">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-slate-200 bg-surface px-5 py-3">{footer}</div>}
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

/** Tab filter berbentuk pil, dengan angka opsional. */
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
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-bold transition ${
            value === item.value ? 'bg-ink text-surface' : 'bg-surface text-ink ring-1 ring-slate-200 hover:bg-mist'
          }`}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={`ml-1.5 text-xs ${value === item.value ? 'opacity-80' : 'text-slate-500'}`}>{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Thumb({ src, alt = '' }: { src?: string | null; alt?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
  ) : (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-mist text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
      FOTO
    </span>
  );
}
