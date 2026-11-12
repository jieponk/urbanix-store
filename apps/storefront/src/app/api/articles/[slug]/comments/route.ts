import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const visitor = new URL(request.url).searchParams.get('visitor') || '';
  return proxyToBackend(
    request,
    `articles/${encodeURIComponent(params.slug)}/comments/?visitor=${encodeURIComponent(visitor)}`,
    'GET'
  );
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  return proxyToBackend(request, `articles/${encodeURIComponent(params.slug)}/comments/`, 'POST');
}
