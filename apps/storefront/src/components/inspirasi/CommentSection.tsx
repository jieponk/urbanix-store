'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArticleComment } from '@/lib/api';
import { EMOJIS, REACTIONS, emojiUrl, splitEmoji } from '@/lib/emoji';

type C = ArticleComment;
export type Gif = { id: string; title: string; url: string; preview: string; width: number; height: number };

// ------------------------------------------------------------------ util
function store(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key) || '';
    localStorage.setItem(key, value);
  } catch {
    /* mode privat: abaikan */
  }
  return value || '';
}

function visitorId() {
  let id = store('urbanix_visitor');
  if (!/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    store('urbanix_visitor', id);
  }
  return id;
}

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt`;
  if (s < 86400) return `${Math.floor(s / 3600)} j`;
  if (s < 604800) return `${Math.floor(s / 86400)} h`;
  if (s < 2419200) return `${Math.floor(s / 604800)} mgg`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

const AVATAR_COLORS = [
  'from-orange-400 to-rose-500',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-600',
  'from-fuchsia-400 to-purple-600',
  'from-amber-300 to-orange-500',
  'from-cyan-400 to-blue-600',
];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function totalReactions(c: C) {
  return Object.values(c.reactions || {}).reduce((a, b) => a + b, 0);
}

/** Hitung ulang reaksi secara lokal (optimis) sebelum server menjawab. */
function applyReaction(c: C, emoji: string): C {
  const counts = { ...(c.reactions || {}) };
  const prev = c.my_reaction || '';
  const next = prev === emoji ? '' : emoji;
  if (prev) counts[prev] = Math.max(0, (counts[prev] || 1) - 1);
  if (prev && !counts[prev]) delete counts[prev];
  if (next) counts[next] = (counts[next] || 0) + 1;
  return { ...c, reactions: counts, my_reaction: next };
}

// ------------------------------------------------------------------ kecil
export function Emoji({ char, className = 'h-[1.25em] w-[1.25em]' }: { char: string; className?: string }) {
  return (
    <img
      src={emojiUrl(char)}
      alt={char}
      loading="lazy"
      draggable={false}
      className={`inline-block select-none align-[-0.25em] ${className}`}
    />
  );
}

export function RichText({ text }: { text: string }) {
  return (
    <>
      {splitEmoji(text).map((p, i) =>
        p.emoji ? (
          <Emoji key={i} char={p.emoji} />
        ) : (
          p.text!.split(/(@[\p{L}\p{N}_.]+)/u).map((t, j) =>
            t.startsWith('@') ? (
              <span key={`${i}-${j}`} className="font-semibold text-sky-600 dark:text-sky-400">
                {t}
              </span>
            ) : (
              <span key={`${i}-${j}`}>{t}</span>
            )
          )
        )
      )}
    </>
  );
}

function Avatar({ name, staff, small }: { name: string; staff?: boolean; small?: boolean }) {
  const size = small ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  if (staff) {
    return (
      <span className={`relative flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sun-400 via-brand-500 to-fuchsia-600 p-[2px]`}>
        <span className="flex h-full w-full items-center justify-center rounded-full bg-cobalt-900 font-black text-sun-400">U</span>
      </span>
    );
  }
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
        AVATAR_COLORS[hash(name) % AVATAR_COLORS.length]
      } font-extrabold text-white shadow-sm`}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </span>
  );
}

function useOutside(ref: { current: HTMLElement | null }, onOutside: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const fn = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onOutside();
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn);
      document.removeEventListener('keydown', key);
    };
  }, [ref, onOutside, active]);
}

// ------------------------------------------------------------------ reaksi
function ReactionPicker({ mine, onPick, onClose }: { mine?: string; onPick: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, true);
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Pilih reaksi"
      className="animate-pop absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-full bg-surface px-2 py-1.5 shadow-xl ring-1 ring-slate-200"
    >
      {REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          role="menuitem"
          aria-label={`Reaksi ${e}`}
          onClick={() => onPick(e)}
          className={`rounded-full p-1 transition hover:-translate-y-1 hover:scale-125 ${mine === e ? 'bg-brand-50 dark:bg-white/10' : ''}`}
        >
          <Emoji char={e} className="h-8 w-8" />
        </button>
      ))}
    </div>
  );
}

export function ReactionChips({ c }: { c: C }) {
  const entries = Object.entries(c.reactions || {}).filter(([, n]) => n > 0);
  if (!entries.length) return null;
  const total = entries.reduce((a, [, n]) => a + n, 0);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface py-0.5 pl-1 pr-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200">
      <span className="flex -space-x-1">
        {entries.slice(0, 3).map(([e]) => (
          <Emoji key={e} char={e} className="h-4 w-4" />
        ))}
      </span>
      {total}
    </span>
  );
}

// ------------------------------------------------------------------ GIF
export function GifPicker({ onPick, onClose }: { onPick: (g: Gif) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Gif[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setState('loading');
      try {
        const res = await fetch(`/api/gifs?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'GIF tidak bisa dimuat.');
        setItems(data.results || []);
        setState('ok');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'GIF tidak bisa dimuat.');
        setState('error');
      }
    }, q ? 400 : 0);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div ref={ref} className="animate-pop mt-3 rounded-2xl bg-surface p-3 shadow-xl ring-1 ring-slate-200">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari GIF… (mis. wow, keren, ngakak)"
        className="w-full rounded-xl bg-mist px-4 py-2.5 text-base text-ink outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
      />
      <div className="mt-3 h-64 overflow-y-auto overscroll-contain">
        {state === 'loading' && (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-mist" />
            ))}
          </div>
        )}
        {state === 'error' && <p className="py-10 text-center text-sm text-slate-500">{error}</p>}
        {state === 'ok' && items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">GIF tidak ditemukan.</p>}
        {state === 'ok' && (
          <div className="grid grid-cols-3 gap-2">
            {items.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onPick(g)}
                className="overflow-hidden rounded-xl bg-mist ring-brand-500 transition hover:scale-[1.03] focus:outline-none focus:ring-2"
                title={g.title}
              >
                <img src={g.preview} alt={g.title || 'GIF'} loading="lazy" className="h-24 w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="mt-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Powered by GIPHY</p>
    </div>
  );
}

export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, onClose, true);
  return (
    <div ref={ref} className="animate-pop mt-3 rounded-2xl bg-surface p-3 shadow-xl ring-1 ring-slate-200">
      <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            aria-label={e}
            onClick={() => onPick(e)}
            className="flex items-center justify-center rounded-xl p-1.5 transition hover:scale-125 hover:bg-mist"
          >
            <Emoji char={e} className="h-7 w-7" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ form
function Composer({
  slug,
  parent,
  replyTo,
  gifEnabled,
  autoFocus,
  onDone,
  onCancel,
}: {
  slug: string;
  parent?: number;
  replyTo?: string;
  gifEnabled: boolean;
  autoFocus?: boolean;
  onDone: (comment: C | null, message: string, held: boolean) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState('');
  const [editName, setEditName] = useState(false);
  const [body, setBody] = useState(replyTo ? `@${replyTo.replace(/\s+/g, '')} ` : '');
  const [gif, setGif] = useState<Gif | null>(null);
  const [panel, setPanel] = useState<'' | 'emoji' | 'gif'>('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [trap, setTrap] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = store('urbanix_comment_name');
    setName(saved);
    setEditName(!saved);
  }, []);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [body]);

  useEffect(() => {
    if (autoFocus && area.current) {
      area.current.focus();
      const end = area.current.value.length;
      area.current.setSelectionRange(end, end);
    }
  }, [autoFocus]);

  function insert(text: string) {
    const el = area.current;
    if (!el) return setBody((b) => b + text);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + text + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  const ready = name.trim().length >= 2 && (body.trim().length > 0 || gif);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || sending) {
      if (name.trim().length < 2) {
        setEditName(true);
        setError('Isi nama dulu (minimal 2 huruf).');
      }
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), body: body.trim(), gif_url: gif?.url || '', parent, website: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 429 ? 'Terlalu cepat. Tunggu sebentar lalu coba lagi.' : data.error || 'Gagal mengirim komentar.');
        return;
      }
      store('urbanix_comment_name', name.trim());
      setEditName(false);
      setBody('');
      setGif(null);
      setPanel('');
      onDone(data.comment || null, data.message || '', Boolean(data.held));
    } catch {
      setError('Koneksi terputus. Coba lagi.');
    } finally {
      setSending(false);
    }
  }

  const iconBtn = (active: boolean) =>
    `flex h-9 items-center justify-center rounded-full px-2.5 text-xs font-black transition ${
      active ? 'bg-ink text-surface' : 'text-slate-500 hover:bg-mist hover:text-ink'
    }`;

  return (
    <form onSubmit={send} className={parent ? 'mt-3' : ''}>
      <div className="flex items-start gap-3">
        {!parent && <Avatar name={name || '?'} />}
        <div className="min-w-0 flex-1">
          {editName ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Nama kamu"
              autoComplete="name"
              className="mb-2 w-full rounded-xl bg-mist px-4 py-2.5 text-base font-semibold text-ink outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 sm:max-w-xs"
            />
          ) : (
            <p className="mb-1.5 text-xs text-slate-500">
              Sebagai <b className="text-ink">{name}</b>{' '}
              <button type="button" onClick={() => setEditName(true)} className="font-semibold text-sky-600 hover:underline dark:text-sky-400">
                ganti
              </button>
            </p>
          )}

          {/* Kolom jebakan bot */}
          <label className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>

          <div className="rounded-2xl bg-mist px-4 py-2.5 ring-brand-500 focus-within:ring-2">
            <textarea
              ref={area}
              rows={1}
              maxLength={1500}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e: { key: string; ctrlKey: boolean; metaKey: boolean }) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(e as unknown as React.FormEvent);
              }}
              placeholder={parent ? `Balas ${replyTo}…` : 'Tambahkan komentar…'}
              aria-label={parent ? `Balas ${replyTo}` : 'Tulis komentar'}
              className="block w-full resize-none bg-transparent text-[15px] leading-6 text-ink outline-none placeholder:text-slate-400"
            />
            {gif && (
              <div className="relative mt-2 inline-block">
                <img src={gif.url} alt={gif.title || 'GIF'} className="max-h-40 rounded-xl" />
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
          </div>

          <div className="mt-2 flex items-center gap-1">
            <button type="button" aria-label="Emoji" onClick={() => setPanel(panel === 'emoji' ? '' : 'emoji')} className={iconBtn(panel === 'emoji')}>
              <Emoji char="😀" className="h-5 w-5" />
            </button>
            {gifEnabled && (
              <button type="button" aria-label="GIF" onClick={() => setPanel(panel === 'gif' ? '' : 'gif')} className={iconBtn(panel === 'gif')}>
                <span className="rounded border-2 border-current px-1 text-[10px] leading-3">GIF</span>
              </button>
            )}
            <span className="ml-auto flex items-center gap-2">
              {onCancel && (
                <button type="button" onClick={onCancel} className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-ink">
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={!ready || sending}
                className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? 'Mengirim…' : parent ? 'Balas' : 'Kirim'}
              </button>
            </span>
          </div>

          {panel === 'emoji' && <EmojiPicker onPick={insert} onClose={() => setPanel('')} />}
          {panel === 'gif' && (
            <GifPicker
              onPick={(g) => {
                setGif(g);
                setPanel('');
              }}
              onClose={() => setPanel('')}
            />
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ item
function Item({
  c,
  reply,
  onReact,
  onReply,
}: {
  c: C;
  reply?: boolean;
  onReact: (id: number, emoji: string) => void;
  onReply: (c: C) => void;
}) {
  const [picker, setPicker] = useState(false);
  const [pop, setPop] = useState(false);
  const press = useRef<ReturnType<typeof setTimeout>>();
  const liked = c.my_reaction === '❤️';

  function quick() {
    // Ketuk = suka (❤️); kalau sudah ada reaksi lain, ketuk = hapus reaksi
    onReact(c.id, c.my_reaction && !liked ? c.my_reaction : '❤️');
    setPop(true);
    setTimeout(() => setPop(false), 400);
  }

  return (
    <div className="group/item flex gap-3">
      <Avatar name={c.name} staff={c.is_staff_reply} small={reply} />
      <div className="min-w-0 flex-1">
        {c.is_pinned && !reply && (
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">📌 Disematkan admin</p>
        )}
        <p className="break-words text-[15px] leading-6 text-slate-700">
          <b className="mr-1.5 text-ink">{c.name}</b>
          {c.is_staff_reply && (
            <span className="mr-1.5 inline-flex translate-y-[-1px] items-center gap-0.5 rounded-full bg-sky-500 px-1.5 py-0.5 align-middle text-[10px] font-bold text-white">
              ✓ Admin
            </span>
          )}
          <span className="whitespace-pre-line">
            <RichText text={c.body} />
          </span>
        </p>
        {c.gif_url && (
          <img src={c.gif_url} alt="GIF" loading="lazy" className="mt-2 max-h-56 max-w-[240px] rounded-2xl" />
        )}
        <div className="relative mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
          <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString('id-ID')}>
            {timeAgo(c.created_at)}
          </time>
          <button type="button" onClick={() => onReply(c)} className="hover:text-ink">
            Balas
          </button>
          <button type="button" onClick={() => setPicker((v) => !v)} className="hover:text-ink" aria-expanded={picker}>
            {c.my_reaction && !liked ? (
              <span className="inline-flex items-center gap-1 text-ink">
                <Emoji char={c.my_reaction} className="h-4 w-4" /> Reaksimu
              </span>
            ) : (
              'Reaksi'
            )}
          </button>
          <ReactionChips c={c} />
          {c.staff_reaction && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Emoji char={c.staff_reaction} className="h-4 w-4" /> oleh admin
            </span>
          )}
          {picker && (
            <ReactionPicker
              mine={c.my_reaction}
              onClose={() => setPicker(false)}
              onPick={(e) => {
                onReact(c.id, e);
                setPicker(false);
              }}
            />
          )}
        </div>
      </div>
      <button
        type="button"
        aria-label={liked ? 'Batal suka' : 'Suka'}
        aria-pressed={liked}
        onClick={quick}
        onPointerDown={() => {
          press.current = setTimeout(() => setPicker(true), 450);
        }}
        onPointerUp={() => press.current && clearTimeout(press.current)}
        onPointerLeave={() => press.current && clearTimeout(press.current)}
        onContextMenu={(e: { preventDefault: () => void }) => e.preventDefault()}
        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full transition ${pop ? 'scale-125' : ''}`}
      >
        {liked ? (
          <Emoji char="❤️" className="h-5 w-5" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] text-slate-400 transition group-hover/item:text-slate-600" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ------------------------------------------------------------------ utama
/** Komentar ala Instagram: langsung tampil, reaksi emoji bergerak, balasan 1 tingkat, GIF. */
export default function CommentSection({ slug, comments: initial, open }: { slug: string; comments: C[]; open: boolean }) {
  const [comments, setComments] = useState<C[]>(initial);
  const [gifEnabled, setGifEnabled] = useState(false);
  const [replying, setReplying] = useState<{ root: number; to: string } | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState('');
  const visitor = useRef('');

  const total = comments.reduce((n, c) => n + 1 + (c.replies?.length || 0), 0);

  useEffect(() => {
    visitor.current = visitorId();
    fetch(`/api/articles/${encodeURIComponent(slug)}/comments?visitor=${visitor.current}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setComments(data.comments || []);
        setGifEnabled(Boolean(data.gif_enabled));
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const patch = useCallback((id: number, fn: (c: C) => C) => {
    setComments((list) =>
      list.map((c) =>
        c.id === id ? fn(c) : c.replies?.some((r) => r.id === id) ? { ...c, replies: c.replies.map((r) => (r.id === id ? fn(r) : r)) } : c
      )
    );
  }, []);

  const react = useCallback(
    async (id: number, emoji: string) => {
      patch(id, (c) => applyReaction(c, emoji));
      try {
        const res = await fetch(`/api/article-comments/${id}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitor: visitor.current || visitorId(), emoji }),
        });
        const data = await res.json();
        if (res.ok) patch(id, (c) => ({ ...c, reactions: data.reactions, my_reaction: data.my_reaction }));
        else if (res.status === 429) setNotice('Pelan-pelan ya, terlalu banyak reaksi.');
      } catch {
        /* biarkan nilai optimis */
      }
    },
    [patch]
  );

  function startReply(c: C) {
    const root = comments.find((x) => x.id === c.id || x.replies?.some((r) => r.id === c.id));
    if (!root) return;
    setReplying({ root: root.id, to: c.name });
    setExpanded((s) => new Set(s).add(root.id));
  }

  function posted(comment: C | null, message: string, held: boolean, root?: number) {
    if (held || !comment) {
      setNotice(message || 'Komentarmu sedang dicek admin.');
    } else if (root) {
      setComments((list) => list.map((c) => (c.id === root ? { ...c, replies: [...(c.replies || []), comment] } : c)));
    } else {
      setComments((list) => [{ ...comment, replies: [] }, ...list]);
    }
    setReplying(null);
  }

  return (
    <section id="komentar" className="scroll-mt-28" aria-labelledby="komentar-heading">
      <div className="flex items-baseline gap-2">
        <h2 id="komentar-heading" className="text-2xl font-extrabold tracking-tight text-ink">
          Komentar
        </h2>
        {total > 0 && <span className="rounded-full bg-mist px-2.5 py-0.5 text-sm font-bold text-slate-600">{total}</span>}
      </div>

      <div className="mt-5 overflow-visible rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        {open ? (
          <Composer slug={slug} gifEnabled={gifEnabled} onDone={(c, m, h) => posted(c, m, h)} />
        ) : (
          <p className="text-sm text-slate-600">Komentar untuk artikel ini ditutup.</p>
        )}

        {notice && (
          <p role="status" className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            {notice}
          </p>
        )}

        <div className="mt-6 space-y-6 border-t border-slate-100 pt-6 dark:border-white/10">
          {comments.length === 0 && (
            <div className="py-6 text-center">
              <Emoji char="🤩" className="h-12 w-12" />
              <p className="mt-2 font-bold text-ink">Belum ada komentar</p>
              <p className="text-sm text-slate-500">Jadilah yang pertama berkomentar!</p>
            </div>
          )}
          {comments.map((c) => {
            const replies = c.replies || [];
            const showAll = expanded.has(c.id) || replies.length <= 1;
            return (
              <div key={c.id}>
                <Item c={c} onReact={react} onReply={startReply} />
                {(replies.length > 0 || replying?.root === c.id) && (
                  <div className="ml-[52px] mt-3 space-y-4">
                    {!showAll && (
                      <button
                        type="button"
                        onClick={() => setExpanded((s) => new Set(s).add(c.id))}
                        className="flex items-center gap-3 text-xs font-bold text-slate-500 hover:text-ink"
                      >
                        <span className="h-px w-6 bg-slate-300" />
                        Lihat {replies.length} balasan
                      </button>
                    )}
                    {showAll && replies.map((r) => <Item key={r.id} c={r} reply onReact={react} onReply={startReply} />)}
                    {open && replying?.root === c.id && (
                      <Composer
                        key={`${c.id}-${replying.to}`}
                        slug={slug}
                        parent={c.id}
                        replyTo={replying.to}
                        gifEnabled={gifEnabled}
                        autoFocus
                        onCancel={() => setReplying(null)}
                        onDone={(cm, m, h) => posted(cm, m, h, c.id)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Emoji bergerak: Noto Emoji Animation © Google, lisensi CC BY 4.0.
      </p>
    </section>
  );
}
