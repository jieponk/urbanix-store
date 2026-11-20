'use client';

import { ErrorBox, PageHeader, Spinner, btn } from '@/components/seller/ui';
import { code128Bars } from '@/lib/code128';
import { useSellerData } from '@/lib/seller';

/** Label pengiriman 100×150 mm (printer thermal 4×6 / A6). Biteship tidak menyediakan API label. */
export default function ShippingLabelPage({ params }: { params: { number: string } }) {
  const number = decodeURIComponent(params.number);
  const { data, error, loading, reload } = useSellerData<any>(`orders/${encodeURIComponent(number)}`);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  if (!data) return null;

  const sender = data.shipment?.sender ?? {};
  const waybill: string = data.tracking_number || '';
  const qty = data.items.reduce((n: number, i: any) => n + Number(i.quantity), 0);
  const kg = data.total_weight_grams ? `${(data.total_weight_grams / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg` : '-';

  return (
    <div>
      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          body * { visibility: hidden !important; }
          .label-print, .label-print * { visibility: visible !important; }
          .label-print { position: fixed; inset: 0; margin: 0 !important; box-shadow: none !important; border: 0 !important; }
        }
      `}</style>
      <PageHeader
        back={{ href: `/seller/pesanan/${encodeURIComponent(number)}`, label: number }}
        title="Label pengiriman"
        subtitle="Ukuran 100×150 mm (printer thermal 4×6). Di printer biasa, pilih ukuran kertas A6."
        actions={<button type="button" className={btn.primary} onClick={() => window.print()}>Cetak label</button>}
      />
      {!waybill && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Nomor resi belum ada. Buat resi dulu di halaman pesanan, atau tunggu kurir menerbitkan resi lalu klik Cek status.
        </p>
      )}

      <div
        className="label-print mx-auto flex flex-col overflow-hidden border border-slate-300 bg-white text-black shadow-sm"
        style={{ width: '100mm', height: '150mm', padding: '4mm', fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <div className="flex items-start justify-between border-b-2 border-black pb-2">
          <div>
            <p className="text-[11pt] font-black leading-tight">{data.shipping_service || data.shipping_courier}</p>
            <p className="text-[8pt]">{data.shipment?.method === 'pickup' ? 'Pickup' : 'Drop off'} · {kg} · {qty} barang</p>
          </div>
          <div className="text-right">
            <p className="text-[8pt]">No. pesanan</p>
            <p className="text-[9pt] font-bold">{data.order_number}</p>
          </div>
        </div>

        {waybill && <Barcode value={waybill} />}

        <div className="mt-2 grid grid-cols-1 gap-2 text-[8.5pt] leading-snug">
          <div className="rounded border border-black p-2">
            <p className="text-[7pt] font-bold uppercase">Penerima</p>
            <p className="text-[10pt] font-black">{data.customer_name}</p>
            <p>{data.customer_phone}</p>
            <p>{[data.shipping_address, data.city, data.province, data.postal_code].filter(Boolean).join(', ')}</p>
          </div>
          <div className="rounded border border-black p-2">
            <p className="text-[7pt] font-bold uppercase">Pengirim</p>
            <p className="font-bold">{sender.name}</p>
            <p>{sender.phone}</p>
            <p>{sender.address}{sender.postal_code ? `, ${sender.postal_code}` : ''}</p>
          </div>
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-hidden border-t border-dashed border-black pt-1.5 text-[7.5pt] leading-snug">
          <p className="font-bold">Isi paket</p>
          <ul>
            {data.items.map((item: any, i: number) => (
              <li key={i} className="truncate">
                {item.quantity}× {item.name}{item.variation ? ` (${item.variation})` : ''}
              </li>
            ))}
          </ul>
          {data.notes && <p className="mt-1 italic">Catatan: {data.notes}</p>}
        </div>
        <p className="border-t border-black pt-1 text-center text-[7pt]">Urbanix Store · urbanix.id · Video unboxing wajib untuk klaim</p>
      </div>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  const bars = code128Bars(value);
  const width = bars.width ?? 100;
  return (
    <div className="mt-2 text-center">
      <svg viewBox={`0 0 ${width} 50`} preserveAspectRatio="none" className="h-[18mm] w-full" role="img" aria-label={`Barcode resi ${value}`}>
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={50} fill="#000" />
        ))}
      </svg>
      <p className="text-[11pt] font-black tracking-wider">{value}</p>
    </div>
  );
}
