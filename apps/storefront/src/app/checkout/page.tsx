import CheckoutForm from '@/components/CheckoutForm';
import { courierLogos } from '@/lib/courierLogos';

export const metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <div className="px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-black text-slate-900">Checkout</h1>
        <CheckoutForm courierLogos={courierLogos()} />
      </div>
    </div>
  );
}
