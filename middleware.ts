import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken } from './lib/auth/jwt';
import { validateRefreshToken } from './lib/auth/db.supabase';

// Rate limiting (simple in-memory fallback; replace with Redis/KV in production)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120; // global per IP/minute
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > b.reset) { b.count = 0; b.reset = now + RATE_WINDOW_MS; }
  b.count++; buckets.set(key, b);
  return b.count <= RATE_MAX;
}

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
    // Basic per-IP rate limit for API calls
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimit(`api:${ip}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring('Bearer '.length);
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    // Propagate user id to downstream request (avoid trusting incoming header)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.sub);
    return NextResponse.next({ request: { headers: requestHeaders } });
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
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', userId);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};
