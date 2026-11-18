import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Komentar & reaksi di halaman berita /berita/<id> (diteruskan ke backend). */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) return Response.json({ error: 'Tidak ditemukan' }, { status: 404 });
  const visitor = new URL(request.url).searchParams.get('visitor') || '';
  return proxyToBackend(request, `news/${params.id}/comments/?visitor=${encodeURIComponent(visitor)}`, 'GET');
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) return Response.json({ error: 'Tidak ditemukan' }, { status: 404 });
  return proxyToBackend(request, `news/${params.id}/comments/`, 'POST');
}
