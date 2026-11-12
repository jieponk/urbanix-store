import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) return Response.json({ error: 'Produk tidak ditemukan.' }, { status: 404 });
  const src = new URL(request.url).searchParams;
  const q = new URLSearchParams({ page: src.get('page') || '1', size: '10' });
  if (src.get('foto') === '1') q.set('foto', '1');
  return proxyToBackend(request, `products/${params.id}/reviews/?${q}`, 'GET');
}
