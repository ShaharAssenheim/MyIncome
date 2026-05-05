// OAuth / magic-link callback: exchanges Supabase's code for SSR auth cookies.
export const runtime = 'nodejs';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options: CookieOptions };

function getSafeRedirectPath(value: string | null) {
  if (!value?.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
}

function copyAuthState(
  response: NextResponse,
  cookiesToSet: CookieToSet[],
  headersToSet: Record<string, string>,
) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  Object.entries(headersToSet).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(req: NextRequest) {
  // On Vercel, req.url is correct but let's derive origin from the forwarded host
  // so the redirect always points to the live domain, not an internal proxy address.
  const requestUrl = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  const { searchParams } = requestUrl;
  const code = searchParams.get('code');
  const next = getSafeRedirectPath(searchParams.get('next'));

  if (code) {
    const cookieStore = await cookies();
    const pendingCookies: CookieToSet[] = [];
    const pendingHeaders: Record<string, string> = {};

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // Do NOT call cookieStore.set() here — in a GET Route Handler that returns
          // a custom NextResponse, next/headers cookie writes are silently discarded.
          // We collect them in pendingCookies and copy them to the response manually.
          setAll(cookiesToSet, headersToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              pendingCookies.push({ name, value, options }),
            );
            Object.assign(pendingHeaders, headersToSet);
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return copyAuthState(
        NextResponse.redirect(`${origin}${next}`),
        pendingCookies,
        pendingHeaders,
      );
    }

    // Surface the real Supabase error so it is visible in the URL and server logs.
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'auth_callback_failed');
    url.searchParams.set('detail', error.message);
    return NextResponse.redirect(url.toString());
  }

  // No code parameter — Supabase redirect URL is probably not whitelisted.
  console.error('[auth/callback] no code in request — check Supabase redirect URL allowlist');
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed&detail=no_code`);
}
