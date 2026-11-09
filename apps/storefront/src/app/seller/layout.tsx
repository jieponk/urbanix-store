import SellerShell from '@/components/seller/SellerShell';

export const metadata = {
  title: { default: 'Seller Center', template: '%s | Seller Center Urbanix' },
  robots: { index: false, follow: false },
};

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return <SellerShell>{children}</SellerShell>;
}
