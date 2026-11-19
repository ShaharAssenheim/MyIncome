import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import admin from "./lib/supabase/admin";
import { checkSiteAccess } from "./lib/site-access";

// Rate limiting (simple in-memory; replace with Redis/KV in production)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
const buckets = new Map<string, { count: number; reset: number }>();
function rateLimit(key: string): boolean {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (now > b.reset) {
    b.count = 0;
    b.reset = now + RATE_WINDOW_MS;
  }
  b.count++;
  buckets.set(key, b);
  return b.count <= RATE_MAX;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAuthApi = pathname.startsWith("/api/auth");
  const isLogin = pathname === "/login";
  const isNextInternal = pathname.startsWith("/_next");
  const isPwaAsset = pathname === "/manifest.webmanifest" || pathname === "/offline.html";
  const isStaticAsset = /\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)$/.test(
    pathname,
  );

  if (isNextInternal || isPwaAsset || (!pathname.startsWith("/api/") && isStaticAsset))
    return NextResponse.next();
  if (isAuthApi) {
    const headers = new Headers(req.headers);
    headers.delete("x-user-id");
    headers.delete("x-site-admin");
    return NextResponse.next({ request: { headers } });
  }

  // Create Supabase client that can refresh the session cookie in the response
  let supabaseResponse = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headersToSet).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
          supabaseResponse.headers.set("Cache-Control", "private, no-store");
        },
      },
    },
  );

  // Verify session with Supabase Auth server (secure — validates JWT signature)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Always overwrite identity headers supplied by the caller.
  const checkedHeaders = new Headers(req.headers);
  checkedHeaders.delete("x-user-id");
  checkedHeaders.delete("x-site-admin");
  let access = { allowed: false, isAdmin: false };
  if (user && !isAuthApi && !isNextInternal && !isStaticAsset) {
    try {
      access = await checkSiteAccess(admin, user);
    } catch {
      return new NextResponse(
        "לא ניתן לבדוק הרשאות כרגע. נסו שוב מאוחר יותר.",
        { status: 503 },
      );
    }
    if (!access.allowed && !isLogin) {
      if (pathname.startsWith("/api/"))
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      const url = new URL("/login", req.url);
      url.searchParams.set("error", "access_denied");
      return NextResponse.redirect(url);
    }
  }

  function copyAuthHeaders(res: NextResponse) {
    ["cache-control", "expires", "pragma"].forEach((header) => {
      const value = supabaseResponse.headers.get(header);
      if (value) res.headers.set(header, value);
    });
  }

  // Helper: build a response that carries refreshed Supabase cookies + x-user-id header
  function buildAuthedResponse(profileId: string) {
    const reqHeaders = new Headers(checkedHeaders);
    reqHeaders.set("x-user-id", profileId);
    reqHeaders.set("x-site-admin", String(access.isAdmin));
    const res = NextResponse.next({ request: { headers: reqHeaders } });
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => res.cookies.set(c.name, c.value, c));
    copyAuthHeaders(res);
    return res;
  }

  // Helper: build a redirect that carries refreshed Supabase cookies
  function buildRedirect(url: URL) {
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => res.cookies.set(c.name, c.value, c));
    copyAuthHeaders(res);
    return res;
  }

  // Protected data API routes — authenticated via Supabase session cookie
  if (pathname.startsWith("/api/") && !isAuthApi) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!rateLimit(`api:${ip}`)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.allowed)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && !access.isAdmin) {
      return NextResponse.json(
        { error: "Only the administrator can change data" },
        { status: 403 },
      );
    }
    if (
      (pathname.startsWith("/api/access") ||
        pathname.startsWith("/api/shares") ||
        pathname === "/api/users") &&
      !access.isAdmin
    ) {
      return NextResponse.json(
        { error: "Administrator access required" },
        { status: 403 },
      );
    }
    return buildAuthedResponse(user.id);
  }

  // Page-level gating
  if (!isAuthApi && !isNextInternal && !isStaticAsset) {
    if (isLogin && user && access.allowed) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return buildRedirect(url);
    }
    if (!isLogin && !user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${req.nextUrl.search}`);
      return buildRedirect(url);
    }
    if (user) {
      return buildAuthedResponse(user.id);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
