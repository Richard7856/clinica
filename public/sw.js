// Minimal service worker — enables PWA installability.
// Cache strategy: network-first for all requests (this is an internal tool,
// freshness matters more than offline support).

const CACHE = "clinica-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));

self.addEventListener("fetch", (e) => {
  // Only handle GET requests; skip cross-origin and chrome-extension
  if (
    e.request.method !== "GET" ||
    !e.request.url.startsWith(self.location.origin)
  ) {
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request)),
  );
});
