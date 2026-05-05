// OAuth / magic-link callback: exchanges Supabase's code for SSR auth cookies.
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
  const { searchParams, origin } = new URL(req.url);
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
          setAll(cookiesToSet, headersToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              pendingCookies.push({ name, value, options });
            });
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
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
