const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

function loadTypeScript(path, globals = {}) {
  const exports = {};
  const compiled = ts.transpileModule(readFileSync(resolve(__dirname, path), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  runInNewContext(compiled, { exports, ...globals });
  return exports;
}

test("manifest launches the entire app standalone and supplies correctly sized PNG icons", () => {
  const manifest = loadTypeScript("../app/manifest.ts").default();
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.id, "/");
  for (const icon of manifest.icons) {
    const png = readFileSync(resolve(__dirname, "../public", icon.src.slice(1)));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
});

test("PWA resources are public while account pages and financial APIs still require authentication", async () => {
  let authCalls = 0;
  const baseResponse = () => ({
    headers: new Headers(),
    cookies: { getAll: () => [], set: () => {} },
  });
  const response = {
    next: () => ({ ...baseResponse(), kind: "next" }),
    redirect: (url) => ({ ...baseResponse(), kind: "redirect", url }),
    json: (body, options) => ({ body, ...options }),
  };
  const { middleware } = loadTypeScript("../middleware.ts", {
    URL, Headers, process: { env: {} },
    require: (name) => {
      if (name === "@supabase/ssr") return { createServerClient: () => {
        authCalls++;
        return { auth: { getUser: async () => ({ data: { user: null } }) } };
      } };
      if (name === "next/server") return { NextResponse: response };
      if (name === "./lib/supabase/admin") return { default: {} };
      if (name === "./lib/site-access") return {};
      throw new Error(`Unexpected import ${name}`);
    },
  });
  const request = (path) => ({
    url: `https://myincome.example${path}`, headers: new Headers(), method: "GET",
    nextUrl: { pathname: path, search: "", clone: () => new URL(`https://myincome.example${path}`) },
  });
  for (const path of ["/manifest.webmanifest", "/sw.js", "/offline.html", "/icons/icon-192.png"]) {
    assert.equal((await middleware(request(path))).kind, "next");
  }
  assert.equal(authCalls, 0);
  assert.equal((await middleware(request("/"))).url.pathname, "/login");
  assert.equal((await middleware(request("/api/finance"))).status, 401);
});

function workerHarness() {
  const listeners = new Map();
  const cached = new Map();
  const added = [];
  let online = true;
  let claimed = false;
  const cacheNames = ["myincome-offline-v0", "myincome-offline-v1", "unrelated-cache"];
  const deleted = [];
  runInNewContext(readFileSync(resolve(__dirname, "../public/sw.js"), "utf8"), {
    URL, Response,
    self: {
      location: { origin: "https://myincome.example" },
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: async () => {},
      clients: { claim: async () => { claimed = true; } },
    },
    caches: {
      open: async () => ({ add: async (path) => {
        added.push(path);
        cached.set(path, new Response("Generic offline screen"));
      } }),
      match: async (path) => cached.get(path)?.clone(),
      keys: async () => cacheNames,
      delete: async (name) => { deleted.push(name); return true; },
    },
    fetch: async () => {
      if (!online) throw new TypeError("Network unavailable");
      return new Response("Private live account page");
    },
  });
  return {
    added, deleted,
    get claimed() { return claimed; },
    goOffline() { online = false; },
    lifecycle(name) {
      let pending;
      listeners.get(name)({ waitUntil: (promise) => { pending = promise; } });
      return pending;
    },
    request(path, options = {}) {
      let pending;
      listeners.get("fetch")({
        request: { url: `https://myincome.example${path}`, method: "GET", mode: "navigate", ...options },
        respondWith: (promise) => { pending = promise; },
      });
      return pending;
    },
  };
}

test("worker caches only its generic offline screen and cleans only its own old caches", async () => {
  const worker = workerHarness();
  await worker.lifecycle("install");
  await worker.lifecycle("activate");
  assert.deepEqual(worker.added, ["/offline.html"]);
  assert.deepEqual(worker.deleted, ["myincome-offline-v0"]);
  assert.equal(worker.claimed, true);
  assert.equal(await (await worker.request("/shahar")).text(), "Private live account page");
  assert.deepEqual(worker.added, ["/offline.html"]);
});

test("offline navigation uses a generic screen without intercepting data, auth, or external requests", async () => {
  const worker = workerHarness();
  await worker.lifecycle("install");
  worker.goOffline();
  assert.equal(await (await worker.request("/kristin")).text(), "Generic offline screen");
  assert.equal(worker.request("/api/finance"), undefined);
  assert.equal(worker.request("/api/auth/callback?code=private"), undefined);
  assert.equal(worker.request("/api/income/month", { method: "PUT", mode: "same-origin" }), undefined);
  assert.equal(worker.request("/", { url: "https://accounts.google.com/" }), undefined);
});

test("a missing offline cache returns an explicit connection error", async () => {
  const worker = workerHarness();
  worker.goOffline();
  const response = await worker.request("/");
  assert.equal(response.status, 503);
});
