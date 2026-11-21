import { NextResponse, type NextRequest } from 'next/server';
import { SELLER_HOST_PREFIX, SELLER_SUBDOMAIN, sellerHref, toSellerPath } from '@/lib/sellerUrl';

const isSellerPath = (p: string) => p === '/seller' || p.startsWith('/seller/');

/** Host asli dari Caddy (tanpa port). */
function hostOf(request: NextRequest) {
  return (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').split(',')[0].trim().split(':')[0].toLowerCase();
}

/**
 * - Seller Center di subdomain: seller.urbanix.id/x → /seller/x (rewrite); urbanix.id/seller/x → seller.urbanix.id/x (redirect).
 * - Halaman Seller Center hanya untuk admin yang sudah login (cek cookie; token divalidasi lagi oleh backend).
 * - Semua halaman: teruskan path ke server (header x-pathname) untuk tag og:url di layout.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = hostOf(request);
  const subdomain = SELLER_SUBDOMAIN && host.includes('.') && !/^\d+(\.\d+){3}$/.test(host);
  const onSellerHost = subdomain && host.startsWith(SELLER_HOST_PREFIX);

  // urbanix.id/seller/... → seller.urbanix.id/...
  if (subdomain && !onSellerHost && isSellerPath(pathname)) {
    const main = host.replace(/^www\./, '');
    return NextResponse.redirect(`https://${SELLER_HOST_PREFIX}${main}${sellerHref(pathname)}${search}`, 308);
  }

  const internal = onSellerHost ? toSellerPath(pathname) : pathname;
  if (isSellerPath(internal) && internal !== '/seller/login' && !request.cookies.get('urbanix_seller')?.value) {
    const login = new URL(sellerHref('/seller/login'), request.url);
    login.searchParams.set('next', sellerHref(internal) + search);
    return NextResponse.redirect(login);
  }

  const headers = new Headers(request.headers);
  headers.set('x-pathname', internal);
  if (onSellerHost) {
    headers.set('x-seller', '1');
    const url = request.nextUrl.clone();
    url.pathname = internal;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Lewati aset & API (gambar, _next, file berekstensi) supaya tidak menambah beban.
  matcher: ['/((?!_next/|api/|media/|static/|.*\\.[a-zA-Z0-9]+$).*)'],
};
