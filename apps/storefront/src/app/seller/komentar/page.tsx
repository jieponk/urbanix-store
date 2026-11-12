'use client';

import { useState } from 'react';
import { Badge, Card, ConfirmButton, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, btn, inputCls } from '@/components/seller/ui';
import { fmtDateTime, notify, query, sellerApi, useSellerData } from '@/lib/seller';

export default function CommentsPage() {
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useSellerData<any>(`article-comments${query({ status, page, size: 20 })}`);
  const [replying, setReplying] = useState<number | null>(null);
  const [reply, setReply] = useState('');

  async function act(c: any, body: Record<string, unknown>, message: string) {
    try {
      await sellerApi(`article-comments/${c.id}`, { method: 'PATCH', body });
      notify(message);
      reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  async function sendReply(c: any) {
    try {
      await sellerApi(`article-comments/${c.id}`, { method: 'POST', body: { body: reply } });
      notify('Balasan terkirim dan langsung tampil.');
      setReplying(null);
      setReply('');
      reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHeader title="Komentar artikel" subtitle="Komentar pembeli tampil di artikel setelah kamu setujui." />
      <div className="mb-4">
        <Tabs
          items={[
            { value: 'pending', label: 'Menunggu', count: data?.pending },
            { value: 'approved', label: 'Disetujui' },
            { value: '', label: 'Semua' },
          ]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
        />
      </div>

      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Spinner /> : !data?.results?.length ? (
        <Card><Empty title={status === 'pending' ? 'Tidak ada komentar yang menunggu' : 'Belum ada komentar'} /></Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-slate-200">
            {data.results.map((c: any) => (
              <li key={c.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <b className="text-ink">{c.name}</b>
                  {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                  {c.is_staff_reply ? <Badge tone="blue">Balasan admin</Badge> : c.is_approved ? <Badge tone="green">Tampil</Badge> : <Badge tone="amber">Menunggu</Badge>}
                  <span className="text-xs text-slate-500">{fmtDateTime(c.created_at)}</span>
                </div>
                <a href={`/inspirasi/${c.article.slug}#komentar`} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs font-semibold text-slate-500 hover:text-ink">
                  di: {c.article.title}
                </a>
                {c.body && <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-mist px-3 py-2 text-sm text-ink">{c.body}</p>}
                {c.gif_url && <img src={c.gif_url} alt="GIF" loading="lazy" className="mt-2 max-h-40 rounded-xl" />}
                <div className="mt-3 flex flex-wrap gap-2">
                  {!c.is_approved ? (
                    <button type="button" className={btn.small} onClick={() => act(c, { is_approved: true }, 'Komentar disetujui.')}>✓ Setujui</button>
                  ) : !c.is_staff_reply && (
                    <button type="button" className={btn.small} onClick={() => act(c, { is_approved: false }, 'Komentar disembunyikan.')}>Sembunyikan</button>
                  )}
                  {!c.is_staff_reply && (
                    <button type="button" className={btn.small} onClick={() => { setReplying(replying === c.id ? null : c.id); setReply(''); }}>Balas</button>
                  )}
                  <ConfirmButton className={btn.small} confirmText="Hapus?" onConfirm={async () => {
                    await sellerApi(`article-comments/${c.id}`, { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
                    reload();
                  }}>Hapus</ConfirmButton>
                </div>
                {replying === c.id && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <textarea className={`${inputCls} min-h-[70px]`} placeholder="Tulis balasan sebagai Admin Urbanix…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <button type="button" disabled={reply.trim().length < 2} className={btn.primary} onClick={() => sendReply(c)}>Kirim</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
        </Card>
      )}
      <p className="mt-3 text-xs text-slate-500">Membalas komentar yang belum disetujui otomatis menyetujuinya.</p>
    </div>
  );
}
