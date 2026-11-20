import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Tarif kurir (RajaOngkir) untuk isi keranjang ke satu tujuan. */
export async function POST(request: Request) {
  return proxyToBackend(request, 'ongkir/', 'POST');
}
