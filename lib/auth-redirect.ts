export function safeAuthPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  const base = "https://auth.invalid";
  const target = new URL(value, base);
  return target.origin === base ? target.pathname + target.search + target.hash : "/";
}

export function authCallbackUrl(currentOrigin: string, next?: string | null) {
  // PKCE state lives in this browser's cookies. Return to the same origin that
  // started sign-in, even if a build-time site URL points to a different host.
  const callback = new URL("/api/auth/callback", currentOrigin);
  callback.searchParams.set("next", safeAuthPath(next));
  return callback.toString();
}
