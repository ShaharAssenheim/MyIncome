const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function load(relative, globals = {}) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, relative), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, URL, ...globals });
  return exports;
}
const redirect = load("../lib/auth-redirect.ts");

test("Google callback stays on the initiating origin even with a stale localhost site setting", () => {
  const app = load("../lib/auth-redirect.ts", { process: { env: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" } } });
  for (const origin of ["https://my-income-xi.vercel.app", "https://my-income-preview.vercel.app", "http://localhost:3000"]) {
    const target = new URL(app.authCallbackUrl(origin, "/shahar?year=2026#retirement"));
    assert.equal(target.origin, origin);
    assert.equal(target.pathname, "/api/auth/callback");
    assert.equal(target.searchParams.get("next"), "/shahar?year=2026#retirement");
  }
});

test("auth destinations preserve local routes and reject external and backslash redirects", () => {
  for (const value of [null, "", "https://other.example", "//other.example", "/\\other.example", "/\n/other.example", "\\other.example"]) {
    assert.equal(redirect.safeAuthPath(value), "/");
  }
  assert.equal(redirect.safeAuthPath("/kristin?month=2026-11"), "/kristin?month=2026-11");
});

function callbackHarness(exchangeError = null) {
  const saved = [];
  let exchanged = null;
  const { GET } = load("../app/api/auth/callback/route.ts", {
    process: { env: {} }, console: { error() {} },
    require(name) {
      if (name === "../../../../lib/auth-redirect") return redirect;
      if (name === "next/headers") return { cookies: async () => ({ getAll: () => [{ name: "pkce", value: "verifier" }] }) };
      if (name === "next/server") return { NextResponse: { redirect: (location) => ({
        location, headers: new Headers(), cookies: { set: (name, value, options) => saved.push({ name, value, options }) },
      }) } };
      if (name === "@supabase/ssr") return { createServerClient: (url, key, options) => ({ auth: {
        exchangeCodeForSession: async (code) => {
          exchanged = code;
          assert.equal(options.cookies.getAll()[0].value, "verifier");
          options.cookies.setAll([{ name: "session", value: "test-session", options: { httpOnly: true } }], { Pragma: "no-cache" });
          return { error: exchangeError };
        },
      } }) };
      throw new Error("Unexpected import: " + name);
    },
  });
  return { GET, saved, exchanged: () => exchanged };
}

test("OAuth exchange on a Vercel forwarded host returns to production and persists session cookies", async () => {
  const h = callbackHarness();
  const response = await h.GET({ url: "http://localhost:3000/api/auth/callback?code=test-code&next=%2Fshahar", headers: new Headers({
    "x-forwarded-host": "my-income-xi.vercel.app", "x-forwarded-proto": "https",
  }) });
  assert.equal(response.location, "https://my-income-xi.vercel.app/shahar");
  assert.equal(h.exchanged(), "test-code"); assert.equal(h.saved[0].value, "test-session");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Pragma"), "no-cache");
});

test("failed and missing OAuth codes return to the same site login without following unsafe next paths", async () => {
  const h = callbackHarness({ message: "expired code" });
  const response = await h.GET({ url: "https://my-income-xi.vercel.app/api/auth/callback?code=expired", headers: new Headers() });
  const target = new URL(response.location);
  assert.equal(target.origin, "https://my-income-xi.vercel.app"); assert.equal(target.pathname, "/login");
  assert.equal(target.searchParams.get("error"), "auth_callback_failed");
  const missing = await h.GET({ url: "https://my-income-xi.vercel.app/api/auth/callback", headers: new Headers() });
  assert.equal(new URL(missing.location).searchParams.get("detail"), "no_code");
  const good = callbackHarness();
  const unsafe = await good.GET({ url: "https://my-income-xi.vercel.app/api/auth/callback?code=valid&next=%2F%5Cother.example", headers: new Headers() });
  assert.equal(unsafe.location, "https://my-income-xi.vercel.app/");
});
