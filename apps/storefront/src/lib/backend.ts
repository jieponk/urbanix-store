import { API } from '@/lib/api';
import { getLang } from '@/lib/lang-server';

/**
 * Teruskan permintaan dari browser ke backend Django (hanya di server).
 * Browser tidak perlu tahu alamat backend (API_URL), jadi preview di HP lewat
 * IP Wi-Fi tetap jalan walaupun backend hanya mendengarkan di 127.0.0.1.
 */
export async function proxyToBackend(
  request: Request,
  path: string,
  method: 'GET' | 'POST' = request.method as 'GET' | 'POST'
): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  // Di belakang Cloudflare, IP asli pembeli ada di CF-Connecting-IP (dipakai untuk batas spam).
  const forwardedFor = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;

  let body: string | undefined;
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    body = await request.text();
  }

  try {
    let url = `${API}/${path.replace(/^\/+/, '')}`;
    // Pengunjung memilih Bahasa Inggris: minta isi versi terjemahan (hanya untuk GET).
    if (method === 'GET' && getLang() === 'en' && !/[?&]lang=/.test(url)) url += `${url.includes('?') ? '&' : '?'}lang=en`;
    const response = await fetch(url, {
      method,
      headers,
      body,
      cache: 'no-store',
    });
    const text = await response.text();
    return new Response(text || '{}', {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[proxy] ${method} ${path} gagal:`, error);
    return Response.json(
      { error: 'Server toko sedang tidak dapat dihubungi. Coba lagi sebentar.' },
      { status: 502 }
    );
  }
}
