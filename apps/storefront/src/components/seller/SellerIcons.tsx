/** Ikon garis untuk menu Seller Center. */
type P = { size?: number; className?: string };

function S({ size = 18, className = '', d }: P & { d: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      <path d={d} />
    </svg>
  );
}

export const icons = {
  dashboard: (p: P) => <S {...p} d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4h6v4h-6zM4 20h6v-3H4z" />,
  orders: (p: P) => <S {...p} d="M6 3h12l1 4H5zM5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 11h6" />,
  products: (p: P) => <S {...p} d="M12 3 3 7.5l9 4.5 9-4.5zM3 12l9 4.5 9-4.5M3 16.5 12 21l9-4.5" />,
  bulk: (p: P) => <S {...p} d="M4 6h16M4 12h16M4 18h10M18 16l2 2-2 2" />,
  promo: (p: P) => <S {...p} d="M20 12 12 20 4 12V4h8zM8.5 8.5h.01" />,
  voucher: (p: P) => <S {...p} d="M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V4H3zM14 4v16" />,
  banner: (p: P) => <S {...p} d="M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6" />,
  article: (p: P) => <S {...p} d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />,
  news: (p: P) => <S {...p} d="M5 4h11a1 1 0 0 1 1 1v14a1 1 0 0 0 1 1H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1ZM17 8h2a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3" />,
  reviews: (p: P) => <S {...p} d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  settings: (p: P) => <S {...p} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />,
  store: (p: P) => <S {...p} d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />,
  menu: (p: P) => <S {...p} d="M4 6h16M4 12h16M4 18h16" />,
  logout: (p: P) => <S {...p} d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" />,
  download: (p: P) => <S {...p} d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  upload: (p: P) => <S {...p} d="M12 20V9M7 14l5-5 5 5M5 4h14" />,
  plus: (p: P) => <S {...p} d="M12 5v14M5 12h14" />,
  chat: (p: P) => <S {...p} d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12z" />,
};

export type IconName = keyof typeof icons;
