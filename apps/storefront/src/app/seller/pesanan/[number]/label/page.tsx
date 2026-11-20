'use client';

import { ErrorBox, PageHeader, Spinner, btn } from '@/components/seller/ui';
import { code128Bars } from '@/lib/code128';
import SimpleIcon from '@/components/SimpleIcon';
import { rp, useSellerData } from '@/lib/seller';

/**
 * Logo kurir: file resmi di public/couriers (JNE, J&T) dicetak hitam-putih lewat filter;
 * Gojek & Grab dari Simple Icons (satu warna, hitam). Kurir lain (SiCepat, AnterAja, POS, …) tidak ada
 * di Simple Icons → tampil sebagai teks sampai file logo resminya ditaruh di public/couriers.
 */
const COURIER_LOGOS: Record<string, string> = {
  jne: '/couriers/jne.webp',
  jnt: '/couriers/jnt.webp',
};
const SIMPLE_COURIERS: Record<string, 'gojek' | 'grab'> = { gojek: 'gojek', grab: 'grab' };
const PRINT_BW = { filter: 'grayscale(1) contrast(1.8) brightness(0.55)' };

function kg(grams: number) {
  return `${(grams / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
}

function tgl(value?: string | Date) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

/** Batas kirim = tanggal pesan + 2 hari kerja (kebijakan toko: diproses 2 hari kerja). */
function batasKirim(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  let added = 0;
  while (added < 2) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return tgl(d);
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
  const logo = COURIER_LOGOS[L.courier_code];
  const ongkir = L.shipping_cost !== null && L.shipping_cost !== undefined ? rp(Number(L.shipping_cost)) : '-';
  const side = waybill || data.order_number;

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
        .label-side { writing-mode: vertical-rl; }
      `}</style>
      <PageHeader
        back={{ href: `/seller/pesanan/${encodeURIComponent(number)}`, label: number }}
        title="Label pengiriman"
        subtitle="Ukuran 100×150 mm (printer thermal 4×6). Di printer biasa pilih kertas A6, skala 100%."
        actions={<button type="button" className={btn.primary} onClick={() => window.print()}>Cetak label</button>}
      />
      {!waybill && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Nomor resi belum ada. Buat resi dulu di halaman pesanan, atau klik Cek status bila kurir belum menerbitkan resi.
        </p>
      )}

      <div
        className="label-print relative mx-auto bg-white text-black ring-1 ring-slate-300"
        style={{ width: '100mm', height: '150mm', padding: '4mm 5mm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '7pt', lineHeight: 1.25 }}
      >
        {/* Nomor resi berulang di tepi (seperti label marketplace) */}
        <p className="absolute left-0 right-0 top-[0.8mm] text-center font-bold" style={{ fontSize: '6pt' }}>{side}</p>
        <p className="absolute bottom-[0.8mm] left-0 right-0 text-center font-bold" style={{ fontSize: '6pt' }}>{side}</p>
        <p className="label-side absolute left-[0.6mm] top-1/2 -translate-y-1/2 rotate-180 font-bold" style={{ fontSize: '6pt' }}>{side}</p>
        <p className="label-side absolute right-[0.6mm] top-1/2 -translate-y-1/2 font-bold" style={{ fontSize: '6pt' }}>{side}</p>

        <div className="flex h-full flex-col border-2 border-black">
          {/* Kepala: logo toko · layanan · logo kurir */}
          <div className="flex items-center gap-2 border-b-2 border-dashed border-black px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/urbanix-logo-dark.png" alt="Urbanix" className="h-[11mm] w-auto" />
            <div className="min-w-0 flex-1 text-center">
              <p style={{ fontSize: '15pt' }} className="font-black leading-none tracking-tight">{L.service_code || 'REG'}</p>
              {L.service_name && <p style={{ fontSize: '6.5pt' }} className="font-bold uppercase">{L.service_name}</p>}
            </div>
            <div className="flex w-[26mm] items-center justify-end">
              {SIMPLE_COURIERS[L.courier_code] ? (
                <span className="flex items-center gap-1 font-black text-black" style={{ fontSize: '10pt' }}>
                  <SimpleIcon name={SIMPLE_COURIERS[L.courier_code]} size={30} color="current" title={L.courier_name} />
                </span>
              ) : logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={L.courier_name} className="max-h-[9mm] w-auto max-w-full object-contain" style={PRINT_BW} />
              ) : (
                <span style={{ fontSize: '11pt' }} className="rounded border-2 border-black px-1.5 py-0.5 font-black leading-none">{L.courier_name || '-'}</span>
              )}
            </div>
          </div>

          {/* No. resi + barcode */}
          <div className="border-b-2 border-black px-2 pb-1 pt-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="rounded border border-black px-1.5 font-bold" style={{ fontSize: '7pt' }}>{L.courier_name}</span>
              <span className="rounded border border-black px-1.5 font-black" style={{ fontSize: '9pt' }}>No. Resi: {waybill || '-'}</span>
            </div>
            {waybill ? <Barcode value={waybill} height="16mm" /> : <div className="flex h-[16mm] items-center justify-center italic">Resi belum terbit</div>}
          </div>

          {/* Penerima | Pengirim */}
          <div className="grid grid-cols-[1.35fr_1fr] border-b-2 border-black">
            <div className="border-r border-black px-2 py-1">
              <p><b>Penerima:</b> <b style={{ fontSize: '8.5pt' }}>{dest.name}</b></p>
              <p className="font-bold">{dest.phone}</p>
              <p>{dest.address}</p>
              <p className="font-bold uppercase">
                {[dest.city, dest.province].filter(Boolean).join(', ')}
                {dest.postal_code ? ` ${dest.postal_code}` : ''}
              </p>
            </div>
            <div className="px-2 py-1">
              <p><b>Pengirim:</b> <b>{sender.name}</b></p>
              <p>{sender.phone}</p>
              <p style={{ fontSize: '6pt' }}>{sender.address}</p>
            </div>
          </div>

          {/* Info kiriman + no. pesanan */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b-2 border-black px-2 py-1">
            <div className="space-y-0.5">
              <p><b>Berat:</b> {L.weight_grams ? kg(L.weight_grams) : '-'} &nbsp; <b>COD:</b> {L.cod ? 'Ya' : 'Rp0'} &nbsp; <b>Ongkir:</b> {ongkir}</p>
              <p><b>Batas kirim:</b> {batasKirim(L.order_created_at)} &nbsp; <b>Serah:</b> {L.method === 'pickup' ? 'Pickup' : 'Drop off'}{L.etd ? <> &nbsp; <b>Estimasi:</b> {L.etd} hari</> : null}</p>
              <p><b>No. Pesanan:</b> <b style={{ fontSize: '8pt' }}>{data.order_number}</b></p>
            </div>
            <div className="w-[36mm]"><Barcode value={data.order_number} height="9mm" /></div>
          </div>

          {/* Isi paket */}
          <div className="min-h-0 flex-1 overflow-hidden px-2 py-1">
            <table className="w-full table-fixed" style={{ fontSize: '6pt' }}>
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="w-3 py-0.5">#</th>
                  <th className="py-0.5">Nama Produk</th>
                  <th className="w-[16mm] py-0.5">SKU</th>
                  <th className="w-[14mm] py-0.5">Variasi</th>
                  <th className="w-5 py-0.5 text-center">Qty</th>
                </tr>
              </thead>
              <tbody>
                {(L.items ?? []).map((item: any, i: number) => (
                  <tr key={i} className="border-b border-slate-400 align-top">
                    <td className="py-0.5">{i + 1}</td>
                    <td className="py-0.5 pr-1"><span className="line-clamp-3">{item.name}</span></td>
                    <td className="break-words py-0.5 pr-1">{item.sku}</td>
                    <td className="break-words py-0.5 pr-1">{item.variation || '-'}</td>
                    <td className="py-0.5 text-center font-bold">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.notes && <p className="mt-1" style={{ fontSize: '6pt' }}><b>Pesan pembeli:</b> {data.notes}</p>}
          </div>
          <p className="border-t border-black py-0.5 text-center font-bold" style={{ fontSize: '5.5pt' }}>
            Rekam video unboxing saat membuka paket · urbanix.id
          </p>
        </div>
      </div>
    </div>
  );
}

function Barcode({ value, height }: { value: string; height: string }) {
  const bars = code128Bars(value);
  const width = bars.width ?? 100;
  return (
    <svg viewBox={`0 0 ${width} 50`} preserveAspectRatio="none" style={{ height, width: '100%', display: 'block' }} role="img" aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={50} fill="#000" />
      ))}
    </svg>
  );
}
