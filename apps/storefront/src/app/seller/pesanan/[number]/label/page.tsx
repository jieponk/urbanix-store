'use client';

import { ErrorBox, PageHeader, Spinner, btn } from '@/components/seller/ui';
import { code128Bars } from '@/lib/code128';
import { rp, useSellerData } from '@/lib/seller';

/** Logo kurir hitam-putih yang tersedia di public/couriers (cocok untuk printer thermal). */
const MONO_LOGOS: Record<string, string> = { jne: '/couriers/jne-mono.webp', jnt: '/couriers/jnt-mono.webp' };

function kg(grams: number) {
  return `${(grams / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
}

function tanggal(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
}

/** Label pengiriman 100×150 mm (printer thermal 4×6 / A6). Biteship tidak menyediakan API label. */
export default function ShippingLabelPage({ params }: { params: { number: string } }) {
  const number = decodeURIComponent(params.number);
  const { data, error, loading, reload } = useSellerData<any>(`orders/${encodeURIComponent(number)}`);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (loading && !data) return <Spinner />;
  if (!data) return null;

  const sender = data.shipment?.sender ?? {};
  const L = data.label ?? {};
  const dest = L.destination ?? {};
  const waybill: string = data.tracking_number || '';
  const logo = MONO_LOGOS[L.courier_code];
  const ongkir = L.shipping_cost !== null && L.shipping_cost !== undefined ? rp(Number(L.shipping_cost)) : 'Dikonfirmasi admin';

  return (
    <div>
      <style>{`
        @media print {
          @page { size: 100mm 150mm; margin: 0; }
          body * { visibility: hidden !important; }
          .label-print, .label-print * { visibility: visible !important; }
          .label-print { position: fixed; inset: 0; margin: 0 !important; box-shadow: none !important; }
        }
        .label-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <PageHeader
        back={{ href: `/seller/pesanan/${encodeURIComponent(number)}`, label: number }}
        title="Label pengiriman"
        subtitle="Ukuran 100×150 mm (printer thermal 4×6). Di printer biasa, pilih kertas A6 dan skala 100%."
        actions={<button type="button" className={btn.primary} onClick={() => window.print()}>Cetak label</button>}
      />
      {!waybill && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Nomor resi belum ada. Buat resi dulu di halaman pesanan, atau klik Cek status bila kurir belum menerbitkan resi.
        </p>
      )}

      <div
        className="label-print mx-auto flex flex-col overflow-hidden bg-white text-black ring-1 ring-slate-300"
        style={{ width: '100mm', height: '150mm', padding: '3mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '7.5pt', lineHeight: 1.25 }}
      >
        {/* Kepala: toko + kurir & layanan */}
        <div className="flex items-stretch border-2 border-black">
          <div className="flex flex-1 flex-col justify-center border-r-2 border-black px-2 py-1">
            <p style={{ fontSize: '12pt' }} className="font-black tracking-tight">URBANIX STORE</p>
            <p style={{ fontSize: '6.5pt' }}>urbanix.id · {sender.phone}</p>
          </div>
          <div className="flex w-[40mm] flex-col items-center justify-center px-1.5 py-1 text-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={L.courier_name} className="h-[7mm] w-auto object-contain grayscale" />
            ) : (
              <p style={{ fontSize: '12pt' }} className="font-black leading-none">{L.courier_name || data.shipping_courier}</p>
            )}
            <p style={{ fontSize: '10pt' }} className="mt-0.5 font-black leading-none">{L.service_code || '-'}</p>
            {L.service_name && <p style={{ fontSize: '6.5pt' }}>{L.service_name}</p>}
          </div>
        </div>

        {/* Barcode resi */}
        <div className="border-x-2 border-b-2 border-black px-2 py-1.5 text-center">
          {waybill ? <Barcode value={waybill} height="15mm" /> : <div className="flex h-[15mm] items-center justify-center italic">Resi belum terbit</div>}
          <p style={{ fontSize: '11pt' }} className="font-black tracking-wider">{waybill || '—'}</p>
        </div>

        {/* Info kiriman */}
        <div className="grid grid-cols-4 border-x-2 border-b-2 border-black text-center">
          <Info label="Berat" value={L.weight_grams ? kg(L.weight_grams) : '-'} />
          <Info label="Jumlah" value={`${L.item_count ?? 0} pcs`} />
          <Info label="Ongkir" value={ongkir} />
          <Info label="Bayar" value={L.cod ? 'COD' : 'NON-COD'} strong last />
          <Info label="Serah paket" value={L.method === 'pickup' ? 'Pickup' : L.method === 'drop_off' ? 'Drop off' : '-'} top />
          <Info label="Estimasi" value={L.etd ? `${L.etd} hari` : '-'} top />
          <Info label="Asuransi" value={L.insured ? 'Ya' : 'Tidak'} top />
          <Info label="Tgl resi" value={tanggal(L.created_at).split(',')[0]} top last />
        </div>

        {/* Penerima */}
        <div className="border-x-2 border-b-2 border-black px-2 py-1.5">
          <p style={{ fontSize: '6.5pt' }} className="font-bold uppercase">Penerima</p>
          <p style={{ fontSize: '11pt' }} className="font-black leading-tight">{dest.name}</p>
          <p className="font-bold">{dest.phone}</p>
          <p>{dest.address}</p>
          <p className="font-bold">
            {[dest.city, dest.province].filter(Boolean).join(', ')}
            {dest.postal_code && <span style={{ fontSize: '9pt' }} className="ml-1 rounded-sm border border-black px-1 font-black">{dest.postal_code}</span>}
          </p>
        </div>

        {/* Pengirim */}
        <div className="border-x-2 border-b-2 border-black px-2 py-1">
          <p style={{ fontSize: '6.5pt' }} className="font-bold uppercase">Pengirim</p>
          <p><b>{sender.name}</b> · {sender.phone}</p>
          <p style={{ fontSize: '6.5pt' }}>{sender.address}{sender.postal_code ? `, ${sender.postal_code}` : ''}</p>
        </div>

        {/* Isi paket */}
        <div className="min-h-0 flex-1 overflow-hidden border-x-2 border-b-2 border-black px-2 py-1">
          <table className="w-full" style={{ fontSize: '6.5pt' }}>
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-0.5 font-bold">Isi paket</th>
                <th className="w-8 py-0.5 text-center font-bold">Qty</th>
                <th className="w-12 py-0.5 text-right font-bold">Berat</th>
              </tr>
            </thead>
            <tbody>
              {(L.items ?? []).map((item: any, i: number) => (
                <tr key={i} className="align-top">
                  <td className="py-0.5 pr-1">
                    <span className="line-clamp-2">{item.name}{item.variation ? ` (${item.variation})` : ''}</span>
                    {item.sku && <span className="block text-[5.5pt]">SKU {item.sku}</span>}
                  </td>
                  <td className="py-0.5 text-center font-bold">{item.quantity}</td>
                  <td className="py-0.5 text-right">{kg(item.weight_grams * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.notes && (
            <p className="mt-1 border border-black px-1 py-0.5" style={{ fontSize: '6.5pt' }}>
              <b>Catatan pembeli:</b> {data.notes}
            </p>
          )}
        </div>

        {/* Kaki: no. pesanan */}
        <div className="flex items-center gap-2 border-x-2 border-b-2 border-black px-2 py-1">
          <div className="w-[38mm] shrink-0">
            <Barcode value={data.order_number} height="7mm" />
          </div>
          <div className="min-w-0 flex-1" style={{ fontSize: '6.5pt' }}>
            <p className="font-black" style={{ fontSize: '8pt' }}>{data.order_number}</p>
            <p>Dipesan {tanggal(L.order_created_at)}</p>
            {L.shipment_id && <p className="truncate">Biteship {L.shipment_id}</p>}
          </div>
        </div>
        <p className="pt-0.5 text-center font-bold" style={{ fontSize: '6pt' }}>
          Rekam video unboxing saat membuka paket — wajib untuk klaim retur.
        </p>
      </div>
    </div>
  );
}

function Info({ label, value, strong, last, top }: { label: string; value: string; strong?: boolean; last?: boolean; top?: boolean }) {
  return (
    <div className={`px-0.5 py-1 ${last ? '' : 'border-r border-black'} ${top ? 'border-t border-black' : ''}`}>
      <p style={{ fontSize: '5.5pt' }} className="uppercase">{label}</p>
      <p style={{ fontSize: strong ? '8.5pt' : '7.5pt' }} className="font-black leading-tight">{value}</p>
    </div>
  );
}

function Barcode({ value, height }: { value: string; height: string }) {
  const bars = code128Bars(value);
  const width = bars.width ?? 100;
  return (
    <svg viewBox={`0 0 ${width} 50`} preserveAspectRatio="none" style={{ height, width: '100%' }} role="img" aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={50} fill="#000" />
      ))}
    </svg>
  );
}
