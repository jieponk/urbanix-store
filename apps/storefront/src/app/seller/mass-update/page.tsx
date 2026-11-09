'use client';

import Link from 'next/link';
import { useState } from 'react';
import { icons } from '@/components/seller/SellerIcons';
import { Badge, Card, PageHeader, btn, inputCls } from '@/components/seller/ui';
import { notify, sellerApi } from '@/lib/seller';

type Result = {
  applied: boolean;
  changes: { line: number; name: string; sku: string; changes: Record<string, { from: any; to: any }> }[];
  errors: string[];
  error_count: number;
};

export default function MassUpdatePage() {
  const [filter, setFilter] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(apply: boolean) {
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    setBusy(true);
    try {
      const r = await sellerApi<Result>(`products/import${apply ? '?apply=1' : ''}`, { body });
      setResult(r);
      if (apply) {
        notify(`${r.changes.length} baris diperbarui.`);
        setFile(null);
      }
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Mass update"
        subtitle="Ubah harga, stok, link Shopee, dan status tampil banyak SKU sekaligus lewat Excel."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="1. Unduh template">
          <p className="text-sm text-slate-600">File berisi semua SKU (produk tanpa varian + tiap varian) beserta harga dan stok saat ini.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <select className={`${inputCls} w-auto`} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Isi template">
              <option value="">Produk aktif</option>
              <option value="all">Semua produk</option>
              <option value="low_stock">Stok menipis</option>
              <option value="no_shopee">Tanpa link Shopee</option>
              <option value="inactive">Disembunyikan</option>
            </select>
            <a href={`/api/seller/products/template${filter ? `?filter=${filter}` : ''}`} className={btn.primary}>
              {icons.download({ size: 16 })} Unduh template Excel
            </a>
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>Ubah kolom <b>Harga normal</b>, <b>Stok</b>, <b>Link Shopee</b>, atau <b>Aktif</b> (ya/tidak).</li>
            <li>Jangan ubah kolom product_id, variation_id, dan SKU.</li>
            <li>Harga promo diatur di menu <Link href="/seller/promo" className="font-bold underline">Promo harga</Link>.</li>
          </ol>
        </Card>

        <Card title="2. Upload & cek">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-ink">
            {icons.upload({ size: 24, className: 'text-slate-500' })}
            <span className="text-sm font-bold text-ink">{file ? file.name : 'Pilih file .xlsx atau .csv'}</span>
            <span className="text-xs text-slate-500">Perubahan belum disimpan sampai kamu klik Terapkan.</span>
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
          </label>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={!file || busy} className={btn.ghost} onClick={() => send(false)}>{busy ? 'Memeriksa…' : 'Cek perubahan'}</button>
            <button type="button" disabled={!file || busy || !result || result.applied || result.changes.length === 0} className={btn.brand} onClick={() => send(true)}>
              Terapkan {result && !result.applied ? `${result.changes.length} perubahan` : ''}
            </button>
          </div>
        </Card>
      </div>

      {result && (
        <Card className="mt-4" title={result.applied ? 'Perubahan tersimpan' : 'Pratinjau perubahan'} padded={false}
          action={<span className="flex gap-2"><Badge tone="green">{result.changes.length} berubah</Badge>{result.error_count > 0 && <Badge tone="red">{result.error_count} error</Badge>}</span>}>
          {result.errors.length > 0 && (
            <ul className="space-y-1 border-b border-slate-200 bg-red-50 px-5 py-3 text-sm text-red-700">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {result.changes.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Tidak ada perubahan dibanding data sekarang.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <tr><th className="px-5 py-2.5">Baris</th><th className="px-3 py-2.5">Produk</th><th className="px-5 py-2.5">Perubahan</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {result.changes.map((c) => (
                    <tr key={c.line}>
                      <td className="px-5 py-2.5 text-slate-500">{c.line}</td>
                      <td className="px-3 py-2.5"><b className="text-ink">{c.name}</b><span className="block text-xs text-slate-500">{c.sku}</span></td>
                      <td className="px-5 py-2.5">
                        {Object.entries(c.changes).map(([field, v]) => (
                          <span key={field} className="mr-3 inline-block text-xs">
                            <b>{field}:</b> <s className="text-slate-500">{String(v.from)}</s> → <b className="text-emerald-700">{String(v.to)}</b>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4" title="Ubah cepat tanpa Excel">
        <p className="text-sm text-slate-600">
          Di menu <Link href="/seller/produk" className="font-bold underline">Produk & SKU</Link>, centang beberapa produk lalu pilih aksi:
          tampilkan/sembunyikan, ubah harga %, set stok, pindah kategori, atau masukkan ke promo.
        </p>
      </Card>
    </div>
  );
}
