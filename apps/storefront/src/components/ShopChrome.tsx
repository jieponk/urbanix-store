'use client';

import { usePathname } from 'next/navigation';

/** Header & footer toko disembunyikan di Seller Center (/seller), yang punya tampilan sendiri. */
export default function ShopChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  if (pathname === '/seller' || pathname.startsWith('/seller/')) return <>{children}</>;
  return (
    <>
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </>
  );
}
