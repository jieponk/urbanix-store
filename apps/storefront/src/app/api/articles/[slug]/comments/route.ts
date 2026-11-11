import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  return proxyToBackend(request, `articles/${encodeURIComponent(params.slug)}/comments/`, 'POST');
}
