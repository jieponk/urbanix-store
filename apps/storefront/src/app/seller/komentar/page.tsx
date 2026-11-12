'use client';

import { useRef, useState } from 'react';
import { Badge, Card, ConfirmButton, Empty, ErrorBox, PageHeader, Pagination, Spinner, Tabs, btn, inputCls } from '@/components/seller/ui';
import { Emoji, EmojiPicker, GifPicker, RichText, type Gif } from '@/components/inspirasi/CommentSection';
import { REACTIONS } from '@/lib/emoji';
import { fmtDateTime, notify, query, sellerApi, useSellerData } from '@/lib/seller';

/** Form balasan admin: teks + emoji bergerak + GIF. */
function ReplyBox({ c, onSent, onCancel }: { c: any; onSent: () => void; onCancel: () => void }) {
  const [body, setBody] = useState(c.is_staff_reply ? '' : `@${String(c.name).replace(/\s+/g, '')} `);
  const [gif, setGif] = useState<Gif | null>(null);
  const [panel, setPanel] = useState<'' | 'emoji' | 'gif'>('');
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  function insert(text: string) {
    const el = area.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + text.length, start + text.length);
    });
  }

  async function send() {
    setSending(true);
    try {
      await sellerApi(`article-comments/${c.id}`, { method: 'POST', body: { body: body.trim(), gif_url: gif?.url || '' } });
      notify('Balasan terkirim dan langsung tampil.');
      onSent();
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setSending(false);
    }
  }

  const tool = (active: boolean) =>
    `flex h-9 items-center rounded-full px-3 text-xs font-black transition ${active ? 'bg-ink text-surface' : 'text-slate-500 ring-1 ring-slate-200 hover:text-ink'}`;

  return (
    <div className="mt-3 rounded-2xl bg-mist p-3">
      <textarea
        ref={area}
        autoFocus
        className={`${inputCls} min-h-[70px]`}
        placeholder="Tulis balasan sebagai Admin Urbanix…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {gif && (
        <div className="relative mt-2 inline-block">
          <img src={gif.url} alt="GIF" className="max-h-36 rounded-xl" />
          <button
            type="button"
            onClick={() => setGif(null)}
            aria-label="Hapus GIF"
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Emoji" className={tool(panel === 'emoji')} onClick={() => setPanel(panel === 'emoji' ? '' : 'emoji')}>
          <Emoji char="😀" className="h-5 w-5" />
        </button>
        <button type="button" aria-label="GIF" className={tool(panel === 'gif')} onClick={() => setPanel(panel === 'gif' ? '' : 'gif')}>
          <span className="rounded border-2 border-current px-1 text-[10px] leading-3">GIF</span>
        </button>
        <span className="ml-auto flex gap-2">
          <button type="button" className={btn.small} onClick={onCancel}>Batal</button>
          <button type="button" disabled={sending || (!body.trim() && !gif)} className={btn.primary} onClick={send}>
            {sending ? 'Mengirim…' : 'Kirim balasan'}
          </button>
        </span>
      </div>
      {panel === 'emoji' && <EmojiPicker onPick={insert} onClose={() => setPanel('')} />}
      {panel === 'gif' && <GifPicker onPick={(g) => { setGif(g); setPanel(''); }} onClose={() => setPanel('')} />}
    </div>
  );
}

export default function CommentsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useSellerData<any>(`article-comments${query({ status, page, size: 20 })}`);
  const [replying, setReplying] = useState<number | null>(null);

  async function act(c: any, body: Record<string, unknown>, message: string) {
    try {
      await sellerApi(`article-comments/${c.id}`, { method: 'PATCH', body });
      notify(message);
      reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  return (
    <div>
      <PageHeader
        title="Komentar artikel"
        subtitle="Komentar langsung tampil. Yang berisi link atau kata kasar masuk tab Menunggu untuk dicek dulu."
      />
      <div className="mb-4">
        <Tabs
          items={[
            { value: '', label: 'Semua' },
            { value: 'pending', label: 'Menunggu', count: data?.pending },
            { value: 'approved', label: 'Tampil' },
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
            {data.results.map((c: any) => {
              const reactions = Object.entries((c.reactions || {}) as Record<string, number>);
              return (
                <li key={c.id} className="px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <b className="text-ink">{c.name}</b>
                    {c.email && <span className="text-xs text-slate-500">{c.email}</span>}
                    {c.is_staff_reply ? <Badge tone="blue">Balasan admin</Badge> : c.is_approved ? <Badge tone="green">Tampil</Badge> : <Badge tone="amber">Menunggu</Badge>}
                    {c.is_pinned && <Badge tone="blue">📌 Disematkan</Badge>}
                    {c.parent_id && <span className="text-xs text-slate-500">· balasan</span>}
                    <span className="text-xs text-slate-500">{fmtDateTime(c.created_at)}</span>
                  </div>
                  <a href={`/inspirasi/${c.article.slug}#komentar`} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-xs font-semibold text-slate-500 hover:text-ink">
                    di: {c.article.title}
                  </a>
                  {c.body && (
                    <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-mist px-3 py-2 text-[15px] leading-6 text-ink">
                      <RichText text={c.body} />
                    </p>
                  )}
                  {c.gif_url && <img src={c.gif_url} alt="GIF" loading="lazy" className="mt-2 max-h-40 rounded-xl" />}

                  {/* Reaksi pembaca + reaksi admin */}
                  {c.is_approved && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {reactions.length > 0 && (
                        <span className="mr-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                          {reactions.map(([e, n]) => (
                            <span key={e} className="inline-flex items-center gap-0.5">
                              <Emoji char={e} className="h-4 w-4" />
                              {n}
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-500">Reaksi admin:</span>
                      {REACTIONS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          aria-label={`Reaksi ${e}`}
                          aria-pressed={c.staff_reaction === e}
                          onClick={() => act(c, { reaction: c.staff_reaction === e ? '' : e }, c.staff_reaction === e ? 'Reaksi dihapus.' : 'Reaksi terkirim.')}
                          className={`rounded-full p-1 transition hover:scale-125 ${c.staff_reaction === e ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-white/10' : ''}`}
                        >
                          <Emoji char={e} className="h-6 w-6" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!c.is_approved ? (
                      <button type="button" className={btn.small} onClick={() => act(c, { is_approved: true }, 'Komentar ditampilkan.')}>✓ Tampilkan</button>
                    ) : !c.is_staff_reply && (
                      <button type="button" className={btn.small} onClick={() => act(c, { is_approved: false }, 'Komentar disembunyikan.')}>Sembunyikan</button>
                    )}
                    {!c.parent_id && (
                      <button type="button" className={btn.small} onClick={() => act(c, { is_pinned: !c.is_pinned }, c.is_pinned ? 'Sematan dilepas.' : 'Komentar disematkan di paling atas.')}>
                        {c.is_pinned ? 'Lepas sematan' : '📌 Sematkan'}
                      </button>
                    )}
                    <button type="button" className={btn.small} onClick={() => setReplying(replying === c.id ? null : c.id)}>Balas</button>
                    <ConfirmButton className={btn.small} confirmText="Hapus?" onConfirm={async () => {
                      await sellerApi(`article-comments/${c.id}`, { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
                      reload();
                    }}>Hapus</ConfirmButton>
                  </div>
                  {replying === c.id && (
                    <ReplyBox c={c} onCancel={() => setReplying(null)} onSent={() => { setReplying(null); reload(); }} />
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pages={data.pages} count={data.count} onPage={setPage} />
        </Card>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Membalas komentar yang ditahan otomatis menampilkannya. Hanya komentar utama yang bisa disematkan.
      </p>
    </div>
  );
}
