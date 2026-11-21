'use client';

import { shopHref } from '@/lib/sellerUrl';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, ErrorBox, Field, PageHeader, Spinner, btn, inputCls } from '@/components/seller/ui';
import { EVENT_KEYS, EVENT_RULES, resolveEvent, upcomingSchedule, type EventConfig, type EventKey, type ShopEvent } from '@/lib/events';
import { EVENT_THEMES } from '@/lib/eventTheme';
import { DEFAULT_LAYOUT, HOME_SECTIONS, resolveLayout, type HomeLayoutItem } from '@/lib/homeLayout';
import TablerIcon from '@/components/TablerIcon';
import { fmtDateTime, fromLocalInput, notify, sellerApi, toLocalInput, useSellerData } from '@/lib/seller';

const MODES: { value: EventConfig['mode']; title: string; desc: string }[] = [
  { value: 'auto', title: 'Otomatis', desc: 'Ikut kalender: tanggal kembar, 12.12, payday 15–16, gajian 25–28.' },
  { value: 'force', title: 'Tema pilihan', desc: 'Pakai satu tema sekarang juga, sampai tanggal yang kamu tentukan.' },
  { value: 'off', title: 'Matikan', desc: 'Toko tampil biasa tanpa pita & banner event.' },
];

const EVENT_NAME: Record<EventKey, string> = {
  kembar: 'Tanggal kembar',
  harbolnas: 'Harbolnas 12.12',
  tengah: 'Payday tengah bulan',
  gajian: 'Gajian Sale',
};

const dayFmt = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });

/** Miniatur tampilan event (pita, banner beranda, label kartu) memakai kelas tema yang sama dengan toko. */
function ThemePreview({ k }: { k: EventKey }) {
  const th = EVENT_THEMES[k];
  const rule = EVENT_RULES.find((r) => r.key === k)!;
  const big = k === 'harbolnas' ? '12.12' : k === 'kembar' ? '11.11' : rule.big(1, 1);
  const title = k === 'kembar' ? 'Sale 11.11' : rule.title(1, 1);
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
      <div className={`flex items-center justify-center gap-1.5 px-2 py-1 text-[9px] font-semibold ${th.ribbon}`}>
        <span className={`rounded-full px-1.5 text-[8px] font-extrabold ${th.ribbonBadge}`}>{big}</span>
        {EVENT_NAME[k]} sedang berlangsung
      </div>
      <div className="bg-mist p-2">
        <div className={`relative isolate overflow-hidden rounded-lg px-3 py-3 ${th.hero}`}>
          <span aria-hidden="true" className={`absolute -right-1 -top-3 -z-10 text-5xl font-extrabold tracking-tighter ${th.heroBig}`}>
            {big}
          </span>
          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[7px] font-extrabold tracking-wider ${th.heroChip}`}>EVENT TERBATAS</span>
          <p className="mt-1 text-sm font-extrabold leading-tight">{title}</p>
          <p className={`text-[9px] ${th.heroSub}`}>{rule.sub}</p>
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold ${th.heroCta}`}>Belanja sekarang →</span>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className="rounded bg-sale-600 px-1 text-[9px] font-extrabold text-white">-12%</span>
          <span className={`rounded px-1 text-[9px] font-extrabold ${th.card}`}>{big}</span>
          <span className="text-[9px] text-slate-500">label di kartu produk</span>
        </div>
      </div>
    </div>
  );
}

export default function DekorPage() {
  const { data, setData, error, loading, reload } = useSellerData<any>('settings');
  const [form, setForm] = useState<EventConfig | null>(null);
  const [layout, setLayout] = useState<HomeLayoutItem[]>(DEFAULT_LAYOUT);
  const [texts, setTexts] = useState({ event_title: '', event_subtitle: '', event_cta: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        mode: data.event_mode || 'auto',
        theme: data.event_theme || null,
        until: data.event_until || null,
        teaser_days: data.event_teaser_days ?? 3,
      });
      setLayout(resolveLayout(data.home_layout));
      setTexts({ event_title: data.event_title || '', event_subtitle: data.event_subtitle || '', event_cta: data.event_cta || '' });
    }
  }, [data]);

  const state = useMemo(() => (form ? resolveEvent(form, null) : null), [form]);
  const schedule = useMemo<ShopEvent[]>(() => upcomingSchedule(new Date(), 2).slice(0, 8), []);
  const dirty =
    !!data &&
    !!form &&
    (form.mode !== (data.event_mode || 'auto') ||
      (form.theme || '') !== (data.event_theme || '') ||
      (form.mode === 'force' && (form.until || '') !== (data.event_until || '')) ||
      form.teaser_days !== (data.event_teaser_days ?? 3) ||
      JSON.stringify(layout) !== JSON.stringify(resolveLayout(data.home_layout)) ||
      texts.event_title !== (data.event_title || '') ||
      texts.event_subtitle !== (data.event_subtitle || '') ||
      texts.event_cta !== (data.event_cta || ''));

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= layout.length) return;
    const next = [...layout];
    [next[i], next[j]] = [next[j], next[i]];
    setLayout(next);
  }

  async function save() {
    if (!form) return;
    if (form.mode === 'force' && !form.theme) {
      notify('Pilih tema dulu.', 'error');
      return;
    }
    setBusy(true);
    try {
      setData(
        await sellerApi('settings', {
          method: 'PATCH',
          body: {
            event_mode: form.mode,
            event_theme: form.theme || '',
            event_until: form.mode === 'force' ? form.until : null,
            event_teaser_days: form.teaser_days,
            home_layout: layout,
            event_title: texts.event_title.trim(),
            event_subtitle: texts.event_subtitle.trim(),
            event_cta: texts.event_cta.trim(),
          },
        }),
      );
      notify('Dekor toko disimpan. Tampil di toko dalam ±1 menit.');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if ((loading && !data) || !form || !state) return <Spinner />;
  const set = (patch: Partial<EventConfig>) => setForm({ ...form, ...patch });
  const showing = state.event;

  return (
    <div className="pb-24 lg:pb-0">
      <PageHeader
        title="Dekor toko"
        pretitle="Marketing"
        subtitle="Atur susunan beranda, tema & teks event (pita atas, banner, label kartu produk)."
        actions={
          <button type="button" disabled={busy || !dirty} className={btn.primary} onClick={save}>
            {busy ? 'Menyimpan…' : dirty ? 'Simpan' : 'Tersimpan'}
          </button>
        }
      />

      {/* Status sekarang */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-slate-200">
        <span
          className={`flex h-11 min-w-[44px] items-center justify-center rounded-xl px-2 text-sm font-extrabold ${
            showing ? EVENT_THEMES[showing.key].hero : 'bg-mist text-slate-500'
          }`}
        >
          {showing ? showing.big : '—'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-500">{dirty ? 'Setelah disimpan, toko akan tampil' : 'Toko sekarang tampil'}</p>
          <p className="font-extrabold text-ink">
            {showing
              ? `${showing.title} · tema ${EVENT_THEMES[showing.key].label}`
              : state.upcoming
                ? `Biasa · pita “${state.upcoming.title} segera hadir”`
                : 'Biasa, tanpa event'}
          </p>
          {showing && <p className="text-xs text-slate-500">Sampai {fmtDateTime(showing.endsAt)}</p>}
        </div>
        <a href={shopHref('/')} target="_blank" rel="noreferrer" className={btn.ghost}>
          Lihat toko ↗
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card title="Mode">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Mode dekor">
              {MODES.map((m) => {
                const on = form.mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set({ mode: m.value, theme: m.value === 'force' ? form.theme || 'kembar' : form.theme })}
                    className={`rounded-xl p-3 text-left ring-1 transition ${
                      on ? 'bg-ink text-surface ring-ink' : 'bg-surface text-ink ring-slate-200 hover:ring-slate-400'
                    }`}
                  >
                    <span className="flex items-center justify-between text-sm font-extrabold">
                      {m.title}
                      <span className={`h-4 w-4 rounded-full border-2 ${on ? 'border-surface bg-surface' : 'border-slate-300'}`} />
                    </span>
                    <span className={`mt-1 block text-xs leading-snug ${on ? 'opacity-80' : 'text-slate-500'}`}>{m.desc}</span>
                  </button>
                );
              })}
            </div>
            {form.mode === 'force' && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Pakai sampai" hint="Kosongkan = sampai diganti. Setelah lewat, kembali otomatis.">
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={toLocalInput(form.until)}
                    onChange={(e) => set({ until: fromLocalInput(e.target.value) })}
                  />
                </Field>
              </div>
            )}
          </Card>

          <Card
            title="Tata letak beranda"
            action={
              <button type="button" className={btn.small} onClick={() => setLayout(DEFAULT_LAYOUT)}>
                <TablerIcon name="arrow-back-up" size={14} /> Susunan bawaan
              </button>
            }
            padded={false}
          >
            <p className="border-b border-slate-200 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
              Banner selalu paling atas. Atur urutan bagian di bawahnya dengan tombol panah, sembunyikan dengan ikon mata.
            </p>
            <ol className="divide-y divide-slate-200">
              {layout.map((item, i) => {
                const meta = HOME_SECTIONS.find((sec) => sec.key === item.key)!;
                return (
                  <li key={item.key} className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 ${item.visible ? '' : 'bg-mist/60'}`}>
                    <span className="text-slate-400"><TablerIcon name="grip-vertical" size={16} /></span>
                    <span className="w-5 text-right text-xs font-semibold tabular-nums text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-semibold ${item.visible ? 'text-ink' : 'text-slate-400 line-through'}`}>{meta.label}</span>
                      <span className="block truncate text-xs text-slate-500">{meta.hint}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <button type="button" aria-label={`Naikkan ${meta.label}`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-slate-500 hover:bg-mist hover:text-ink disabled:opacity-30">
                        <TablerIcon name="arrow-up" size={16} />
                      </button>
                      <button type="button" aria-label={`Turunkan ${meta.label}`} disabled={i === layout.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-slate-500 hover:bg-mist hover:text-ink disabled:opacity-30">
                        <TablerIcon name="arrow-down" size={16} />
                      </button>
                      <button
                        type="button"
                        aria-pressed={item.visible}
                        aria-label={item.visible ? `Sembunyikan ${meta.label}` : `Tampilkan ${meta.label}`}
                        onClick={() => setLayout(layout.map((x) => (x.key === item.key ? { ...x, visible: !x.visible } : x)))}
                        className={`rounded-md p-1.5 hover:bg-mist ${item.visible ? 'text-ink' : 'text-slate-400'}`}
                      >
                        <TablerIcon name={item.visible ? 'eye' : 'eye-off'} size={16} />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card title="Tema event" action={<span className="text-xs text-slate-500">Pratinjau hanya di perangkat ini</span>}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {EVENT_KEYS.map((k) => {
                const chosen = form.mode === 'force' && form.theme === k;
                return (
                  <div key={k} className={`rounded-2xl p-2 ring-2 transition ${chosen ? 'ring-ink' : 'ring-transparent'}`}>
                    <ThemePreview k={k} />
                    <div className="mt-2 flex items-center justify-between gap-2 px-1">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-ink">{EVENT_NAME[k]}</p>
                        <p className="text-xs text-slate-500">Tema {EVENT_THEMES[k].label}</p>
                      </div>
                      {chosen && <Badge tone="green">Dipakai</Badge>}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 px-1 pb-1">
                      <a href={`/api/pratinjau-event?tema=${k}`} target="_blank" rel="noreferrer" className={btn.small}>
                        Pratinjau ↗
                      </a>
                      <button type="button" className={btn.small} onClick={() => set({ mode: 'force', theme: k })}>
                        {chosen ? '✓ Dipilih' : 'Pakai sekarang'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Teks banner event">
            <div className="space-y-3">
              <Field label="Judul" hint="Kosongkan untuk memakai judul bawaan event.">
                <input className={inputCls} maxLength={80} value={texts.event_title} placeholder={showing?.title || 'Gajian Sale'} onChange={(e) => setTexts({ ...texts, event_title: e.target.value })} />
              </Field>
              <Field label="Keterangan">
                <input className={inputCls} maxLength={200} value={texts.event_subtitle} placeholder={showing?.sub || 'Saatnya upgrade gear'} onChange={(e) => setTexts({ ...texts, event_subtitle: e.target.value })} />
              </Field>
              <Field label="Teks tombol">
                <input className={inputCls} maxLength={40} value={texts.event_cta} placeholder="Belanja sekarang" onChange={(e) => setTexts({ ...texts, event_cta: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Jadwal otomatis">
            {form.mode !== 'auto' && (
              <p className="mb-3 rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
                Jadwal ini dipakai lagi saat mode kembali ke Otomatis.
              </p>
            )}
            <ul className="space-y-2.5">
              {schedule.map((e) => (
                <li key={e.startsAt + e.key} className="flex items-center gap-3">
                  <span className={`flex h-9 w-12 shrink-0 items-center justify-center rounded-lg text-xs font-extrabold ${EVENT_THEMES[e.key].hero}`}>
                    {e.big}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{e.title}</span>
                    <span className="block text-xs text-slate-500">
                      {dayFmt(e.startsAt)}
                      {dayFmt(e.startsAt) !== dayFmt(e.endsAt) ? ` – ${dayFmt(e.endsAt)}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Diskonnya tetap dibuat di menu Promo harga; dekor hanya tampilannya.</p>
          </Card>

          <Card title="Pita “segera hadir”">
            <Field label="Mulai tampil (hari sebelum event)" hint="0 = tanpa pita hitung mundur. Maks. 14.">
              <input
                type="number"
                min={0}
                max={14}
                className={inputCls}
                value={form.teaser_days}
                onChange={(e) => set({ teaser_days: Math.max(0, Math.min(14, Number(e.target.value) || 0)) })}
              />
            </Field>
          </Card>
        </div>
      </div>

      {/* HP: tombol simpan melayang di atas navigasi bawah saat ada perubahan */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 px-4 lg:hidden">
          <button type="button" disabled={busy} onClick={save} className={`${btn.primary} w-full shadow-xl`}>
            {busy ? 'Menyimpan…' : 'Simpan perubahan'}
          </button>
        </div>
      )}
    </div>
  );
}
