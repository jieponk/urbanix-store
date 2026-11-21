/** Ikon tampilan yang dipakai berulang — dari Tabler Icons (components/TablerIcon.tsx). Warna ikut teks. */
import TablerIcon, { type TablerName } from '@/components/TablerIcon';

type Props = { size?: number; className?: string };

const make =
  (name: TablerName) =>
  ({ size = 18, className = '' }: Props) => <TablerIcon name={name} size={size} stroke={2.2} className={`shrink-0 ${className}`} />;

export const ArrowLeftIcon = make('arrow-left');
export const ChevronLeftIcon = make('chevron-left');
export const ChevronRightIcon = make('chevron-right');
export const ChevronDownIcon = make('chevron-down');
export const GridIcon = make('layout-grid');
export const CartIcon = make('shopping-cart');
export const NewsIcon = make('news');
export const ExternalIcon = make('external-link');

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full py-1.5 pr-3 text-sm font-semibold text-slate-600 transition hover:text-ink"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface ring-1 ring-slate-200">
        <ArrowLeftIcon size={16} />
      </span>
      {children}
    </a>
  );
}
