'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { useT } from '@/components/LangProvider';
import { findByName, loadProvince, loadProvinces, norm, type ProvinceData } from '@/lib/wilayah';

export type RegionValue = {
  province: string;
  city: string;
  district: string;
  village: string;
  postal_code: string;
};

type Props = {
  value: RegionValue;
  onChange: (patch: Partial<RegionValue>) => void;
  errors?: Partial<Record<keyof RegionValue, string>>;
  inputClass: (error?: string) => string;
};

/**
 * Provinsi → Kabupaten/Kota → Kecamatan → Kelurahan/Desa dengan saran (bisa diketik untuk mencari).
 * Kode pos terisi otomatis dari desa. Pembeli tetap boleh mengetik bebas bila wilayahnya tidak ada di daftar.
 */
export default function AddressFields({ value, onChange, errors = {}, inputClass }: Props) {
  const t = useT();
  const [provinces, setProvinces] = useState<[string, string][]>([]);
  const [data, setData] = useState<ProvinceData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProvinces().then(setProvinces);
  }, []);

  const province = findByName(provinces.map(([code, name]) => [name, code] as [string, string]), value.province);
  const provinceCode = province?.[1] ?? '';

  useEffect(() => {
    if (!provinceCode) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    loadProvince(provinceCode).then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [provinceCode]);

  const regency = data ? findByName(data, value.city) : undefined;
  const district = regency ? findByName(regency[1], value.district) : undefined;
  const village = district ? findByName(district[1], value.village) : undefined;

  // Kode pos otomatis: dari desa terpilih, atau bila semua desa di kecamatan itu sama kode posnya.
  const postalOptions = useMemo(() => {
    if (village?.[1]) return [village[1]];
    if (!district) return [];
    return Array.from(new Set(district[1].map((v) => v[1]).filter(Boolean))).sort();
  }, [village, district]);

  useEffect(() => {
    if (postalOptions.length === 1 && value.postal_code !== postalOptions[0]) onChange({ postal_code: postalOptions[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postalOptions.join(',')]);

  const hint = (parent: string) => t('Pilih {name} dulu', { name: parent });

  return (
    <>
      <div className="sm:col-span-2">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t('Negara')}</span>
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-mist px-3.5 py-2.5 text-base text-slate-700 sm:text-sm">
          <span aria-hidden="true" className="inline-flex h-4 w-6 flex-col overflow-hidden rounded-[3px] ring-1 ring-slate-300">
            <span className="h-1/2 bg-[#e30220]" />
            <span className="h-1/2 bg-white" />
          </span>
          Indonesia
          <span className="ml-auto text-xs text-slate-500">{t('Saat ini hanya kirim dalam negeri')}</span>
        </div>
      </div>

      <Combo
        label={t('Provinsi')}
        required
        value={value.province}
        options={provinces.map(([, name]) => name)}
        placeholder={t('Ketik atau pilih provinsi')}
        error={errors.province}
        inputClass={inputClass}
        autoComplete="address-level1"
        onChange={(v) => onChange({ province: v, city: '', district: '', village: '', postal_code: '' })}
      />
      <Combo
        label={t('Kota / Kabupaten')}
        required
        value={value.city}
        options={data?.map((r) => r[0]) ?? []}
        loading={loading}
        disabledHint={!provinceCode ? hint(t('provinsi')) : ''}
        placeholder={t('Ketik atau pilih kota/kabupaten')}
        error={errors.city}
        inputClass={inputClass}
        autoComplete="address-level2"
        onChange={(v) => onChange({ city: v, district: '', village: '', postal_code: '' })}
      />
      <Combo
        label={t('Kecamatan')}
        required
        value={value.district}
        options={regency?.[1].map((d) => d[0]) ?? []}
        disabledHint={!regency ? hint(t('kota/kabupaten')) : ''}
        placeholder={t('Ketik atau pilih kecamatan')}
        error={errors.district}
        inputClass={inputClass}
        autoComplete="address-level3"
        onChange={(v) => onChange({ district: v, village: '', postal_code: '' })}
      />
      <Combo
        label={t('Kelurahan / Desa')}
        value={value.village}
        options={district?.[1].map((v) => v[0]) ?? []}
        disabledHint={!district ? hint(t('kecamatan')) : ''}
        placeholder={t('Ketik atau pilih kelurahan/desa')}
        error={errors.village}
        inputClass={inputClass}
        autoComplete="address-level4"
        onChange={(v) => onChange({ village: v })}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t('Kode pos')}</span>
        <input
          value={value.postal_code}
          onChange={(e) => onChange({ postal_code: e.target.value.replace(/\D/g, '').slice(0, 5) })}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          list={postalOptions.length > 1 ? 'kodepos-saran' : undefined}
          className={inputClass(errors.postal_code)}
        />
        {postalOptions.length > 1 && (
          <>
            <datalist id="kodepos-saran">
              {postalOptions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {postalOptions.slice(0, 6).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ postal_code: p })}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition ${
                    value.postal_code === p ? 'bg-ink text-surface ring-ink' : 'text-slate-600 ring-slate-300 hover:ring-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </span>
          </>
        )}
        {errors.postal_code && <span className="mt-1 block text-xs text-red-600">{errors.postal_code}</span>}
      </label>
    </>
  );
}

/** Kolom teks dengan daftar saran yang tersaring saat mengetik (aksesibel: role combobox/listbox). */
function Combo({
  label,
  required,
  value,
  options,
  onChange,
  placeholder,
  error,
  inputClass,
  autoComplete,
  loading,
  disabledHint = '',
}: {
  label: string;
  required?: boolean;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  inputClass: (error?: string) => string;
  autoComplete?: string;
  loading?: boolean;
  disabledHint?: string;
}) {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = norm(query);
    if (!q) return options.slice(0, 80);
    const words = q.split(' ');
    const scored = options
      .map((o) => {
        const n = norm(o);
        if (!words.every((w) => n.includes(w))) return null;
        // Nama yang diawali kata kunci tampil lebih dulu ("bandung" → "Kota Bandung" & "Kabupaten Bandung" di atas).
        const bare = n.replace(/^(kabupaten|kota|kab|kota administrasi|kabupaten administrasi) /, '');
        return { o, s: n.startsWith(q) || bare.startsWith(q) ? 0 : 1 };
      })
      .filter((x): x is { o: string; s: number } => x !== null)
      .sort((a, b) => a.s - b.s);
    return scored.slice(0, 80).map((x) => x.o);
  }, [options, query]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (o: string) => {
    onChange(o);
    setQuery('');
    setOpen(false);
  };
  const disabled = Boolean(disabledHint);
  const showList = open && !disabled && (matches.length > 0 || loading);

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={`${id}-in`} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <div className="relative">
        <input
          id={`${id}-in`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={showList && matches[active] ? `${id}-o${active}` : undefined}
          value={open ? query || value : value}
          placeholder={disabled ? disabledHint : placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={100}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onChange(e.target.value);
          }}
          onBlur={() => {
            // Tutup setelah klik saran sempat diproses.
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, matches.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && showList && matches[active]) {
              e.preventDefault();
              pick(matches[active]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          className={`${inputClass(error)} pr-9 disabled:cursor-not-allowed disabled:bg-mist disabled:text-slate-400`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>
      {showList && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-surface py-1 shadow-xl"
        >
          {loading && matches.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-slate-500">{t('Memuat daftar…')}</li>
          ) : (
            matches.map((o, i) => (
              <li
                key={o}
                id={`${id}-o${i}`}
                data-i={i}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e: ReactMouseEvent<HTMLLIElement>) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`cursor-pointer px-3.5 py-2.5 text-sm ${
                  i === active ? 'bg-mist text-ink' : 'text-slate-700'
                } ${norm(o) === norm(value) ? 'font-bold' : ''}`}
              >
                {o}
              </li>
            ))
          )}
        </ul>
      )}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </div>
  );
}
