import { NextResponse, type NextRequest } from 'next/server';

/**
 * - Halaman /seller hanya untuk admin yang sudah login (cek cookie; token divalidasi lagi oleh backend).
 * - Semua halaman: teruskan path ke server (header x-pathname) untuk tag og:url di layout.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/seller') && pathname !== '/seller/login' && !request.cookies.get('urbanix_seller')?.value) {
    const login = new URL('/seller/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  const headers = new Headers(request.headers);
  headers.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Lewati aset & API (gambar, _next, file berekstensi) supaya tidak menambah beban.
  matcher: ['/((?!_next/|api/|media/|static/|.*\\.[a-zA-Z0-9]+$).*)'],
};
