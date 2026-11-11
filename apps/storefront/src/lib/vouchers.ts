/** Voucher toko: tipe data + "dompet" voucher yang sudah diklaim (disimpan di browser pembeli). */

export type VoucherInfo = {
  code: string;
  title: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
  headline: string;
  value: string;
  max_discount: string | null;
  min_purchase: string;
  for_whatsapp: boolean;
  for_midtrans: boolean;
  exclude_promo: boolean;
  ends_at: string | null;
  terms: string[];
};

const KEY = 'urbanix-vouchers';
export const VOUCHER_EVENT = 'vouchers-updated';

export function getClaimed(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function claimVoucher(code: string) {
  const codes = Array.from(new Set([...getClaimed(), code.toUpperCase()]));
  try {
    localStorage.setItem(KEY, JSON.stringify(codes));
  } catch {
    /* penyimpanan tidak tersedia: kode tetap bisa diketik manual di checkout */
  }
  window.dispatchEvent(new Event(VOUCHER_EVENT));
}

export function voucherEndText(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}
