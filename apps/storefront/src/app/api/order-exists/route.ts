import { NextResponse } from 'next/server';
import { API } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Cek apakah nomor pesanan ada (tanpa mengirim isi pesanan ke browser). */
export async function GET(request: Request) {
  const no = (new URL(request.url).searchParams.get('no') || '').trim().slice(0, 50);
  if (!/^[A-Za-z0-9-]{6,50}$/.test(no)) return NextResponse.json({ ok: false }, { status: 404 });
  try {
    const res = await fetch(`${API}/checkout/orders/${encodeURIComponent(no)}/`, { cache: 'no-store' });
    if (res.status === 404) return NextResponse.json({ ok: false }, { status: 404 });
    if (!res.ok) return NextResponse.json({ ok: false }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
