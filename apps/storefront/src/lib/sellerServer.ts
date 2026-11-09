import { API } from '@/lib/api';

/** Nama cookie token admin (httpOnly: tidak bisa dibaca JavaScript di browser). */
export const SELLER_COOKIE = 'urbanix_seller';

/** Alamat dasar backend tanpa /api/v1, untuk file upload (/media/...). */
export const BACKEND_ORIGIN = API.replace(/\/api\/v1\/?$/, '');

export function readCookie(request: Request, name: string): string {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function sessionCookie(token: string, request: Request, maxAge = 60 * 60 * 24 * 30) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SELLER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
