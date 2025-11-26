import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken } from './lib/auth/jwt';
import { validateRefreshToken } from './lib/auth/db.supabase';

// Middleware responsibilities:
// 1. Keep existing protection for /api/secure/* using access token header.
// 2. Gate all non-auth pages: require a valid refresh token cookie to view protected pages.
//    - Publicly allowed: /login, /api/auth/*, static assets, Next internals.
//    - Unauthenticated requests redirect to /login with ?next=originalPath.
//    - Authenticated users visiting /login are redirected to root.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthApi = pathname.startsWith('/api/auth');
  const isLogin = pathname === '/login';
  const isNextInternal = pathname.startsWith('/_next');
  const isStaticAsset = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)$/.test(pathname) || pathname.startsWith('/public');

  // Secure API route protection (access token via Authorization header)
  if (pathname.startsWith('/api/secure') || pathname.startsWith('/api/transactions') || pathname.startsWith('/api/shares') || pathname.startsWith('/api/users')) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring('Bearer '.length);
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const res = NextResponse.next();
    res.headers.set('x-user-id', payload.sub);
    return res;
  }

  // Page-level gating using refresh token
  if (!isAuthApi && !isNextInternal && !isStaticAsset) {
    const refreshCookie = req.cookies.get('refresh_token');
    const rawRefresh = refreshCookie?.value;
    console.log('[middleware]', pathname, 'has refresh cookie:', !!rawRefresh);
    let hasSession = false;
    let userId: string | null = null;
    if (rawRefresh) {
      const decoded = await verifyRefreshToken(rawRefresh);
      console.log('[middleware] decoded:', !!decoded);
      if (decoded) {
        let validInDb = false;
        try {
          validInDb = await validateRefreshToken(decoded.sub, rawRefresh);
          console.log('[middleware] validInDb:', validInDb);
        } catch (e) {
          console.error('[middleware] validateRefreshToken error', e);
        }
        if (validInDb) {
          hasSession = true;
          userId = decoded.sub;
        }
      }
    }

    if (isLogin && hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    if (!isLogin && !hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    if (hasSession && userId) {
      const res = NextResponse.next();
      res.headers.set('x-user-id', userId);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};
