'use client';

import { useState } from 'react';
import { Badge, Card, ConfirmButton, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, btn, inputCls } from '@/components/seller/ui';
import { fmtDateTime, notify, query, sellerApi, useSellerData } from '@/lib/seller';

function Stars({ n }: { n: number }) {
  return (
    <span className="text-[#f5b301]" aria-label={`${n} bintang`}>
      {'★'.repeat(n)}
      <span className="text-slate-300">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export default function BuyerReviewsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const filter = /^[1-5]$/.test(status) ? { rating: status } : { status };
  const { data, error, loading, reload } = useSellerData<any>(`product-reviews${query({ ...filter, page, size: 20 })}`);

  async function save(r: any, body: Record<string, unknown>, message: string) {
    try {
      await sellerApi(`product-reviews/${r.id}`, { method: 'PATCH', body });
      notify(message);
      setReplying(null);
      reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Ulasan produk"
        subtitle={
          data?.summary?.count
            ? `Rata-rata ${data.summary.average} ★ dari ${data.summary.count} ulasan pembeli terverifikasi di urbanix.id.`
            : 'Ulasan dari pembeli yang memesan di urbanix.id (link dikirim otomatis lewat email setelah pesanan Selesai).'
        }
      />
      <div className="mb-4">
        <Tabs
          items={[
            { value: '', label: 'Semua' },
            { value: 'unreplied', label: 'Belum dibalas' },
            { value: '5', label: '★5' },
            { value: '4', label: '★4' },
            { value: '3', label: '★3' },
            { value: '2', label: '★2' },
            { value: '1', label: '★1' },
            { value: 'hidden', label: 'Disembunyikan' },
          ]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.results?.length ? (
        <Card><Empty title="Belum ada ulasan" /></Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-200">
            {data.results.map((r: any) => (
              <li key={r.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Stars n={r.rating} />
                  <b className="text-ink">{r.name}</b>
                  {!r.is_visible && <Badge tone="amber">Disembunyikan</Badge>}
                  <span className="text-xs text-slate-500">{fmtDateTime(r.created_at)} · {r.order_number}</span>
                </div>
                <a href={`/produk/${r.product.id}#ulasan`} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs font-semibold text-slate-500 hover:text-ink">
                  {r.product.name}{r.variation_name ? ` · ${r.variation_name}` : ''}
                </a>
                {r.body && <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-mist px-3 py-2 text-sm text-ink">{r.body}</p>}
                {r.photo_url && (
                  <a href={r.photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={r.photo_url} alt="Foto ulasan" className="mt-2 h-24 w-24 rounded-xl object-cover" />
                  </a>
                )}
                {r.staff_reply && replying !== r.id && (
                  <p className="mt-2 rounded-xl border-l-4 border-brand-500 bg-mist px-3 py-2 text-sm text-slate-600">
                    <b className="text-ink">Balasan toko:</b> {r.staff_reply}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={btn.small} onClick={() => { setReplying(replying === r.id ? null : r.id); setReply(r.staff_reply || ''); }}>
                    {r.staff_reply ? 'Ubah balasan' : 'Balas'}
                  </button>
                  <button
                    type="button"
                    className={btn.small}
                    onClick={() => save(r, { is_visible: !r.is_visible }, r.is_visible ? 'Ulasan disembunyikan.' : 'Ulasan ditampilkan.')}
                  >
                    {r.is_visible ? 'Sembunyikan' : 'Tampilkan'}
                  </button>
                  <ConfirmButton className={btn.small} confirmText="Hapus permanen?" onConfirm={async () => {
                    await sellerApi(`product-reviews/${r.id}`, { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
                    reload();
                  }}>Hapus</ConfirmButton>
                </div>
                {replying === r.id && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <textarea className={`${inputCls} min-h-[70px]`} placeholder="Balasan Urbanix Store (tampil di bawah ulasan)…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <button type="button" className={btn.primary} onClick={() => save(r, { staff_reply: reply }, reply.trim() ? 'Balasan disimpan.' : 'Balasan dihapus.')}>
                      Simpan
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
        </Card>
      )}
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Sembunyikan hanya ulasan berisi spam, kata kasar, atau data pribadi. Ulasan jujur yang kurang bagus sebaiknya
        dibalas, bukan disembunyikan, karena Google melarang menyaring ulasan agar hanya yang bagus yang tampil.
      </p>
    </div>
  );
}
