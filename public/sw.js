// Only the generic offline screen is cached. Account pages, authentication,
// API responses and financial data always go directly to the network.
const CACHE_NAME = "myincome-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith("myincome-offline-") && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" ||
    url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request).catch(async () =>
      (await caches.match(OFFLINE_URL)) ??
      new Response("אין חיבור לרשת. התחברו לאינטרנט ונסו שוב.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    ),
  );
});
