import CheckoutForm from '@/components/CheckoutForm';

export const metadata = { title: 'Checkout' };

export default function CheckoutPage() {
  return (
    <div className="bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-2xl font-black text-slate-900">Checkout</h1>
        <CheckoutForm />
      </div>
    </div>
  );
}
