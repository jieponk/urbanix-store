'use client';

import { sellerHref } from '@/lib/sellerUrl';
import { useEffect, useRef, useState } from 'react';
import SimpleIcon from '@/components/SimpleIcon';
import TablerIcon from '@/components/TablerIcon';
import { Badge, Card, ConfirmButton, Drawer, Empty, ErrorBox, Field, PageHeader, Spinner, Toggle, btn, inputCls } from '@/components/seller/ui';
import { notify, sellerApi, useSellerData } from '@/lib/seller';

type Prod = { id: number; name: string; image: string; price?: string };
type Video = {
  id: number;
  title: string;
  kind: 'file' | 'youtube' | 'tiktok' | 'instagram' | 'link';
  src: string;
  poster: string;
  link: string;
  products: Prod[];
  sort_order: number;
  is_active: boolean;
  has_file: boolean;
  file_name: string;
};

type Form = {
  id?: number;
  title: string;
  source: 'link' | 'file';
  video_url: string;
  file: File | null;
  file_name: string;
  poster: File | null;
  poster_url: string;
  products: Prod[];
  sort_order: number;
  is_active: boolean;
};

const EMPTY: Form = { title: '', source: 'link', video_url: '', file: null, file_name: '', poster: null, poster_url: '', products: [], sort_order: 0, is_active: true };
const MAX_MB = 60;

const KIND_LABEL: Record<Video['kind'], string> = { file: 'File', youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', link: 'Link' };

/** Unggah dengan persentase (fetch tidak bisa melaporkan progres unggah). */
function uploadWithProgress(path: string, method: string, form: FormData, onProgress: (pct: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `/api/seller/${path}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: any = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* abaikan */
      }
      if (xhr.status === 401) {
        window.location.href = sellerHref(`/seller/login?next=${encodeURIComponent(window.location.pathname)}`);
        return reject(new Error('Sesi habis, silakan login lagi.'));
      }
      if (xhr.status >= 400) return reject(new Error(data.error || data.detail || 'Gagal menyimpan video.'));
      resolve(data);
    };
    xhr.onerror = () => reject(new Error('Koneksi terputus saat mengunggah. Coba lagi.'));
    xhr.send(form);
  });
}

function ProductPicker({ value, onChange }: { value: Prod[]; onChange: (p: Prod[]) => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Prod[]>([]);
  const timer = useRef<number>();
  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      const data = await sellerApi<any>(`products?q=${encodeURIComponent(q.trim())}&page_size=6`).catch(() => null);
      setResults((data?.results ?? []).map((p: any) => ({ id: p.id, name: p.name, image: p.image_url, price: p.final_price })));
    }, 300);
  }, [q]);
  const full = value.length >= 3;
  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {value.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-surface p-1.5">
              {p.image ? <img src={p.image} alt="" className="h-9 w-9 rounded object-contain" /> : <span className="h-9 w-9 rounded bg-mist" />}
              <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x.id !== p.id))} aria-label={`Lepas ${p.name}`} className="rounded p-1 text-slate-500 hover:bg-mist hover:text-ink">
                <TablerIcon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!full && (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><TablerIcon name="search" size={16} /></span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama produk…" className={`${inputCls} pl-9`} />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-surface py-1 shadow-lg">
              {results.filter((r) => !value.some((v) => v.id === r.id)).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...value, r]);
                      setQ('');
                    }}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-mist"
                  >
                    {r.image ? <img src={r.image} alt="" className="h-8 w-8 rounded object-contain" /> : <span className="h-8 w-8 rounded bg-mist" />}
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                    {r.price && <span className="shrink-0 text-xs text-slate-500">{r.price}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="mt-1 text-xs text-slate-500">{full ? 'Sudah 3 produk (maksimal).' : 'Maksimal 3 produk. Produk pertama tampil di bawah video di beranda.'}</p>
    </div>
  );
}

export default function VideoPage() {
  const { data, error, loading, reload } = useSellerData<Video[]>('videos');
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  function edit(v: Video) {
    setForm({
      id: v.id,
      title: v.title,
      source: v.has_file ? 'file' : 'link',
      video_url: v.link,
      file: null,
      file_name: v.file_name,
      poster: null,
      poster_url: v.poster,
      products: v.products,
      sort_order: v.sort_order,
      is_active: v.is_active,
    });
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim()) return notify('Judul video wajib diisi.', 'error');
    if (form.source === 'link' && !/^https?:\/\//.test(form.video_url.trim())) return notify('Tempel link video yang diawali https://', 'error');
    if (form.source === 'file' && !form.file && !form.file_name) return notify('Pilih file video dulu.', 'error');
    if (form.file && form.file.size > MAX_MB * 1024 * 1024) return notify(`File video maks. ${MAX_MB} MB.`, 'error');
    const body = new FormData();
    body.append('title', form.title.trim());
    body.append('video_url', form.source === 'link' ? form.video_url.trim() : '');
    if (form.source === 'file' && form.file) body.append('video_file', form.file);
    if (form.source === 'link' && form.file_name) body.append('remove_file', '1');
    if (form.poster) body.append('poster', form.poster);
    body.append('sort_order', String(form.sort_order || 0));
    body.append('is_active', form.is_active ? 'true' : 'false');
    form.products.forEach((p) => body.append('product_ids', String(p.id)));
    if (!form.products.length) body.append('product_ids', '');
    setBusy(true);
    setProgress(0);
    try {
      await uploadWithProgress(form.id ? `videos/${form.id}` : 'videos', form.id ? 'PATCH' : 'POST', body, setProgress);
      notify(form.id ? 'Video diperbarui.' : 'Video ditambahkan.');
      setForm(null);
      reload();
    } catch (e) {
      notify((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Video, on: boolean) {
    const body = new FormData();
    body.append('is_active', on ? 'true' : 'false');
    await sellerApi(`videos/${v.id}`, { method: 'PATCH', body }).catch((e) => notify(e.message, 'error'));
    reload();
  }

  return (
    <div>
      <PageHeader
        pretitle="Marketing"
        title="Video belanja"
        subtitle="Tampil di beranda (bagian “Lihat langsung”), lengkap dengan produk yang bisa langsung dibeli."
        actions={
          <button type="button" className={btn.primary} onClick={() => setForm({ ...EMPTY })}>
            <TablerIcon name="plus" size={16} /> Tambah video
          </button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-surface p-4 text-sm text-slate-600">
        <span className="mt-0.5 text-ink"><TablerIcon name="info-circle" size={18} /></span>
        <p>
          <b className="text-ink">Saran:</b> tempel link <b>TikTok, Instagram Reels, atau YouTube Shorts</b> agar beranda tetap cepat dan video tidak memakan
          kuota server. Unggah file (MP4, maks. {MAX_MB} MB) hanya untuk video yang tidak ada di media sosial.
        </p>
      </div>

      {error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : loading && !data ? (
        <Spinner />
      ) : !data?.length ? (
        <Card>
          <Empty title="Belum ada video">Tambahkan video unboxing, review, atau hasil foto. Bagian video di beranda muncul otomatis setelah ada video.</Empty>
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {data.map((v) => (
            <li key={v.id} className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-surface shadow-[0_2px_4px_rgba(24,36,51,0.04)]">
              <div className="relative aspect-[9/16] bg-cobalt-900">
                {v.poster ? (
                  <img src={v.poster} alt="" className="h-full w-full object-cover" />
                ) : v.kind === 'file' ? (
                  <video src={`${v.src}#t=0.5`} preload="metadata" muted className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-white/40"><TablerIcon name="video" size={36} stroke={1.5} /></span>
                )}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {(v.kind === 'youtube' || v.kind === 'tiktok' || v.kind === 'instagram') && <SimpleIcon name={v.kind} color="current" size={11} />}
                  {KIND_LABEL[v.kind]}
                </span>
                {!v.is_active && <span className="absolute right-2 top-2"><Badge tone="gray">Disembunyikan</Badge></span>}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="line-clamp-2 text-sm font-semibold text-ink">{v.title}</p>
                <p className="text-xs text-slate-500">{v.products.length ? `${v.products.length} produk` : 'Tanpa produk'} · urutan {v.sort_order}</p>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <Toggle checked={v.is_active} onChange={(on) => toggle(v, on)} label="Tampilkan di beranda" />
                  <div className="flex gap-1.5">
                    <button type="button" className={btn.small} onClick={() => edit(v)}>Ubah</button>
                    <ConfirmButton confirmText="Hapus?" onConfirm={async () => { await sellerApi(`videos/${v.id}`, { method: 'DELETE' }); notify('Video dihapus.'); reload(); }}>
                      <TablerIcon name="trash" size={14} />
                    </ConfirmButton>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={Boolean(form)}
        title={form?.id ? 'Ubah video' : 'Tambah video'}
        onClose={() => !busy && setForm(null)}
        footer={
          <div className="flex items-center gap-2">
            {busy && form?.file && (
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full bg-ink transition-all" style={{ width: `${progress}%` }} /></div>
                <p className="mt-1 text-xs text-slate-500">Mengunggah {progress}%…</p>
              </div>
            )}
            <button type="button" className={`${btn.primary} ml-auto`} disabled={busy} onClick={save}>
              {busy ? 'Menyimpan…' : 'Simpan video'}
            </button>
          </div>
        }
      >
        {form && (
          <div className="space-y-4">
            <Field label="Judul">
              <input className={inputCls} value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Unboxing Fujifilm X-M5" />
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">Sumber video</span>
              <div className="grid grid-cols-2 gap-2">
                {([['link', 'Tempel link', 'link'], ['file', 'Unggah file', 'upload']] as const).map(([value, label, icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, source: value })}
                    className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-semibold transition ${
                      form.source === value ? 'border-ink bg-ink text-surface' : 'border-slate-300 bg-surface text-ink hover:bg-mist'
                    }`}
                  >
                    <TablerIcon name={icon} size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {form.source === 'link' ? (
              <Field label="Link video" hint="TikTok, Instagram Reels, atau YouTube Shorts. Sampul YouTube terisi otomatis.">
                <input className={inputCls} value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://www.tiktok.com/@urbanix/video/…" />
              </Field>
            ) : (
              <Field label="File video" hint={`MP4, WebM, atau MOV · maks. ${MAX_MB} MB · sebaiknya vertikal 9:16.`}>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
                />
                {form.file_name && !form.file && <span className="mt-1 block text-xs text-slate-500">File sekarang: {form.file_name}</span>}
              </Field>
            )}

            <Field label="Gambar sampul (opsional)" hint="Disarankan untuk TikTok & Instagram agar kartu video tidak kosong. JPG/PNG/WebP, maks. 5 MB.">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setForm({ ...form, poster: e.target.files?.[0] ?? null })}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
              />
              {form.poster_url && !form.poster && <img src={form.poster_url} alt="" className="mt-2 h-28 rounded-md border border-slate-200 object-cover" />}
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-semibold text-ink">Produk di video</span>
              <ProductPicker value={form.products} onChange={(products) => setForm({ ...form, products })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Urutan" hint="Angka kecil tampil lebih dulu.">
                <input type="number" min={0} className={inputCls} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} />
              </Field>
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-ink">Tampil di beranda</span>
                <Toggle checked={form.is_active} onChange={(is_active) => setForm({ ...form, is_active })} label="Tampil di beranda" />
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
