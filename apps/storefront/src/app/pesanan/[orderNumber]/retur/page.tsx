import ReturnForm from '@/components/ReturnForm';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { orderNumber: string } }) {
  const no = decodeURIComponent(params.orderNumber || '').toUpperCase();
  return { title: `Pengembalian ${no}`, robots: { index: false, follow: false } };
}

export default function ReturnPage({ params }: { params: { orderNumber: string } }) {
  return <ReturnForm orderNumber={decodeURIComponent(params.orderNumber)} />;
}
