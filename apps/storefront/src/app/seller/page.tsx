'use client';

import { sellerHref } from '@/lib/sellerUrl';
import Link from 'next/link';
import { useState } from 'react';
import RevenueChart from '@/components/seller/RevenueChart';
import { Badge, Card, ErrorBox, ORDER_TONE, PageHeader, Spinner, StatCard, Tabs, btn } from '@/components/seller/ui';
import { fmtDateTime, rp, useSellerData } from '@/lib/seller';
import { icons } from '@/components/seller/SellerIcons';
import TablerIcon, { type TablerName } from '@/components/TablerIcon';

const RANGES = [
  { value: 'today', label: 'Hari ini' },
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
  { value: 'month', label: 'Bulan ini' },
  { value: '90d', label: '90 hari' },
];

function Change({ now, before }: { now: number; before: number }) {
  if (!before) return <span className="text-xs text-slate-500">periode lalu: -</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return (
    <span className={`text-xs font-bold ${pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% <span className="font-normal text-slate-500">vs periode lalu</span>
    </span>
  );
}


function ActionCard({
  href,
  icon,
  label,
  hint,
  count,
  cta,
  ctaIcon,
}: {
  href: string;
  icon: TablerName;
  label: string;
  hint: string;
  count: number;
  cta: string;
  ctaIcon: TablerName;
}) {
  const todo = count > 0;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-surface p-4 shadow-[0_2px_4px_rgba(24,36,51,0.04)] transition hover:border-slate-300 hover:shadow-md"
    >
      <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${todo ? 'bg-sale-600 text-white' : 'bg-mist text-slate-500'}`}>
        <TablerIcon name={icon} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-bold leading-7 text-ink tabular-nums">{count}</span>
          <span className="truncate text-sm font-semibold text-ink">{label}</span>
        </span>
        <span className="block truncate text-xs text-slate-500">{todo ? hint : 'Tidak ada yang perlu dikerjakan'}</span>
      </span>
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition ${
          todo ? 'bg-ink text-surface group-hover:opacity-90' : 'border border-slate-300 bg-surface text-slate-500 group-hover:text-ink'
        }`}
      >
        <TablerIcon name={ctaIcon} size={16} />
        <span className="hidden sm:inline">{cta}</span>
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState('30d');
  const { data, error, loading, reload } = useSellerData<any>(`dashboard?range=${range}`);
  const s = data?.summary;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={data ? `Laporan ${data.range.from === data.range.to ? data.range.from : `${data.range.from} s/d ${data.range.to}`} · pesanan dibatalkan tidak dihitung` : 'Ringkasan penjualan toko'}
        actions={<a href={`/api/seller/orders/export?range=${range}`} className={btn.ghost}>Unduh laporan Excel</a>}
      />
      <Tabs items={RANGES} value={range} onChange={setRange} />

      {error ? (
        <div className="mt-4"><ErrorBox message={error} onRetry={reload} /></div>
      ) : loading && !data ? (
        <Spinner />
      ) : data ? (
        <div className={`mt-4 space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Perlu tindakan: kartu putih gaya Tabler, kotak ikon menyala merah bila ada yang harus dikerjakan */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ActionCard
              href={sellerHref('/seller/pesanan?status=PENDING')}
              icon="bell"
              label="Pesanan baru"
              hint="Perlu dikonfirmasi"
              count={data.need_action.new_orders}
              cta="Proses"
              ctaIcon="circle-check"
            />
            <ActionCard
              href={sellerHref('/seller/pesanan?status=PROCESSING')}
              icon="package"
              label="Siap dikirim"
              hint="Input nomor resi"
              count={data.need_action.to_ship}
              cta="Kirim"
              ctaIcon="truck"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={icons.promo({ size: 20 })} tone="red" label="Omzet" value={rp(s.revenue)} foot={<Change now={s.revenue} before={s.prev_revenue} />} />
            <StatCard icon={icons.orders({ size: 20 })} label="Pesanan" value={String(s.orders)} foot={<Change now={s.orders} before={s.prev_orders} />} />
            <StatCard icon={icons.dashboard({ size: 20 })} label="Rata-rata per pesanan" value={rp(s.average)} foot={<span className="text-xs text-slate-500">{s.items_sold} barang terjual</span>} />
            <StatCard icon={icons.voucher({ size: 20 })} label="Total potongan voucher" value={rp(s.discount)} foot={<span className="text-xs text-slate-500">{s.cancelled} pesanan dibatalkan</span>} />
          </div>

          <Card title="Omzet per hari">
            <RevenueChart series={data.series} />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Produk terlaris" className="lg:col-span-2" padded={false}>
              {data.top_products.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Belum ada penjualan.</p>
              ) : (
                <ol className="divide-y divide-slate-200">
                  {data.top_products.map((p: any, i: number) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span className="w-5 text-sm font-extrabold text-slate-400">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">{p.name}</span>
                        {p.variation && <span className="text-xs text-slate-500">{p.variation}</span>}
                      </span>
                      <span className="text-right text-sm">
                        <b className="text-ink">{p.qty} pcs</b>
                        <span className="block text-xs text-slate-500">{rp(p.revenue)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card title="Per metode pembelian">
              {data.by_method.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada data.</p>
              ) : (
                <ul className="space-y-3">
                  {data.by_method.map((m: any) => (
                    <li key={m.method}>
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-ink">{m.label}</span>
                        <span className="text-slate-600">{m.orders} pesanan</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-mist">
                        <div className="h-full rounded-full bg-cobalt-700 dark:bg-slate-300" style={{ width: `${s.revenue ? (m.revenue / s.revenue) * 100 : 0}%` }} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{rp(m.revenue)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-xs font-bold text-slate-500">Voucher terpakai</p>
                {data.vouchers.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-500">Belum ada.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {data.vouchers.map((v: any) => (
                      <li key={v.code}><Badge tone="violet">{v.code} · {v.used}x</Badge></li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Pesanan terbaru" className="lg:col-span-2" padded={false} action={<Link href={sellerHref('/seller/pesanan')} className="text-xs font-bold text-ink hover:underline">Semua</Link>}>
              {data.recent_orders.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">Belum ada pesanan.</p>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {data.recent_orders.map((o: any) => (
                    <li key={o.order_number}>
                      <Link href={sellerHref(`/seller/pesanan/${o.order_number}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-mist sm:px-5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">{o.customer_name || '-'}</span>
                          <span className="text-xs text-slate-500">{o.order_number} · {fmtDateTime(o.created_at)}</span>
                        </span>
                        <span className="text-right">
                          <span className="block text-sm font-bold text-ink">{rp(o.total)}</span>
                          <Badge tone={ORDER_TONE[o.status]}>{o.status_label}</Badge>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-4">
              <Card title="Stok menipis (≤ 2)" padded={false}>
                {data.low_stock.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Aman, tidak ada.</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {data.low_stock.map((x: any, i: number) => (
                      <li key={i}>
                        <Link href={sellerHref(`/seller/produk/${x.product_id}`)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-mist">
                          <span className="min-w-0 flex-1 text-sm">
                            <span className="block truncate font-semibold text-ink">{x.name}</span>
                            <span className="text-xs text-slate-500">{x.variation || x.sku}</span>
                          </span>
                          <Badge tone={x.stock === 0 ? 'red' : 'amber'}>{x.stock === 0 ? 'Habis' : `Sisa ${x.stock}`}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Kesehatan katalog">
                <ul className="space-y-2 text-sm">
                  {[
                    ['Produk aktif', data.catalog.active, 'all'],
                    ['Belum ada link Shopee', data.catalog.no_shopee, 'no_shopee'],
                    ['Stok habis', data.catalog.out_of_stock, 'out_of_stock'],
                    ['Tanpa foto', data.catalog.no_image, 'no_image'],
                    ['Disembunyikan', data.catalog.inactive, 'inactive'],
                  ].map(([label, n, f]) => (
                    <li key={String(f)}>
                      <Link href={sellerHref(`/seller/produk?filter=${f}`)} className="flex justify-between rounded-lg px-2 py-1 hover:bg-mist">
                        <span className="text-slate-600">{label}</span>
                        <b className={Number(n) > 0 && f !== 'all' ? 'text-amber-700' : 'text-ink'}>{n}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
