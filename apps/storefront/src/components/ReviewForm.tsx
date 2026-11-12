'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Item = {
  product_id: number;
  name: string;
  variation_name: string;
  image_url: string;
  review: { rating: number; body: string; photo_url: string } | null;
};
type OrderData = { order_number: string; customer_name: string; can_review: boolean; items: Item[] };

const LABELS = ['', 'Sangat buruk', 'Kurang', 'Biasa saja', 'Bagus', 'Sangat bagus!'];

/** Perkecil foto di HP sebelum diunggah (maks. 1600 px, JPEG) agar cepat walau sinyal lemah. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob || file;
  } catch {
    return file;
  }
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div>
      <div className="flex gap-1" role="radiogroup" aria-label="Beri bintang">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} bintang`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition hover:scale-110"
          >
            <svg width="38" height="38" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.3l-5.6 2.9 1.1-6.3L2.9 9.5l6.3-.9z"
                fill={n <= shown ? '#ffc93c' : 'rgb(var(--slate-200))'}
              />
            </svg>
          </button>
        ))}
      </div>
      <p className="mt-1 h-5 text-sm font-semibold text-slate-600">{LABELS[shown]}</p>
    </div>
  );
}

function ItemForm({ token, item, name, initialRating, onDone }: {
  token: string;
  item: Item;
  name: string;
  initialRating: number;
  onDone: (review: Item['review']) => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!photo) return setPreview('');
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit() {
    if (!rating) return setError('Pilih bintang dulu.');
    setSending(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('product_id', String(item.product_id));
      fd.append('rating', String(rating));
      fd.append('body', body.trim());
      fd.append('name', name.trim());
      if (photo) fd.append('photo', await shrink(photo), 'foto.jpg');
      const res = await fetch(`/api/order-reviews/${encodeURIComponent(token)}`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim ulasan.');
      onDone(data.review);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengirim ulasan.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        placeholder="Ceritakan pengalamanmu: kualitas barang, kesesuaian dengan deskripsi, pengemasan, pengiriman…"
        className="w-full rounded-2xl bg-mist px-4 py-3 text-base text-ink outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-mist px-4 py-2.5 text-sm font-bold text-ink hover:bg-slate-200">
          📷 {photo ? 'Ganti foto' : 'Tambah foto (opsional)'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </label>
        {preview && (
          <span className="relative">
            <img src={preview} alt="Pratinjau foto" className="h-16 w-16 rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              aria-label="Hapus foto"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs font-bold text-white"
            >
              ✕
            </button>
          </span>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={sending || !rating}
        className="w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-base font-bold text-white shadow-sm hover:bg-brand-700 disabled:opacity-40 sm:w-auto"
      >
        {sending ? 'Mengirim…' : 'Kirim ulasan'}
      </button>
    </div>
  );
}

export default function ReviewForm({ token, initialStars }: { token: string; initialStars: number }) {
  const [data, setData] = useState<OrderData | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    fetch(`/api/order-reviews/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Link ulasan tidak valid.');
        setData(d);
        setName(d.customer_name || '');
      })
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="rounded-3xl bg-surface p-8 text-center ring-1 ring-slate-200">
        <p className="text-lg font-extrabold text-ink">{error}</p>
        <p className="mt-2 text-sm text-slate-500">Pastikan link dibuka lengkap dari email, atau hubungi admin lewat WhatsApp.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface">Ke beranda</Link>
      </div>
    );
  }
  if (!data) return <div className="h-64 animate-pulse rounded-3xl bg-surface ring-1 ring-slate-200" />;

  const done = data.items.filter((i) => i.review).length;
  const allDone = done === data.items.length;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-surface p-6 ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Pesanan {data.order_number}</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">
          {allDone ? 'Terima kasih atas ulasanmu! 🙏' : 'Bagaimana barangnya?'}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {allDone
            ? 'Ulasanmu sudah tampil di halaman produk dan membantu pembeli lain.'
            : 'Beri bintang dan ulasan singkat untuk setiap produk. Hanya 1 menit.'}
        </p>
        {!data.can_review && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Ulasan bisa diberikan setelah pesanan dikirim.
          </p>
        )}
        {data.can_review && !allDone && (
          <label className="mt-4 block text-sm">
            <span className="font-semibold text-ink">Nama yang ditampilkan</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded-xl bg-mist px-4 py-2.5 text-base text-ink outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-xs"
            />
            <span className="mt-1 block text-xs text-slate-500">Nama lengkap & data pesananmu tidak ditampilkan.</span>
          </label>
        )}
      </div>

      {data.items.map((item) => (
        <div key={item.product_id} className="rounded-3xl bg-surface p-6 ring-1 ring-slate-200">
          <div className="flex items-center gap-4">
            {item.image_url ? (
              <img src={item.image_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl bg-mist object-cover" />
            ) : (
              <span className="h-16 w-16 shrink-0 rounded-2xl bg-mist" />
            )}
            <div className="min-w-0">
              <Link href={`/produk/${item.product_id}`} className="line-clamp-2 font-bold text-ink hover:underline">{item.name}</Link>
              {item.variation_name && <p className="text-xs text-slate-500">Varian: {item.variation_name}</p>}
            </div>
          </div>
          {item.review ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
              ✓ Sudah diulas ({item.review.rating} bintang). Terima kasih!
            </p>
          ) : data.can_review ? (
            <ItemForm
              token={token}
              item={item}
              name={name}
              initialRating={initialStars}
              onDone={(review) =>
                setData((d) => d && { ...d, items: d.items.map((i) => (i.product_id === item.product_id ? { ...i, review } : i)) })
              }
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
