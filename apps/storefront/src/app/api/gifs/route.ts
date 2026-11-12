import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams;
  const q = new URLSearchParams({ q: (src.get('q') || '').slice(0, 50), offset: src.get('offset') || '0' });
  return proxyToBackend(request, `gifs/?${q}`, 'GET');
}
