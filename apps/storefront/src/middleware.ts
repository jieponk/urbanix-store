import { NextResponse, type NextRequest } from 'next/server';

/** Halaman /seller hanya untuk admin yang sudah login (cek cookie; token divalidasi lagi oleh backend). */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/seller/login') return NextResponse.next();
  if (!request.cookies.get('urbanix_seller')?.value) {
    const login = new URL('/seller/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/seller', '/seller/:path*'] };
