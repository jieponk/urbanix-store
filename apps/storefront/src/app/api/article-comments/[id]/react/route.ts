import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) return Response.json({ error: 'Komentar tidak ditemukan.' }, { status: 404 });
  return proxyToBackend(request, `article-comments/${params.id}/react/`, 'POST');
}
