import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

/** Status & syarat pembatalan pesanan yang sudah dibayar. */
export async function GET(request: Request, { params }: { params: { orderNumber: string } }) {
  return proxyToBackend(request, `batal/${encodeURIComponent(params.orderNumber)}/`, 'GET');
}

/** Ajukan / tarik pengajuan pembatalan (JSON). */
export async function POST(request: Request, { params }: { params: { orderNumber: string } }) {
  return proxyToBackend(request, `batal/${encodeURIComponent(params.orderNumber)}/`, 'POST');
}
