import { API } from '@/lib/api';
import { SELLER_COOKIE, readCookie, sessionCookie } from '@/lib/sellerServer';

/**
 * Semua permintaan Seller Center lewat sini: token admin diambil dari cookie httpOnly
 * lalu diteruskan ke Django sebagai "Authorization: Token ...". Mendukung JSON, upload file, dan unduhan Excel.
 */
async function forward(request: Request, context: { params: { path: string[] } }) {
  const { path } = context.params;
  const token = readCookie(request, SELLER_COOKIE);
  if (!token) return Response.json({ error: 'Silakan login dulu.' }, { status: 401 });

  const url = new URL(request.url);
  const target = `${API}/seller/${path.map(encodeURIComponent).join('/')}/${url.search}`;
  const headers: Record<string, string> = { Authorization: `Token ${token}`, Accept: 'application/json' };
  const contentType = request.headers.get('content-type');
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
    if (contentType) headers['Content-Type'] = contentType;
  }

  try {
    const response = await fetch(target, { method: request.method, headers, body, cache: 'no-store' });
    const out = new Headers();
    for (const name of ['content-type', 'content-disposition']) {
      const value = response.headers.get(name);
      if (value) out.set(name, value);
    }
    if (response.status === 401) out.append('Set-Cookie', sessionCookie('', request, 0));
    return new Response(response.status === 204 ? null : await response.arrayBuffer(), {
      status: response.status,
      headers: out,
    });
  } catch {
    return Response.json({ error: 'Server toko tidak dapat dihubungi. Coba lagi sebentar.' }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
