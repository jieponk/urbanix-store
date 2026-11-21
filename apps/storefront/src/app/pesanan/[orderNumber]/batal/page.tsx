import CancelForm from '@/components/CancelForm';

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { orderNumber: string } }) {
  const no = decodeURIComponent(params.orderNumber || '').toUpperCase();
  return { title: `Pembatalan ${no}`, robots: { index: false, follow: false } };
}

export default function CancelPage({ params }: { params: { orderNumber: string } }) {
  return <CancelForm orderNumber={decodeURIComponent(params.orderNumber)} />;
}
