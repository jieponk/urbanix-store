import { API } from '@/lib/api';
import { sessionCookie } from '@/lib/sellerServer';

export async function POST(request: Request) {
  try {
    const response = await fetch(`${API}/seller/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: await request.text(),
      cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok) return Response.json(data, { status: response.status });
    return Response.json({ user: data.user }, { headers: { 'Set-Cookie': sessionCookie(data.token, request) } });
  } catch {
    return Response.json({ error: 'Server toko tidak dapat dihubungi. Pastikan backend berjalan.' }, { status: 502 });
  }
}
