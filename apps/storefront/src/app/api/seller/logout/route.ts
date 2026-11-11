import { API } from '@/lib/api';
import { SELLER_COOKIE, readCookie, sessionCookie } from '@/lib/sellerServer';

export async function POST(request: Request) {
  const token = readCookie(request, SELLER_COOKIE);
  if (token) {
    await fetch(`${API}/seller/logout/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      cache: 'no-store',
    }).catch(() => null);
  }
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', request, 0) } });
}
