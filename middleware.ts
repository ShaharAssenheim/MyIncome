import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rate limiting (simple in-memory; replace with Redis/KV in production)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > b.reset) { b.count = 0; b.reset = now + RATE_WINDOW_MS; }
  b.count++;
  buckets.set(key, b);
  return b.count <= RATE_MAX;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthApi = pathname.startsWith('/api/auth');
  const isLogin = pathname === '/login';
  const isNextInternal = pathname.startsWith('/_next');
  const isStaticAsset = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)$/.test(pathname);

  // Create Supabase client that can refresh the session cookie in the response
  let supabaseResponse = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headersToSet).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
          supabaseResponse.headers.set('Cache-Control', 'private, no-store');
        },
      },
    },
  );

  // Verify session with Supabase Auth server (secure — validates JWT signature)
  const { data: { user } } = await supabase.auth.getUser();

  function copyAuthHeaders(res: NextResponse) {
    ['cache-control', 'expires', 'pragma'].forEach(header => {
      const value = supabaseResponse.headers.get(header);
      if (value) res.headers.set(header, value);
    });
  }

  // Helper: build a response that carries refreshed Supabase cookies + x-user-id header
  function buildAuthedResponse(profileId: string) {
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-user-id', profileId);
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c));
    copyAuthHeaders(res);
    return res;
  }

  // Helper: build a redirect that carries refreshed Supabase cookies
  function buildRedirect(url: URL) {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c));
    copyAuthHeaders(res);
    return res;
  }

  // Protected data API routes — authenticated via Supabase session cookie
  if (
    pathname.startsWith('/api/transactions') ||
    pathname.startsWith('/api/shares') ||
    pathname.startsWith('/api/users')
  ) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!rateLimit(`api:${ip}`)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return buildAuthedResponse(user.id);
  }

  // Page-level gating
  if (!isAuthApi && !isNextInternal && !isStaticAsset) {
    if (isLogin && user) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return buildRedirect(url);
    }
    if (!isLogin && !user) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', `${pathname}${req.nextUrl.search}`);
      return buildRedirect(url);
    }
    if (user) {
      return buildAuthedResponse(user.id);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};

