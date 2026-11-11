'use client';

import { useState } from 'react';
import type { ArticleComment } from '@/lib/api';

function when(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

function Avatar({ name, staff }: { name: string; staff?: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
        staff ? 'bg-cobalt-900 text-sun-400' : 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-500'
      }`}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function Item({ c, reply = false }: { c: ArticleComment; reply?: boolean }) {
  return (
    <div className={`flex gap-3 ${reply ? 'mt-4' : ''}`}>
      <Avatar name={c.name} staff={c.is_staff_reply} />
      <div className="min-w-0 flex-1">
        <div className={`rounded-2xl px-4 py-3 ${c.is_staff_reply ? 'bg-cobalt-900/5 ring-1 ring-cobalt-700/20 dark:bg-white/5' : 'bg-mist'}`}>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <b className="text-ink">{c.name}</b>
            {c.is_staff_reply && <span className="rounded-full bg-cobalt-900 px-2 py-0.5 text-[10px] font-bold text-white">ADMIN</span>}
            <span className="text-xs text-slate-500">{when(c.created_at)}</span>
          </p>
          <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-7 text-slate-700">{c.body}</p>
        </div>
        {c.replies?.map((r) => (
          <Item key={r.id} c={r} reply />
        ))}
      </div>
    </div>
  );
}

/** Daftar komentar yang sudah disetujui + form komentar baru (masuk antrean moderasi). */
export default function CommentSection({ slug, comments, open }: { slug: string; comments: ArticleComment[]; open: boolean }) {
  const [form, setForm] = useState({ name: '', email: '', body: '', website: '' });
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ status: 'idle' });
  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);
  const input =
    'w-full rounded-xl border border-slate-200 bg-surface px-4 py-3 text-base text-ink outline-none placeholder:text-slate-400 focus:border-ink';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: 'sending' });
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          status: 'error',
          message: res.status === 429 ? 'Terlalu banyak komentar. Tunggu sebentar lalu coba lagi.' : data.error || 'Gagal mengirim komentar.',
        });
        return;
      }
      setState({ status: 'done', message: data.message });
      setForm({ name: form.name, email: form.email, body: '', website: '' });
    } catch {
      setState({ status: 'error', message: 'Koneksi terputus. Coba lagi.' });
    }
  }

  return (
    <section id="komentar" className="scroll-mt-28" aria-labelledby="komentar-heading">
      <h2 id="komentar-heading" className="text-2xl font-extrabold tracking-tight text-ink">
        Komentar {total > 0 && <span className="text-slate-500">({total})</span>}
      </h2>

      {comments.length > 0 ? (
        <div className="mt-6 space-y-6">
          {comments.map((c) => (
            <Item key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-slate-600">Belum ada komentar. Jadilah yang pertama!</p>
      )}

      {open ? (
        <form onSubmit={submit} className="mt-8 rounded-3xl bg-surface p-5 ring-1 ring-slate-200 sm:p-7">
          <p className="text-lg font-extrabold text-ink">Tulis komentar</p>
          <p className="mt-1 text-sm text-slate-500">Komentar tampil setelah dicek admin. Email tidak akan ditampilkan.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-ink">Nama</span>
              <input required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} autoComplete="name" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-ink">Email (opsional)</span>
              <input type="email" maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} autoComplete="email" />
            </label>
          </div>
          {/* Kolom jebakan bot: disembunyikan dari manusia */}
          <label className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </label>
          <label className="mt-3 block">
            <span className="mb-1.5 block text-sm font-bold text-ink">Komentar</span>
            <textarea
              required
              minLength={3}
              maxLength={1500}
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className={`${input} resize-y`}
              placeholder="Tulis pendapat atau pertanyaanmu…"
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={state.status === 'sending'}
              className="rounded-xl bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {state.status === 'sending' ? 'Mengirim…' : 'Kirim komentar'}
            </button>
            <span className="text-xs text-slate-500">{form.body.length}/1500</span>
          </div>
          {state.message && (
            <p
              role="status"
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                state.status === 'done' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
              }`}
            >
              {state.message}
            </p>
          )}
        </form>
      ) : (
        <p className="mt-6 rounded-2xl bg-mist px-5 py-4 text-sm text-slate-600">Komentar untuk artikel ini ditutup.</p>
      )}
    </section>
  );
}
