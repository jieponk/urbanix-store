'use client';

import { useEffect, useState } from 'react';
import { VOUCHER_EVENT, claimVoucher, getClaimed, voucherEndText, type VoucherInfo } from '@/lib/vouchers';

function useClaimed(code: string) {
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    const sync = () => setClaimed(getClaimed().includes(code));
    sync();
    window.addEventListener(VOUCHER_EVENT, sync);
    return () => window.removeEventListener(VOUCHER_EVENT, sync);
  }, [code]);
  return claimed;
}

function TicketIcon({ shipping }: { shipping: boolean }) {
  return shipping ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.5" />
      <circle cx="17" cy="17" r="2.5" />
    </svg>
  );
}

/** Kartu voucher bergaya tiket dengan tombol Klaim. */
export default function VoucherCard({ voucher, compact = false }: { voucher: VoucherInfo; compact?: boolean }) {
  const claimed = useClaimed(voucher.code);
  const [showTerms, setShowTerms] = useState(false);
  const shipping = voucher.type === 'FREE_SHIPPING';
  const ends = voucherEndText(voucher.ends_at);

  return (
    <div className={`flex overflow-hidden rounded-2xl bg-surface ring-1 ring-slate-200 ${compact ? 'min-w-[260px]' : ''}`}>
      {/* Potongan tiket */}
      <div
        className={`relative flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 px-2 text-center ${
          shipping ? 'bg-emerald-700 text-white' : 'bg-sale-600 text-white'
        }`}
      >
        <TicketIcon shipping={shipping} />
        <span className="text-[10px] font-bold leading-tight">{shipping ? 'Ongkir' : 'Diskon'}</span>
        <span className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-mist" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 border-l-2 border-dashed border-slate-200 p-3">
        <p className="text-sm font-extrabold leading-snug text-ink">{voucher.headline}</p>
        <p className="truncate text-xs text-slate-500">{voucher.terms[0]}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowTerms((v) => !v)}
            className="-my-2 min-w-[24px] py-2 text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-ink hover:underline"
            aria-expanded={showTerms}
          >
            S&K{ends ? ` · s/d ${ends}` : ''}
          </button>
          <button
            type="button"
            onClick={() => claimVoucher(voucher.code)}
            disabled={claimed}
            className={`h-8 shrink-0 rounded-full px-4 text-xs font-bold transition ${
              claimed ? 'bg-mist text-slate-500' : 'bg-ink text-surface hover:bg-slate-800'
            }`}
          >
            {claimed ? 'Diklaim ✓' : 'Klaim'}
          </button>
        </div>
        {showTerms && (
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-slate-600">
            {voucher.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
            <li>
              Kode: <b className="text-ink">{voucher.code}</b>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

/** Deretan voucher (beranda / halaman produk). */
export function VoucherStrip({
  vouchers,
  title,
  stacked = false,
}: {
  vouchers: VoucherInfo[];
  title?: string;
  /** true = tersusun ke bawah (kolom sempit, mis. halaman produk) */
  stacked?: boolean;
}) {
  if (vouchers.length === 0) return null;
  return (
    <div>
      {title && <p className="mb-2 text-sm font-bold text-ink">{title}</p>}
      <div
        className={
          stacked
            ? 'scroll-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0'
            : 'scroll-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3'
        }
      >
        {vouchers.map((v) => (
          <div key={v.code} className="w-[82%] shrink-0 sm:w-auto">
            <VoucherCard voucher={v} />
          </div>
        ))}
      </div>
    </div>
  );
}
