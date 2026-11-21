import { courierName, type CourierKey } from '@/lib/shipping';

const TEXT_STYLE: Record<CourierKey, string> = {
  jne: 'text-[#0b3d91]',
  jnt: 'text-[#e3061e]',
  gosend: 'text-[#00880f]',
  grab: 'text-[#00915a]',
};

/** Logo kurir bila file resminya ada; kalau belum, nama kurir dalam huruf tebal. */
export default function CourierBadge({ courier, logo, label, size = 'sm', className = '' }: { courier: CourierKey; logo?: string; label?: string; size?: 'sm' | 'lg'; className?: string }) {
  return (
    <span className={`inline-flex ${size === 'lg' ? 'h-12 w-full px-3' : 'h-9 min-w-[76px] px-2.5'} items-center justify-center rounded-lg bg-white ring-1 ring-black/5 ${className}`}>
      {logo ? (
        <img src={logo} alt={label ?? courierName(courier)} loading="lazy" width={80} height={24} className={size === 'lg' ? 'h-8 w-auto max-w-full object-contain' : 'h-6 w-auto max-w-[96px] object-contain'} />
      ) : (
        <span className={`whitespace-nowrap text-[13px] font-black tracking-tight ${TEXT_STYLE[courier]}`}>{label ?? courierName(courier)}</span>
      )}
    </span>
  );
}
