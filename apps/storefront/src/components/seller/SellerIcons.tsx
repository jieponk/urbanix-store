/** Ikon menu Seller Center — dari Tabler Icons (components/TablerIcon.tsx). */
import TablerIcon, { type TablerName } from '@/components/TablerIcon';

type P = { size?: number; className?: string };

function T({ size = 18, className = '', n }: P & { n: TablerName }) {
  return <TablerIcon name={n} size={size} className={`shrink-0 ${className}`} />;
}

export const icons = {
  dashboard: (p: P) => <T {...p} n="layout-dashboard" />,
  log: (p: P) => <T {...p} n="clock" />,
  orders: (p: P) => <T {...p} n="clipboard-list" />,
  products: (p: P) => <T {...p} n="package" />,
  bulk: (p: P) => <T {...p} n="table-import" />,
  promo: (p: P) => <T {...p} n="discount" />,
  voucher: (p: P) => <T {...p} n="ticket" />,
  banner: (p: P) => <T {...p} n="photo" />,
  article: (p: P) => <T {...p} n="pencil" />,
  news: (p: P) => <T {...p} n="news" />,
  reviews: (p: P) => <T {...p} n="star" />,
  settings: (p: P) => <T {...p} n="settings" />,
  store: (p: P) => <T {...p} n="building-store" />,
  menu: (p: P) => <T {...p} n="menu-2" />,
  logout: (p: P) => <T {...p} n="logout" />,
  download: (p: P) => <T {...p} n="download" />,
  upload: (p: P) => <T {...p} n="upload" />,
  plus: (p: P) => <T {...p} n="plus" />,
  bell: (p: P) => <T {...p} n="bell" />,
  search: (p: P) => <T {...p} n="search" />,
  palette: (p: P) => <T {...p} n="palette" />,
  grid: (p: P) => <T {...p} n="layout-grid" />,
  collapse: (p: P) => <T {...p} n="layout-sidebar-left-collapse" />,
  expand: (p: P) => <T {...p} n="layout-sidebar-left-expand" />,
  chevron: (p: P) => <T {...p} n="chevron-right" />,
  close: (p: P) => <T {...p} n="x" />,
  chat: (p: P) => <T {...p} n="message-circle" />,
  video: (p: P) => <T {...p} n="video" />,
  layout: (p: P) => <T {...p} n="layout-rows" />,
};

export type IconName = keyof typeof icons;
