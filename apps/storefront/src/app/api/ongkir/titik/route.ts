import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Titik tengah kecamatan/kota untuk posisi awal peta (OpenStreetMap). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return proxyToBackend(request, `ongkir/titik/?q=${encodeURIComponent(q.slice(0, 120))}`, 'GET');
}
