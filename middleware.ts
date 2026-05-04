import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for profile lookups (no session state, service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Looks up auth_users.id by email so existing data foreign keys stay intact
async function getProfileId(email: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('auth_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  return data?.id ?? '';
}

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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Verify session with Supabase Auth server (secure — validates JWT signature)
  const { data: { user } } = await supabase.auth.getUser();

  // Helper: build a response that carries refreshed Supabase cookies + x-user-id header
  function buildAuthedResponse(profileId: string) {
    const reqHeaders = new Headers(req.headers);
    reqHeaders.set('x-user-id', profileId);
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c));
    return res;
  }

  // Helper: build a redirect that carries refreshed Supabase cookies
  function buildRedirect(url: URL) {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value, c));
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
    const profileId = await getProfileId(user.email!);
    return buildAuthedResponse(profileId);
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
      url.searchParams.set('next', pathname);
      return buildRedirect(url);
    }
    if (user) {
      const profileId = await getProfileId(user.email!);
      return buildAuthedResponse(profileId);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!favicon.ico).*)'],
};

