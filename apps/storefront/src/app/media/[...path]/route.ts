import { BACKEND_ORIGIN } from '@/lib/sellerServer';

/** Gambar upload (banner) disajikan dari backend lewat storefront, supaya bisa dibuka dari HP/IP mana pun. */
export async function GET(_request: Request, context: { params: { path: string[] } }) {
  const { path } = context.params;
  if (path.some((part) => part === '..')) return new Response('Not found', { status: 404 });
  try {
    const response = await fetch(`${BACKEND_ORIGIN}/media/${path.map(encodeURIComponent).join('/')}`, {
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!response.ok) return new Response('Not found', { status: 404 });
    return new Response(await response.arrayBuffer(), {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
