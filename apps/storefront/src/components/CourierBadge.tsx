import { courierName, type CourierKey } from '@/lib/shipping';

const TEXT_STYLE: Record<CourierKey, string> = {
  jne: 'text-[#0b3d91]',
  jnt: 'text-[#e3061e]',
  gosend: 'text-[#00880f]',
  grab: 'text-[#00915a]',
};

/** Logo kurir bila file resminya ada; kalau belum, nama kurir dalam huruf tebal. */
export default function CourierBadge({ courier, logo, className = '' }: { courier: CourierKey; logo?: string; className?: string }) {
  return (
    <span className={`inline-flex h-8 min-w-[72px] items-center justify-center rounded-lg bg-white px-2.5 ring-1 ring-black/5 ${className}`}>
      {logo ? (
        <img src={logo} alt={courierName(courier)} loading="lazy" width={80} height={24} className="h-5 w-auto max-w-[88px] object-contain" />
      ) : (
        <span className={`whitespace-nowrap text-[13px] font-black tracking-tight ${TEXT_STYLE[courier]}`}>{courierName(courier)}</span>
      )}
    </span>
  );
}
