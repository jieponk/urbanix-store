import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Cari kelurahan/kecamatan/kode pos tujuan (RajaOngkir). */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  return proxyToBackend(request, `ongkir/tujuan/?q=${encodeURIComponent(q.slice(0, 60))}`, 'GET');
}
