import { API } from '@/lib/api';
import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Status & syarat pengembalian pesanan. */
export async function GET(request: Request, { params }: { params: { orderNumber: string } }) {
  return proxyToBackend(request, `retur/${encodeURIComponent(params.orderNumber)}/`, 'GET');
}

/** Ajukan retur (multipart: foto resi + video unboxing) atau aksi lanjutan (JSON). Body diteruskan apa adanya. */
export async function POST(request: Request, { params }: { params: { orderNumber: string } }) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const type = request.headers.get('content-type');
  if (type) headers['Content-Type'] = type;
  const forwardedFor = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;
  try {
    const body = await request.arrayBuffer();
    const res = await fetch(`${API}/retur/${encodeURIComponent(params.orderNumber)}/`, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });
    const text = await res.text();
    return new Response(text || '{}', { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return Response.json({ error: 'Server toko sedang tidak dapat dihubungi. Coba lagi sebentar.' }, { status: 502 });
  }
}
