import { API } from '@/lib/api';
import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

const path = (token: string) => `order-reviews/${encodeURIComponent(token)}/`;

export async function GET(request: Request, { params }: { params: { token: string } }) {
  return proxyToBackend(request, path(params.token), 'GET');
}

/** Ulasan bisa membawa foto (multipart), jadi badan permintaan diteruskan apa adanya. */
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const type = request.headers.get('content-type');
  if (type) headers['Content-Type'] = type;
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
  if (ip) headers['X-Forwarded-For'] = ip;
  try {
    const res = await fetch(`${API}/${path(params.token)}`, {
      method: 'POST',
      headers,
      body: await request.arrayBuffer(),
      cache: 'no-store',
    });
    return new Response((await res.text()) || '{}', { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return Response.json({ error: 'Server toko sedang tidak dapat dihubungi. Coba lagi sebentar.' }, { status: 502 });
  }
}
