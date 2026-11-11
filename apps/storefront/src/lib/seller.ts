'use client';

import { useCallback, useEffect, useState } from 'react';

/** Panggil API Seller Center lewat proxy Next.js (/api/seller/...). Token ada di cookie httpOnly. */
export async function sellerApi<T = any>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const init: RequestInit = { method: options.method || (options.body ? 'POST' : 'GET') };
  if (options.body instanceof FormData) {
    init.body = options.body;
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  const response = await fetch(`/api/seller/${path.replace(/^\/+/, '')}`, init);
  if (response.status === 401) {
    const next = window.location.pathname + window.location.search;
    window.location.href = `/seller/login?next=${encodeURIComponent(next)}`;
    throw new Error('Sesi habis, silakan login lagi.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.detail || 'Terjadi kesalahan. Coba lagi.');
  return data as T;
}

/** Ambil data saat halaman dibuka / path berubah. */
export function useSellerData<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await sellerApi<T>(path));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/** Notifikasi kecil di pojok layar (ditampilkan oleh SellerShell). */
export function notify(message: string, type: 'success' | 'error' = 'success') {
  window.dispatchEvent(new CustomEvent('seller-toast', { detail: { message, type } }));
}

export const rp = (value: number | string | null | undefined) =>
  `Rp${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;

export const shortRp = (value: number) => {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)} rb`;
  return rp(value);
};

export const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
      })
    : '-';

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-';

/** ISO -> nilai <input type="datetime-local"> (jam lokal). */
export function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

/** Angka dari input bebas: "1.250.000" / "Rp 1.250.000" -> 1250000. */
export const parseNumber = (value: string) => Number(String(value).replace(/[^\d,-]/g, '').replace(',', '.')) || 0;

export function query(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  }
  const text = q.toString();
  return text ? `?${text}` : '';
}
