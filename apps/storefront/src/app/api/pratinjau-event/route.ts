import { EVENT_PREVIEW_COOKIE } from '@/lib/event-server';
import { EVENT_KEYS, type EventKey } from '@/lib/events';

/**
 * Pratinjau tema event di perangkat ini saja (1 jam): /api/pratinjau-event?tema=gajian
 * Selesai: /api/pratinjau-event?tema=selesai (&ke=seller untuk kembali ke Dekor toko).
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  const tema = url.searchParams.get('tema') as EventKey | null;
  const back = url.searchParams.get('ke') === 'seller' ? '/seller/dekor' : '/';
  const on = Boolean(tema && EVENT_KEYS.includes(tema));
  const cookie = on
    ? `${EVENT_PREVIEW_COOKIE}=${tema}; Path=/; Max-Age=3600; SameSite=Lax`
    : `${EVENT_PREVIEW_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  // Location relatif: aman di balik proxy (origin container berbeda dengan domain toko).
  return new Response(null, { status: 303, headers: { Location: back, 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
}
