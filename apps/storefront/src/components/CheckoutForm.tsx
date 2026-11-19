'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { money, weightText } from '@/lib/money';
import { CartItem, cartLineId, cartProductId, clearCart, getCart, saveCart } from '@/lib/cart';
import { ArrowLeftIcon } from '@/components/Icons';
import { getClaimed, type VoucherInfo } from '@/lib/vouchers';
import { productImg } from '@/lib/img';
import { rememberOrder } from '@/lib/recentOrders';
import { SHIPPING_GROUPS, type LogoKey } from '@/lib/shipping';
import CourierBadge from '@/components/CourierBadge';
import { ArrowRight } from '@/components/inspirasi/InspoIcons';
import { useT } from '@/components/LangProvider';
import AddressFields from '@/components/AddressFields';
import { publicSku } from '@/lib/seo';
import { addressLine, getSavedAddresses, removeAddress, saveAddress, type SavedAddress } from '@/lib/savedAddress';
import SimpleIcon from '@/components/SimpleIcon';
import TablerIcon from '@/components/TablerIcon';

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
  is_promo?: boolean;
  shopee_url: string;
};

type Quote = {
  items: QuoteItem[];
  subtotal: string;
  total_weight_grams?: number;
  weight_complete?: boolean;
  shipping_note: string;
  methods: { midtrans: boolean; whatsapp: boolean; shopee: boolean };
  vouchers: {
    discount_amount: string;
    shipping_discount_max: string;
    applied: { code: string; title: string; kind: 'discount' | 'shipping'; amount: string; label: string }[];
    rejected: { code: string; message: string }[];
  };
  total: string;
  tax_note: string;
  available_vouchers: VoucherInfo[];
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
    text: 'Pesanan dikirim ke admin. Ongkir dan cara bayar dikonfirmasi lewat chat.',
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
  province: '',
  city: '',
  district: '',
  village: '',
  postal_code: '',
  service: '',
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

export default function CheckoutForm({ courierLogos = {} }: { courierLogos?: Partial<Record<LogoKey, string>> }) {
  const t = useT();
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
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);

  const [codes, setCodes] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const itemsRef = useRef<CartItem[]>([]);
  const firstLoad = useRef(true);

  const loadQuote = useCallback(async (voucherCodes: string[], paymentMethod: Method | null) => {
    const items = itemsRef.current ?? [];
    if (items.length === 0) return;
    setQuoteLoading(true);
    try {
      const res = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: Number(cartProductId(i)),
            variation_id: i.variationId ?? '',
            quantity: i.quantity,
          })),
          voucher_codes: voucherCodes,
          payment_method: paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(parseErrors(data).general || t('Gagal memuat ringkasan.'));
      const q = data as Quote;
      setQuote(q);
      setQuoteError('');

      if (firstLoad.current) {
        firstLoad.current = false;
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
        const first = (Object.keys(METHOD_INFO) as Method[]).find((m) => q.methods[METHOD_INFO[m].key]);
        setMethod(first ?? null);
      }
    } catch (err) {
      if (firstLoad.current) setQuoteError((err as Error).message);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  function applySaved(a: SavedAddress) {
    setForm((f) => ({
      ...f,
      name: a.name,
      phone: a.phone,
      email: a.email,
      address: a.street,
      province: a.province,
      city: a.city,
      district: a.district,
      village: a.village,
      postal_code: a.postal_code,
    }));
    setErrors({});
    setSavedId(a.id);
  }

  function newAddress() {
    setForm((f) => ({ ...EMPTY_FORM, service: f.service, notes: f.notes }));
    setErrors({});
    setSavedId(null);
  }

  // Alamat tersimpan di perangkat ini: yang terakhir dipakai langsung terisi.
  useEffect(() => {
    const list = getSavedAddresses();
    setSaved(list);
    if (list[0]) applySaved(list[0]);
  }, []);

  // 1. Baca keranjang + voucher yang sudah diklaim, 2. minta harga, stok & potongan dari server.
  useEffect(() => {
    const items = getCart();
    itemsRef.current = items;
    setCart(items);
    if (items.length === 0) return;
    const claimed = getClaimed();
    setCodes(claimed.slice(0, 2));
    loadQuote(claimed.slice(0, 2), null);
  }, [loadQuote]);

  // Hitung ulang potongan saat voucher atau metode bayar berubah.
  useEffect(() => {
    if (firstLoad.current) return;
    loadQuote(method === 'SHOPEE' ? [] : codes, method);
  }, [codes, method, loadQuote]);

  const appliedCodes = quote?.vouchers.applied.map((a) => a.code) ?? [];

  function toggleVoucher(voucher: VoucherInfo) {
    setCodes((current) => {
      if (current.includes(voucher.code)) return current.filter((c) => c !== voucher.code);
      // Maks. 1 voucher per jenis: ganti voucher sejenis yang sedang dipakai.
      const isShipping = voucher.type === 'FREE_SHIPPING';
      const known = quote?.available_vouchers ?? [];
      const kept = current.filter((c) => {
        const info = known.find((v) => v.code === c);
        return !info || (info.type === 'FREE_SHIPPING') !== isShipping;
      });
      return [...kept, voucher.code].slice(-2);
    });
  }

  function addCode(event?: FormEvent) {
    event?.preventDefault();
    const code = codeInput.replace(/\s+/g, '').toUpperCase();
    if (!code) return;
    setCodes((current) => (current.includes(code) ? current : [...current, code].slice(-2)));
    setCodeInput('');
  }

  const outOfStock = useMemo(() => quote?.items.filter((i) => !i.in_stock) ?? [], [quote]);
  const needsForm = method !== null && method !== 'SHOPEE';

  function update(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function updateMany(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof FormState];
      return next;
    });
  }

  /** Alamat untuk admin/kurir: jalan + kelurahan + kecamatan dalam satu baris. */
  function fullStreet() {
    return [form.address.trim(), form.village.trim(), form.district.trim() && `Kec. ${form.district.trim()}`]
      .filter(Boolean)
      .join(', ');
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!needsForm) return e;
    if (!form.name.trim()) e.name = t('Nama wajib diisi.');
    if (!/^(\+62|62|0)8[0-9]{7,12}$/.test(form.phone.replace(/[\s\-().]/g, '')))
      e.phone = t('Nomor HP tidak valid. Contoh: 081234567890.');
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = t('Email tidak valid.');
    if (form.address.trim().length < 5) e.address = t('Tulis nama jalan, nomor rumah, dan RT/RW.');
    if (!form.province.trim()) e.province = t('Provinsi wajib diisi.');
    if (!form.city.trim()) e.city = t('Kota/kabupaten wajib diisi.');
    if (!form.district.trim()) e.district = t('Kecamatan wajib diisi.');
    if (form.postal_code && !/^[0-9]{5}$/.test(form.postal_code)) e.postal_code = t('Kode pos harus 5 angka.');
    if (!form.service) e.service = t('Pilih jasa pengiriman.');
    return e;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!cart || !quote || !method || submitting) return;

    const localErrors = validate();
    setErrors(localErrors);
    setSubmitError('');
    if (Object.keys(localErrors).length > 0) {
      setSubmitError(t('Periksa lagi kolom yang ditandai merah.'));
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
              address: fullStreet(),
              city: form.city,
              province: form.province,
              postal_code: form.postal_code,
              service: form.service,
            },
            notes: form.notes,
            voucher_codes: appliedCodes,
            idempotency_key: `${idemKey}-${method}-${appliedCodes.join('.')}`,
          }),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const parsed = parseErrors(data);
        setErrors(parsed.fields);
        setSubmitError(
          res.status === 429
            ? t('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.')
            : parsed.general || t('Periksa lagi kolom yang ditandai merah.')
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
      rememberOrder(data.order_number);
      if (remember) {
        saveAddress({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          street: form.address.trim(),
          province: form.province.trim(),
          city: form.city.trim(),
          district: form.district.trim(),
          village: form.village.trim(),
          postal_code: form.postal_code.trim(),
        });
      }
      if (form.email) {
        // Untuk tawaran survei Google Customer Reviews di halaman pesanan (hanya di browser ini, sekali pakai).
        try {
          sessionStorage.setItem('urbanix_gcr', JSON.stringify({ order: data.order_number, email: form.email.trim() }));
        } catch {
          /* abaikan */
        }
      }
      if (method === 'MIDTRANS' && data.payment_url) {
        window.location.href = data.payment_url;
        return;
      }
      router.push(`/pesanan/${encodeURIComponent(data.order_number)}?baru=1`);
    } catch {
      setSubmitError(t('Koneksi terputus. Periksa internet lalu coba lagi.'));
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------ tampilan
  if (cart === null) {
    return <p className="text-sm text-slate-500">{t('Memuat keranjang…')}</p>;
  }

  if (cart.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-surface p-8 text-center">
        <p className="mb-4 text-slate-500">{t('Keranjang belanja kamu masih kosong.')}</p>
        <Link
          href="/produk"
          className="inline-block rounded-xl bg-ink px-5 py-3 text-sm font-bold text-surface hover:bg-slate-800"
        >
          {t('Mulai Belanja')}
        </Link>
      </div>
    );
  }

  if (quoteError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold">{quoteError}</p>
        <Link href="/cart" className="mt-3 inline-block font-bold underline">
          {t('Kembali ke keranjang')}
        </Link>
      </div>
    );
  }

  if (!quote) {
    return <p className="text-sm text-slate-500">{t('Mengecek harga dan stok terbaru…')}</p>;
  }

  if (shopeeLinks) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-surface p-6">
        <h2 className="text-lg font-black text-slate-900">{t('Lanjut beli di Shopee')}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('Shopee hanya bisa membuka satu produk per klik. Buka setiap produk di bawah ini, lalu masukkan ke keranjang Shopee dengan jumlah yang sama.')}
        </p>
        <ul className="mt-5 divide-y divide-slate-100">
          {shopeeLinks.map((link) => (
            <li key={`${link.name}-${link.variation_name}`} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0 text-sm text-slate-800">
                {link.name} <span className="text-slate-400">×{link.quantity}</span>
                {link.variation_name && (
                  <span className="block text-xs text-slate-500">
                    {t('Pilih varian di Shopee:')} <b>{link.variation_name}</b>
                  </span>
                )}
              </span>
              {link.url ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-ink px-4 py-2 text-xs font-bold text-surface hover:bg-slate-800"
                >
                  {t('Buka di Shopee')}
                </a>
              ) : (
                <span className="shrink-0 text-xs text-slate-400">{t('Link belum tersedia')}</span>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShopeeLinks(null)}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-ink"
        >
          <ArrowLeftIcon size={16} />
          {t('Pilih metode lain')}
        </button>
      </div>
    );
  }

  const availableMethods = (Object.keys(METHOD_INFO) as Method[]).filter(
    (m) => quote.methods[METHOD_INFO[m].key]
  );
  const blocked = method !== 'SHOPEE' && outOfStock.length > 0;
  const voucherDiscount = Number(quote.vouchers.discount_amount) || 0;
  const shippingDiscount = Number(quote.vouchers.shipping_discount_max) || 0;
  const total = Number(quote.total);
  const rejected = quote.vouchers.rejected.filter((r) => codes.includes(r.code));

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Metode pembayaran */}
        <Section title={t('1. Metode pembayaran')}>
          {availableMethods.length === 0 ? (
            <p className="text-sm text-red-600">
              {t('Belum ada metode pembayaran yang aktif. Silakan hubungi admin toko.')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {availableMethods.map((m) => (
                <label
                  key={m}
                  className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${
                    method === m ? 'border-ink bg-mist' : 'border-slate-200 hover:border-slate-300'
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
                    className="mt-1 accent-slate-900"
                  />
                  <span>
                    <span className="flex items-center gap-2 font-bold text-slate-900">
                      {METHOD_INFO[m].key === 'whatsapp' && <SimpleIcon name="whatsapp" size={18} />}
                      {METHOD_INFO[m].key === 'shopee' && <SimpleIcon name="shopee" size={18} />}
                      {t(METHOD_INFO[m].title)}
                    </span>
                    <span className="block text-sm text-slate-500">{t(METHOD_INFO[m].text)}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </Section>

        {needsForm && (
          <Section title={t('2. Voucher')}>
            {quote.available_vouchers.length > 0 && (
              <ul className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0">
                {quote.available_vouchers.map((v) => {
                  const selected = codes.includes(v.code);
                  const applied = appliedCodes.includes(v.code);
                  const problem = quote.vouchers.rejected.find((r) => r.code === v.code);
                  const usable = method === 'WHATSAPP' ? v.for_whatsapp : method === 'MIDTRANS' ? v.for_midtrans : true;
                  return (
                    <li key={v.code} className="w-[80%] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                      <button
                        type="button"
                        onClick={() => toggleVoucher(v)}
                        disabled={!usable && !selected}
                        aria-pressed={selected}
                        className={`flex h-full w-full items-center gap-2.5 rounded-xl border-2 p-2.5 text-left transition disabled:opacity-45 ${
                          applied ? 'border-emerald-600 bg-emerald-50' : selected ? 'border-ink bg-mist' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold text-white ${
                            v.type === 'FREE_SHIPPING' ? 'bg-emerald-700' : 'bg-sale-600'
                          }`}
                          aria-hidden="true"
                        >
                          {v.type === 'FREE_SHIPPING' ? 'ONGKIR' : '%'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{v.headline}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {problem && selected ? problem.message : !usable ? t('Tidak berlaku untuk metode ini') : v.terms[0]}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                            applied ? 'bg-emerald-700 text-white' : selected ? 'bg-ink text-surface' : 'bg-mist text-ink'
                          }`}
                        >
                          {applied ? 'Terpakai' : selected ? 'Dipilih' : 'Pakai'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {quote.available_vouchers.length > 1 && (
              <p className="mt-1 text-[11px] text-slate-500 sm:hidden">{t('Geser untuk melihat voucher lain')} <ArrowRight size={12} className="inline" /></p>
            )}

            {!showCodeInput ? (
              <button type="button" onClick={() => setShowCodeInput(true)} className="mt-3 text-sm font-bold text-ink underline">
                {t('Punya kode voucher lain?')}
              </button>
            ) : (
            <div className="mt-3 flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e: { key: string; preventDefault(): void }) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCode();
                  }
                }}
                placeholder={t('Ketik kode voucher')}
                autoFocus
                aria-label={t('Kode voucher')}
                autoCapitalize="characters"
                className={inputCls() + ' uppercase placeholder:normal-case'}
              />
              <button
                type="button"
                onClick={() => addCode()}
                className="shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-surface hover:bg-slate-800"
              >
                {t('Pakai')}
              </button>
            </div>
            )}

            {rejected
              .filter((r) => !quote.available_vouchers.some((v) => v.code === r.code))
              .map((r) => (
                <p key={r.code} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <span>
                    <b>{r.code}</b>: {r.message}
                  </span>
                  <button type="button" onClick={() => setCodes((c) => c.filter((x) => x !== r.code))} className="font-bold underline">
                    {t('Hapus')}
                  </button>
                </p>
              ))}
            <p className="mt-3 text-xs text-slate-500">
              {t('Maks. 1 voucher diskon + 1 gratis ongkir. Voucher yang sudah diklaim otomatis dipilih.')}
            </p>
          </Section>
        )}

        {needsForm && (
          <>
            <Section title={t('3. Data pembeli')}>
              {saved.length > 0 && (
                <div className="mb-5">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                    <PinIcon /> {t('Alamat tersimpan')}
                  </p>
                  <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {saved.map((a) => {
                      const on = savedId === a.id;
                      return (
                        <li key={a.id} className="relative">
                          <button
                            type="button"
                            onClick={() => applySaved(a)}
                            aria-pressed={on}
                            className={`h-full w-full rounded-xl p-3 pr-9 text-left ring-1 transition ${
                              on ? 'bg-mist ring-2 ring-ink' : 'bg-surface ring-slate-200 hover:ring-slate-400'
                            }`}
                          >
                            <span className="block truncate text-sm font-bold text-ink">
                              {a.name} <span className="font-normal text-slate-500">· {a.phone}</span>
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500">{addressLine(a)}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              removeAddress(a.id);
                              setSaved(getSavedAddresses());
                              if (on) newAddress();
                            }}
                            aria-label={t('Hapus alamat tersimpan')}
                            title={t('Hapus')}
                            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                          >
                            <TablerIcon name="x" size={14} stroke={2.4} />
                          </button>
                        </li>
                      );
                    })}
                    <li>
                      <button
                        type="button"
                        onClick={newAddress}
                        aria-pressed={savedId === null}
                        className={`flex h-full min-h-[64px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed p-3 text-sm font-bold transition ${
                          savedId === null ? 'border-ink text-ink' : 'border-slate-300 text-slate-500 hover:border-slate-500 hover:text-ink'
                        }`}
                      >
                        <span aria-hidden="true" className="text-lg leading-none">+</span> {t('Pakai alamat baru')}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t('Nama lengkap')} required error={errors.name} className="sm:col-span-2">
                  <input value={form.name} onChange={(e) => update('name', e.target.value)} autoComplete="name" maxLength={120} className={inputCls(errors.name)} />
                </Field>
                <Field label={t('No. HP / WhatsApp')} required error={errors.phone}>
                  <input value={form.phone} onChange={(e) => update('phone', e.target.value)} inputMode="tel" autoComplete="tel" placeholder="081234567890" maxLength={20} className={inputCls(errors.phone)} />
                </Field>
                <Field label={t('Email (opsional)')} error={errors.email}>
                  <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" inputMode="email" autoComplete="email" className={inputCls(errors.email)} />
                </Field>
              </div>
            </Section>

            <Section title={t('4. Alamat pengiriman')}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AddressFields
                  value={{ province: form.province, city: form.city, district: form.district, village: form.village, postal_code: form.postal_code }}
                  onChange={(patch) => {
                    updateMany(patch);
                    setSavedId(null);
                  }}
                  errors={errors}
                  inputClass={inputCls}
                />
                <Field label={t('Nama jalan, nomor rumah, RT/RW')} required error={errors.address} className="sm:col-span-2">
                  <textarea
                    value={form.address}
                    onChange={(e) => {
                      update('address', e.target.value);
                      setSavedId(null);
                    }}
                    rows={2}
                    autoComplete="street-address"
                    maxLength={380}
                    placeholder={t('Contoh: Jl. Melati No. 12, RT 03/RW 05, dekat masjid')}
                    className={inputCls(errors.address)}
                  />
                </Field>
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-mist p-3">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#191919]"
                />
                <span className="text-sm">
                  <span className="block font-bold text-ink">{t('Simpan data & alamat untuk pembelian berikutnya')}</span>
                  <span className="block text-xs text-slate-500">{t('Tersimpan hanya di browser perangkat ini, jadi nanti tidak perlu mengetik ulang.')}</span>
                </span>
              </label>
            </Section>

            <Section title={t('5. Pilih pengiriman')}>
              <div role="radiogroup" aria-label={t('Jasa pengiriman')} className="space-y-5">
                {SHIPPING_GROUPS.map((group) => (
                  <div key={group.name}>
                    <p className="text-sm font-extrabold text-ink">
                      {t(group.name)} <span className="font-normal text-slate-500">· {t(group.note)}</span>
                    </p>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.options.map((o) => {
                        const on = form.service === o.code;
                        return (
                          <label
                            key={o.code}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 transition ${
                              on ? 'bg-brand-50 ring-2 ring-brand-600 dark:bg-brand-500/10' : 'bg-surface ring-slate-200 hover:ring-slate-400'
                            }`}
                          >
                            <input
                              type="radio"
                              name="service"
                              value={o.code}
                              checked={on}
                              onChange={() => update('service', o.code)}
                              className="h-4 w-4 accent-[#111111]"
                            />
                            <CourierBadge courier={o.courier} logo={courierLogos[o.logo]} label={o.label} />
                            <span className="text-sm font-bold text-ink">{o.short}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {errors.service && <p className="mt-3 text-sm font-semibold text-red-600">{errors.service}</p>}
              <p className="mt-4 text-xs text-slate-500">
                {t('Ongkir mengikuti tarif resmi ekspedisi dan dikonfirmasi admin lewat WhatsApp sebelum pembayaran.')}
              </p>
            </Section>

            <Section title={t('6. Catatan untuk penjual (opsional)')}>
              <Field label={t('Catatan')} error={errors.notes}>
                <textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} maxLength={1000} placeholder={t('Contoh: warna hitam, tolong dibungkus bubble wrap tebal')} className={inputCls(errors.notes)} />
              </Field>
            </Section>
          </>
        )}
      </div>

      {/* Ringkasan */}
      <aside className="h-fit rounded-2xl border border-slate-200 bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-black text-slate-900">{t('Ringkasan pesanan')}</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {quote.items.map((item) => (
            <li key={`${item.product_id}:${item.variation_id}`} className="flex gap-3 py-3">
              {item.image_url && (
                <img src={productImg(item.image_url, 120)} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-slate-100 object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/produk/${item.product_id}`} className="line-clamp-2 text-sm text-slate-800 hover:underline">{item.name}</Link>
                {(item.variation_name || publicSku(item.sku)) && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.variation_name}
                    {item.variation_name && publicSku(item.sku) && ' · '}
                    {publicSku(item.sku) && `SKU ${publicSku(item.sku)}`}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.quantity} × {money(item.unit_price)}
                </p>
                {!item.in_stock && (
                  <p className="mt-0.5 text-xs font-semibold text-red-600">
                    {t('Stok tidak cukup (tersisa {n})', { n: item.stock })}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-900">{money(item.subtotal)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">{t('Subtotal')}</dt>
            <dd className="font-semibold">{money(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{t('Ongkos kirim')}</dt>
            <dd className="text-right text-slate-500">{t('Dikonfirmasi penjual')}</dd>
          </div>
          {quote.total_weight_grams ? (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t('Perkiraan berat kirim')}</dt>
              <dd className="text-right text-slate-500">
                {quote.weight_complete ? '' : '± '}
                {weightText(quote.total_weight_grams)}
              </dd>
            </div>
          ) : null}
          {quote.vouchers.applied
            .filter((a) => a.kind === 'discount')
            .map((a) => (
              <div key={a.code} className="flex justify-between gap-4 text-emerald-700">
                <dt>{t('Voucher {code}', { code: a.code })}</dt>
                <dd className="font-semibold">-{money(a.amount)}</dd>
              </div>
            ))}
          {shippingDiscount > 0 && (
            <div className="flex justify-between gap-4 text-emerald-700">
              <dt>{t('Potongan ongkir')}</dt>
              <dd className="text-right font-semibold">{t('s/d {date}', { date: money(shippingDiscount) })}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
            <dt className="font-bold">{t('Total produk')}</dt>
            <dd className={`font-black text-slate-900 transition-opacity ${quoteLoading ? 'opacity-50' : ''}`}>
              {money(total)}
            </dd>
          </div>
          <p className="text-xs text-slate-500">
            {t(quote.tax_note)}
            {shippingDiscount > 0 && ' ' + t('Potongan ongkir dipotong saat admin mengonfirmasi ongkir.')}
            {voucherDiscount === 0 && shippingDiscount === 0 && ' ' + t('Belum ada voucher terpakai.')}
          </p>
        </dl>

        {blocked && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
            {t('Ada produk yang stoknya tidak cukup. Kurangi jumlahnya di')}{' '}
            <Link href="/cart" className="font-bold underline">{t('keranjang')}</Link>.
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
          className="mt-5 w-full rounded-xl bg-brand-600 px-5 py-4 font-bold text-onbrand transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting
            ? 'Memproses…'
            : method === 'MIDTRANS'
              ? t('Bayar Sekarang')
              : method === 'WHATSAPP'
                ? t('Buat Pesanan & Buka WhatsApp')
                : method === 'SHOPEE'
                  ? t('Lanjut ke Shopee')
                  : t('Pilih metode pembayaran')}
        </button>
        <Link href="/cart" className="mt-3 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-ink">
          <ArrowLeftIcon size={15} />
          {t('Ubah keranjang')}
        </Link>
      </aside>
    </form>
  );
}

function PinIcon() {
  return (
    <TablerIcon name="map-pin" size={16} />
  );
}

function inputCls(error?: string) {
  return `w-full rounded-xl border px-3.5 py-2.5 text-base outline-none transition focus:ring-2 sm:text-sm ${
    error
      ? 'border-red-400 focus:ring-red-200'
      : 'border-slate-300 focus:border-slate-900 focus:ring-slate-200'
  }`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-surface p-5">
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
