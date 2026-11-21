'use client';

import { usePathname } from 'next/navigation';

/** Header & footer toko disembunyikan di Seller Center (/seller), yang punya tampilan sendiri. */
export default function ShopChrome({
  header,
  footer,
  children,
  seller = false,
}: {
  /** true di seller.urbanix.id (dari header x-seller middleware): semua halaman milik Seller Center. */
  seller?: boolean;
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || '';
  if (seller || pathname === '/seller' || pathname.startsWith('/seller/')) return <>{children}</>;
  return (
    <>
      {/* "contents" agar header tetap sticky; disembunyikan saat mencetak (mis. invoice) */}
      <div className="contents print:hidden">{header}</div>
      <main className="flex-1">{children}</main>
      <div className="contents print:hidden">{footer}</div>
    </>
  );
}
