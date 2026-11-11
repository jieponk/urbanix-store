'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArticleBody from '@/components/inspirasi/ArticleBody';
import { Card, ConfirmButton, Drawer, ErrorBox, Field, PageHeader, Spinner, Thumb, Toggle, btn, inputCls } from '@/components/seller/ui';
import { DEFAULT_COVER, renderMarkdown } from '@/lib/markdown';
import { fromLocalInput, notify, rp, sellerApi, toLocalInput } from '@/lib/seller';

type Form = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string;
  author_name: string;
  is_pinned: boolean;
  allow_comments: boolean;
  published_at: string;
  status: 'DRAFT' | 'PUBLISHED';
};

const EMPTY: Form = {
  title: '', slug: '', excerpt: '', body: '', category: '', tags: '', author_name: 'Tim Urbanix',
  is_pinned: false, allow_comments: true, published_at: '', status: 'DRAFT',
};

/** Tombol format: [label, sebelum, sesudah, isi contoh, awal baris?] */
const TOOLS: { label: string; title: string; before: string; after?: string; sample: string; line?: boolean }[] = [
  { label: 'H2', title: 'Judul bagian', before: '## ', sample: 'Judul bagian', line: true },
  { label: 'H3', title: 'Sub-judul', before: '### ', sample: 'Sub-judul', line: true },
  { label: 'B', title: 'Tebal', before: '**', after: '**', sample: 'teks tebal' },
  { label: 'I', title: 'Miring', before: '*', after: '*', sample: 'teks miring' },
  { label: 'Sorot', title: 'Sorot (stabilo)', before: '==', after: '==', sample: 'teks disorot' },
  { label: '🔗', title: 'Link', before: '[', after: '](https://)', sample: 'teks link' },
  { label: '•', title: 'Daftar poin', before: '- ', sample: 'Poin', line: true },
  { label: '1.', title: 'Daftar nomor', before: '1. ', sample: 'Langkah', line: true },
  { label: '❝', title: 'Kutipan', before: '> ', sample: 'Kutipan', line: true },
  { label: '💡', title: 'Kotak tips', before: '> [!TIP]\n> ', sample: 'Isi tips', line: true },
  { label: '⚠️', title: 'Kotak perhatian', before: '> [!WARNING]\n> ', sample: 'Isi peringatan', line: true },
  { label: '</>', title: 'Blok kode', before: '```\n', after: '\n```', sample: 'kode', line: true },
  { label: 'Tabel', title: 'Tabel', before: '| Kolom 1 | Kolom 2 |\n| --- | --- |\n| ', after: ' | isi |', sample: 'isi', line: true },
  { label: '―', title: 'Garis pemisah', before: '\n---\n', sample: '', line: true },
];

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'baru';
  const router = useRouter();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [cover, setCover] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [related, setRelated] = useState<any[]>([]);
  const [productMap, setProductMap] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [pickProduct, setPickProduct] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [meta, setMeta] = useState<any>(null);

  useEffect(() => {
    sellerApi<any[]>('article-categories').then(setCategories).catch(() => setCategories([]));
    if (isNew) return;
    sellerApi<any>(`articles/${id}`)
      .then((a) => {
        setForm({
          title: a.title, slug: a.slug, excerpt: a.excerpt_raw || '', body: a.body || '',
          category: a.category_id ? String(a.category_id) : '', tags: (a.tags || []).join(', '),
          author_name: a.author_name, is_pinned: a.is_pinned, allow_comments: a.allow_comments,
          published_at: toLocalInput(a.published_at), status: a.status,
        });
        setCover(a.cover || '');
        setRelated(a.related_products || []);
        setProductMap(Object.fromEntries((a.related_products || []).map((p: any) => [String(p.id), p])));
        setMeta(a);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Ingatkan bila keluar halaman dengan perubahan belum disimpan.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => { setForm((f) => ({ ...f, [key]: value })); setDirty(true); };
  const preview = useMemo(() => (tab === 'preview' ? renderMarkdown(form.body) : null), [tab, form.body]);
  const words = form.body.trim() ? form.body.trim().split(/\s+/).length : 0;

  function insert(before: string, after = '', sample = '', line = false) {
    const el = textarea.current;
    const body = form.body;
    const start = el ? el.selectionStart : body.length;
    const end = el ? el.selectionEnd : body.length;
    const selected = body.slice(start, end) || sample;
    const needBreak = line && start > 0 && body[start - 1] !== '\n' ? '\n\n' : '';
    const text = `${needBreak}${before}${selected}${after}`;
    set('body', body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const s = start + needBreak.length + before.length;
      el.setSelectionRange(s, s + selected.length);
    });
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await sellerApi<{ url: string }>('articles/image', { body: fd });
      insert(`![${file.name.replace(/\.[^.]+$/, '')}](${r.url} "`, '")', 'Keterangan gambar', true);
      notify('Gambar diunggah.');
    } catch (e) {
      notify((e as Error).message, 'error');
    }
  }

  function addProduct(p: any) {
    setProductMap((m) => ({ ...m, [String(p.id)]: p }));
    setRelated((list) => (list.some((x) => x.id === p.id) ? list : [...list, p]));
    insert(`[[produk:${p.id}]]`, '', '', true);
    setPickProduct(false);
    setDirty(true);
  }

  async function save(status?: 'DRAFT' | 'PUBLISHED') {
    if (!form.title.trim()) { notify('Judul wajib diisi.', 'error'); return; }
    const fd = new FormData();
    const next = status || form.status;
    fd.append('title', form.title);
    if (!isNew || form.slug) fd.append('slug', form.slug);
    fd.append('excerpt', form.excerpt);
    fd.append('body', form.body);
    fd.append('category', form.category);
    fd.append('tags', form.tags);
    fd.append('author_name', form.author_name);
    fd.append('is_pinned', String(form.is_pinned));
    fd.append('allow_comments', String(form.allow_comments));
    fd.append('status', next);
    fd.append('published_at', fromLocalInput(form.published_at) || '');
    fd.append('related_products', related.map((p) => p.id).join(','));
    if (coverFile) fd.append('cover', coverFile);
    else if (removeCover) fd.append('cover', '');
    setBusy(true);
    try {
      const a = await sellerApi<any>(isNew ? 'articles' : `articles/${id}`, { method: isNew ? 'POST' : 'PATCH', body: fd });
      setDirty(false);
      notify(next === 'PUBLISHED' ? 'Artikel terbit! Tampil di Inspirasi dalam ±1 menit.' : 'Draf disimpan.');
      if (isNew) router.replace(`/seller/artikel/${a.id}`);
      else {
        setForm((f) => ({ ...f, status: a.status, slug: a.slug, published_at: toLocalInput(a.published_at) }));
        setCover(a.cover || '');
        setCoverFile(null);
        setRemoveCover(false);
        setMeta(a);
      }
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    await sellerApi(`articles/${id}`, { method: 'DELETE' }).catch((e) => notify(e.message, 'error'));
    setDirty(false);
    notify('Artikel dihapus.');
    router.replace('/seller/artikel');
  }

  const fileUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : ''), [coverFile]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} />;

  const coverPreview = fileUrl || (removeCover ? '' : cover);
  const published = form.status === 'PUBLISHED';

  return (
    <div>
      <PageHeader
        back={{ href: '/seller/artikel', label: 'Artikel' }}
        title={isNew ? 'Tulis artikel' : 'Edit artikel'}
        subtitle={dirty ? 'Ada perubahan yang belum disimpan' : published ? 'Sudah terbit' : 'Draf'}
        actions={
          <>
            {!isNew && published && meta?.slug && (
              <a href={`/inspirasi/${meta.slug}`} target="_blank" rel="noopener noreferrer" className={btn.ghost}>Lihat</a>
            )}
            <button type="button" disabled={busy} className={btn.ghost} onClick={() => save(published ? 'PUBLISHED' : 'DRAFT')}>
              {published ? 'Simpan perubahan' : 'Simpan draf'}
            </button>
            {!published && (
              <button type="button" disabled={busy} className={btn.brand} onClick={() => save('PUBLISHED')}>Terbitkan</button>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {/* Kolom tulis */}
        <div className="min-w-0 space-y-4">
          <input
            className="w-full rounded-2xl border-0 bg-surface px-5 py-4 text-2xl font-extrabold text-ink ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ink"
            placeholder="Judul artikel"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            maxLength={160}
          />

          <Card padded={false}>
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-3 py-2">
              <div className="mr-2 flex rounded-lg bg-mist p-0.5">
                {(['write', 'preview'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${tab === t ? 'bg-surface text-ink shadow-sm' : 'text-slate-500'}`}>
                    {t === 'write' ? 'Tulis' : 'Pratinjau'}
                  </button>
                ))}
              </div>
              {tab === 'write' && (
                <>
                  {TOOLS.map((t) => (
                    <button key={t.title} type="button" title={t.title} aria-label={t.title}
                      onClick={() => insert(t.before, t.after, t.sample, t.line)}
                      className="min-w-[32px] rounded-md px-2 py-1.5 text-xs font-bold text-ink hover:bg-mist">
                      {t.label}
                    </button>
                  ))}
                  <label className="cursor-pointer rounded-md px-2 py-1.5 text-xs font-bold text-ink hover:bg-mist" title="Sisipkan gambar">
                    🖼 Gambar
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }} />
                  </label>
                  <button type="button" onClick={() => setPickProduct(true)} className="rounded-md px-2 py-1.5 text-xs font-bold text-ink hover:bg-mist" title="Sisipkan kartu produk">
                    🛒 Produk
                  </button>
                  <button type="button" onClick={() => { const v = prompt('Tempel link / ID video YouTube'); const m = v?.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)?([A-Za-z0-9_-]{11})/); if (m) insert(`[[youtube:${m[1]}]]`, '', '', true); }}
                    className="rounded-md px-2 py-1.5 text-xs font-bold text-ink hover:bg-mist" title="Sisipkan video YouTube">
                    ▶ Video
                  </button>
                </>
              )}
            </div>
            {tab === 'write' ? (
              <textarea
                ref={textarea}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                className="block min-h-[60vh] w-full resize-y border-0 bg-transparent px-5 py-4 font-mono text-[14px] leading-7 text-ink focus:outline-none"
                placeholder={'Mulai menulis di sini…\n\nPakai tombol di atas untuk judul, tebal, daftar, gambar, dan kartu produk.'}
              />
            ) : (
              <div className="min-h-[60vh] px-5 py-6 sm:px-8">
                <div className="mx-auto max-w-[720px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview || DEFAULT_COVER} alt="" className="mb-8 aspect-[1200/630] w-full rounded-2xl object-cover" />
                  <h1 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-ink">{form.title || 'Judul artikel'}</h1>
                  {preview && <ArticleBody blocks={preview.blocks} products={productMap} preview />}
                </div>
              </div>
            )}
            <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
              {words} kata · ±{Math.max(1, Math.round(words / 200))} menit baca · Format: **tebal**, *miring*, ## judul, - daftar, [[produk:ID]]
            </p>
          </Card>
        </div>

        {/* Kolom pengaturan */}
        <div className="space-y-4">
          <Card title="Publikasi">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink">Sematkan di atas</span>
                <Toggle checked={form.is_pinned} onChange={(v) => set('is_pinned', v)} label="Sematkan" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-ink">Boleh dikomentari</span>
                <Toggle checked={form.allow_comments} onChange={(v) => set('allow_comments', v)} label="Boleh dikomentari" />
              </div>
              <Field label="Tanggal terbit" hint="Kosongkan = saat diterbitkan. Isi tanggal nanti untuk menjadwalkan.">
                <input type="datetime-local" className={inputCls} value={form.published_at} onChange={(e) => set('published_at', e.target.value)} />
              </Field>
              {published && (
                <button type="button" disabled={busy} className={`${btn.ghost} w-full`} onClick={() => save('DRAFT')}>
                  Kembalikan ke draf (sembunyikan)
                </button>
              )}
            </div>
          </Card>

          <Card title="Gambar sampul">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview || DEFAULT_COVER} alt="" className="aspect-[1200/630] w-full rounded-xl bg-mist object-cover ring-1 ring-slate-200" />
            {!coverPreview && <p className="mt-2 text-xs text-slate-500">Belum ada sampul: gambar default Urbanix yang dipakai.</p>}
            <div className="mt-3 flex gap-2">
              <label className={`${btn.ghost} cursor-pointer`}>
                {coverPreview ? 'Ganti' : 'Upload sampul'}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setRemoveCover(false); setDirty(true); } e.target.value = ''; }} />
              </label>
              {coverPreview && (
                <button type="button" className={btn.ghost} onClick={() => { setCoverFile(null); setRemoveCover(true); setDirty(true); }}>Hapus</button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Ukuran ideal 1200×630 px (JPG/PNG/WebP, maks. 5 MB).</p>
          </Card>

          <Card title="Kategori & label">
            <div className="space-y-4">
              <Field label="Kategori">
                <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">Tanpa kategori</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Label" hint="Pisahkan dengan koma. Contoh: sony, mirrorless, tips foto">
                <input className={inputCls} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="sony, mirrorless, tips foto" />
              </Field>
              {form.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                    <span key={t} className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-ink">#{t.toLowerCase()}</span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card title="SEO & info">
            <div className="space-y-4">
              <Field label={`Ringkasan (${form.excerpt.length}/300)`} hint="Tampil di kartu artikel & hasil Google. Kosong = diambil dari awal tulisan.">
                <textarea className={`${inputCls} min-h-[90px]`} maxLength={300} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
              </Field>
              <Field label="Alamat (slug)" hint={`urbanix.id/inspirasi/${form.slug || '(otomatis dari judul)'}`}>
                <input className={inputCls} value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} placeholder="otomatis dari judul" />
              </Field>
              <Field label="Nama penulis">
                <input className={inputCls} value={form.author_name} onChange={(e) => set('author_name', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card title={`Produk terkait (${related.length})`} action={<button type="button" className={btn.small} onClick={() => setPickProduct(true)}>+ Tambah</button>}>
            {related.length === 0 ? (
              <p className="text-sm text-slate-500">Produk yang tampil di bawah artikel. Tombol “🛒 Produk” juga menyisipkan kartu di tengah tulisan.</p>
            ) : (
              <ul className="space-y-2">
                {related.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <Thumb src={p.image_url} />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-semibold text-ink">{p.name}</span>
                      <span className="text-xs text-slate-500">ID {p.id}{p.final_price ? ` · ${rp(p.final_price)}` : ''}</span>
                    </span>
                    <button type="button" aria-label={`Hapus ${p.name}`} className={btn.small} onClick={() => { setRelated((l) => l.filter((x) => x.id !== p.id)); setDirty(true); }}>×</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!isNew && (
            <Card title="Hapus artikel">
              <p className="mb-3 text-sm text-slate-500">Artikel dan semua komentarnya dihapus permanen.</p>
              <ConfirmButton className={btn.danger} confirmText="Ya, hapus permanen" onConfirm={remove}>Hapus artikel</ConfirmButton>
            </Card>
          )}
          <p className="text-center text-xs text-slate-500">
            <Link href="/seller/komentar" className="underline">Kelola komentar</Link>
          </p>
        </div>
      </div>

      <ProductPicker open={pickProduct} onClose={() => setPickProduct(false)} onPick={addProduct} />
    </div>
  );
}

function ProductPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: any) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  async function search(e?: { preventDefault(): void }) {
    e?.preventDefault();
    const r = await sellerApi(`products?q=${encodeURIComponent(q)}&size=15`).catch(() => null);
    setResults(r?.results ?? []);
  }
  useEffect(() => { if (open) search(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Drawer open={open} title="Sisipkan produk" onClose={onClose}>
      <form onSubmit={search} className="flex gap-2">
        <input className={inputCls} placeholder="Cari nama / SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="submit" className={btn.ghost}>Cari</button>
      </form>
      <ul className="mt-4 space-y-2">
        {results.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 rounded-xl bg-surface p-2.5 text-left ring-1 ring-slate-200 hover:ring-ink">
              <Thumb src={p.image_url} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-semibold text-ink">{p.name}</span>
                <span className="text-xs text-slate-500">{rp(p.final_price)} · stok {p.stock}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
