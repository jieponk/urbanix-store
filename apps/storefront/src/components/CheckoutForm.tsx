'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { money } from '@/lib/api';
import { CartItem, cartLineId, cartProductId, clearCart, getCart, saveCart } from '@/lib/cart';

type Method = 'MIDTRANS' | 'WHATSAPP' | 'SHOPEE';

type QuoteItem = {
  product_id: number;
  variation_id: string;
  variation_name: string;
  sku: string;
  name: string;
  image_url: string | null;
  unit_price: string;
  quantity: number;
  subtotal: string;
  stock: number;
  in_stock: boolean;
  shopee_url: string;
};

type Quote = {
  items: QuoteItem[];
  subtotal: string;
  shipping_note: string;
  methods: { midtrans: boolean; whatsapp: boolean; shopee: boolean };
};

type ShopeeLink = { name: string; variation_name: string; quantity: number; url: string };

const METHOD_INFO: Record<Method, { key: keyof Quote['methods']; title: string; text: string }> = {
  MIDTRANS: {
    key: 'midtrans',
    title: 'Bayar di web',
    text: 'QRIS, transfer bank (virtual account), e-wallet, atau kartu lewat Midtrans.',
  },
  WHATSAPP: {
    key: 'whatsapp',
    title: 'Pesan via WhatsApp',
    text: 'Pesanan dikirim ke admin. Total + ongkir dan cara bayar dikonfirmasi lewat chat.',
  },
  SHOPEE: {
    key: 'shopee',
    title: 'Beli via Shopee',
    text: 'Lanjut ke halaman produk kami di Shopee. Data & alamat diisi di Shopee.',
  },
};

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  notes: '',
};
type FormState = typeof EMPTY_FORM;
type FieldErrors = Partial<Record<keyof FormState, string>>;

// crypto.randomUUID hanya ada di https; preview lewat IP Wi-Fi memakai http.
function makeKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
}

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return firstMessage(value[0]);
  return undefined;
}

/** Ubah error DRF ({customer: {phone: ["..."]}}) menjadi pesan per kolom. */
function parseErrors(data: Record<string, unknown>): { fields: FieldErrors; general?: string } {
  const fields: FieldErrors = {};
  for (const group of ['customer', 'shipping'] as const) {
    const value = data[group];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [field, msg] of Object.entries(value as Record<string, unknown>)) {
        if (field in EMPTY_FORM) fields[field as keyof FormState] = firstMessage(msg);
      }
    }
  }
  if (data.notes) fields.notes = firstMessage(data.notes);

  const general =
    firstMessage(data.error) ??
    firstMessage(data.detail) ??
    firstMessage(data.non_field_errors) ??
    firstMessage(data.customer) ??
    firstMessage(data.shipping) ??
    (data.items ? 'Isi keranjang tidak valid. Muat ulang halaman lalu coba lagi.' : undefined);
  return { fields, general };
}

export default function CheckoutForm() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[] | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [method, setMethod] = useState<Method | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shopeeLinks, setShopeeLinks] = useState<ShopeeLink[] | null>(null);
  const [idemKey] = useState(makeKey);

  // 1. Baca keranjang, 2. minta harga & stok terbaru dari server.
  useEffect(() => {
    const items = getCart();
    setCart(items);
    if (items.length === 0) return;

    fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({
          product_id: Number(cartProductId(i)),
          variation_id: i.variationId ?? '',
          quantity: i.quantity,
        })),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(parseErrors(data).general || 'Gagal memuat ringkasan.');
        const q = data as Quote;
        setQuote(q);

        // Samakan harga & stok di keranjang dengan data server.
        const byLine = new Map(
          q.items.map((i) => [cartLineId(String(i.product_id), i.variation_id || undefined), i])
        );
        saveCart(
          items.map((item) => {
            const fresh = byLine.get(cartLineId(cartProductId(item), item.variationId));
            return fresh
              ? {
                  ...item,
                  price: Number(fresh.unit_price),
                  stock: fresh.stock,
                  sku: fresh.sku || item.sku,
                  variationName: fresh.variation_name || item.variationName,
                }
              : item;
          })
        );

        const first = (Object.keys(METHOD_INFO) as Method[]).find(
          (m) => q.methods[METHOD_INFO[m].key]
        );
        setMethod(first ?? null);
      })
      .catch((err: Error) => setQuoteError(err.message));
  }, []);

  const outOfStock = useMemo(() => quote?.items.filter((i) => !i.in_stock) ?? [], [quote]);
  const needsForm = method !== null && method !== 'SHOPEE';

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!needsForm) return e;
    if (!form.name.trim()) e.name = 'Nama wajib diisi.';
    if (!/^(\+62|62|0)8[0-9]{7,12}$/.test(form.phone.replace(/[\s\-().]/g, '')))
      e.phone = 'Nomor HP tidak valid. Contoh: 081234567890.';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email tidak valid.';
    if (form.address.trim().length < 10) e.address = 'Tulis alamat lengkap (jalan, nomor, RT/RW, kelurahan).';
    if (!form.city.trim()) e.city = 'Kota/kabupaten wajib diisi.';
    if (form.postal_code && !/^[0-9]{5}$/.test(form.postal_code)) e.postal_code = 'Kode pos harus 5 angka.';
    return e;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cart || !quote || !method || submitting) return;

    const localErrors = validate();
    setErrors(localErrors);
    setSubmitError('');
    if (Object.keys(localErrors).length > 0) {
      setSubmitError('Periksa lagi kolom yang ditandai merah.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: method,
          items: quote.items.map((i) => ({
            product_id: i.product_id,
            variation_id: i.variation_id,
            quantity: i.quantity,
          })),
          ...(needsForm && {
            customer: { name: form.name, phone: form.phone, email: form.email },
            shipping: {
              address: form.address,
              city: form.city,
              province: form.province,
              postal_code: form.postal_code,
            },
            notes: form.notes,
            idempotency_key: `${idemKey}-${method}`,
          }),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const parsed = parseErrors(data);
        setErrors(parsed.fields);
        setSubmitError(
          res.status === 429
            ? 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
            : parsed.general || 'Periksa lagi kolom yang ditandai merah.'
        );
        setSubmitting(false);
        return;
      }

      if (method === 'SHOPEE') {
        const links = data.shopee_links as ShopeeLink[];
        if (links.length === 1 && links[0].url) {
          window.location.href = links[0].url;
          return;
        }
        setShopeeLinks(links);
        setSubmitting(false);
        return;
      }

      clearCart();
      if (method === 'MIDTRANS' && data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }
      router.push(`/pesanan/${encodeURIComponent(data.order_number)}?baru=1`);
    } catch {
      setSubmitError('Koneksi terputus. Periksa internet lalu coba lagi.');
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------ tampilan
  if (cart === null) {
    return <p className="text-sm text-slate-500">Memuat keranjang…</p>;
  }

  if (cart.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="mb-4 text-slate-500">Keranjang belanja kamu masih kosong.</p>
        <Link
          href="/produk"
          className="inline-block rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700"
        >
          Mulai Belanja
        </Link>
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold">{quoteError}</p>
        <Link href="/cart" className="mt-3 inline-block font-bold underline">
          Kembali ke keranjang
        </Link>
      </div>
    );
  }

  if (!quote) {
    return <p className="text-sm text-slate-500">Mengecek harga dan stok terbaru…</p>;
  }

  if (shopeeLinks) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-black text-slate-900">Lanjut beli di Shopee</h2>
        <p className="mt-1 text-sm text-slate-500">
          Shopee hanya bisa membuka satu produk per klik. Buka setiap produk di bawah ini, lalu
          masukkan ke keranjang Shopee dengan jumlah yang sama.
        </p>
        <ul className="mt-5 divide-y divide-slate-100">
          {shopeeLinks.map((link) => (
            <li key={`${link.name}-${link.variation_name}`} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0 text-sm text-slate-800">
                {link.name} <span className="text-slate-400">×{link.quantity}</span>
                {link.variation_name && (
                  <span className="block text-xs text-slate-500">
                    Pilih varian di Shopee: <b>{link.variation_name}</b>
                  </span>
                )}
              </span>
              {link.url ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white hover:bg-orange-700"
                >
                  Buka di Shopee
                </a>
              ) : (
                <span className="shrink-0 text-xs text-slate-400">Link belum tersedia</span>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShopeeLinks(null)}
          className="mt-5 text-sm font-semibold text-slate-600 underline"
        >
          ← Pilih metode lain
        </button>
      </div>
    );
  }

  const availableMethods = (Object.keys(METHOD_INFO) as Method[]).filter(
    (m) => quote.methods[METHOD_INFO[m].key]
  );
  const blocked = method !== 'SHOPEE' && outOfStock.length > 0;

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Metode pembayaran */}
        <Section title="1. Metode pembayaran">
          {availableMethods.length === 0 ? (
            <p className="text-sm text-red-600">
              Belum ada metode pembayaran yang aktif. Silakan hubungi admin toko.
            </p>
          ) : (
            <div className="grid gap-3">
              {availableMethods.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${
                    method === m ? 'border-orange-600 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m}
                    checked={method === m}
                    onChange={() => {
                      setMethod(m);
                      setSubmitError('');
                    }}
                    className="mt-1 accent-orange-600"
                  />
                  <span>
                    <span className="block font-bold text-slate-900">{METHOD_INFO[m].title}</span>
                    <span className="block text-sm text-slate-500">{METHOD_INFO[m].text}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </Section>

        {needsForm && (
          <>
            <Section title="2. Data pembeli">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama lengkap" required error={errors.name} className="sm:col-span-2">
                  <input value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" maxLength={120} className={inputCls(errors.name)} />
                </Field>
                <Field label="No. HP / WhatsApp" required error={errors.phone}>
                  <input value={form.phone} onChange={(e) => update('phone', e.target.value)} inputMode="tel" autoComplete="tel" placeholder="081234567890" maxLength={20} className={inputCls(errors.phone)} />
                </Field>
                <Field label="Email (opsional)" error={errors.email}>
                  <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" inputMode="email" autoComplete="email" className={inputCls(errors.email)} />
                </Field>
              </div>
            </Section>

            <Section title="3. Alamat pengiriman">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Alamat lengkap" required error={errors.address} className="sm:col-span-2">
                  <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} autoComplete="street-address" maxLength={500} placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan" className={inputCls(errors.address)} />
                </Field>
                <Field label="Kota / Kabupaten" required error={errors.city}>
                  <input value={form.city} onChange={(e) => update('city', e.target.value)} autoComplete="address-level2" maxLength={100} className={inputCls(errors.city)} />
                </Field>
                <Field label="Provinsi" error={errors.province}>
                  <input value={form.province} onChange={(e) => update('province', e.target.value)} autoComplete="address-level1" maxLength={100} className={inputCls(errors.province)} />
                </Field>
                <Field label="Kode pos" error={errors.postal_code}>
                  <input value={form.postal_code} onChange={(e) => update('postal_code', e.target.value)} inputMode="numeric" autoComplete="postal-code" maxLength={5} className={inputCls(errors.postal_code)} />
                </Field>
              </div>
            </Section>

            <Section title="4. Catatan untuk penjual (opsional)">
              <Field label="Catatan" error={errors.notes}>
                <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} maxLength={1000} placeholder="Contoh: warna hitam, tolong dibungkus bubble wrap tebal" className={inputCls(errors.notes)} />
              </Field>
            </Section>
          </>
        )}
      </div>

      {/* Ringkasan */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="font-black text-slate-900">Ringkasan pesanan</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {quote.items.map((item) => (
            <li key={`${item.product_id}:${item.variation_id}`} className="flex gap-3 py-3">
              {item.image_url && (
                <img src={item.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-slate-800">{item.name}</p>
                {(item.variation_name || item.sku) && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.variation_name}
                    {item.variation_name && item.sku && ' · '}
                    {item.sku && `SKU ${item.sku}`}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.quantity} × {money(item.unit_price)}
                </p>
                {!item.in_stock && (
                  <p className="mt-0.5 text-xs font-semibold text-red-600">
                    Stok tidak cukup (tersisa {item.stock})
                  </p>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-900">{money(item.subtotal)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd className="font-semibold">{money(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Ongkos kirim</dt>
            <dd className="text-right text-slate-500">Dikonfirmasi penjual</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <dt className="font-bold">Total produk</dt>
            <dd className="font-black text-slate-900">{money(quote.subtotal)}</dd>
          </div>
        </dl>

        {blocked && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            Ada produk yang stoknya tidak cukup. Kurangi jumlahnya di{' '}
            <Link href="/cart" className="font-bold underline">keranjang</Link>.
          </p>
        )}
        {submitError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={!method || submitting || blocked}
          className="mt-5 w-full rounded-xl bg-orange-600 px-5 py-4 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? 'Memproses…'
            : method === 'MIDTRANS'
              ? 'Bayar Sekarang'
              : method === 'WHATSAPP'
                ? 'Buat Pesanan & Buka WhatsApp'
                : method === 'SHOPEE'
                  ? 'Lanjut ke Shopee'
                  : 'Pilih metode pembayaran'}
        </button>
        <Link href="/cart" className="mt-3 block text-center text-sm text-slate-500 hover:text-orange-600">
          ← Ubah keranjang
        </Link>
      </aside>
    </form>
  );
}

function inputCls(error?: string) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-base outline-none transition focus:ring-2 sm:text-sm ${
    error
      ? 'border-red-400 focus:ring-red-200'
      : 'border-slate-300 focus:border-orange-500 focus:ring-orange-100'
  }`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-black text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  className = '',
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
