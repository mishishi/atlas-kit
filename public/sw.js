// R40 (2026-06-21): PWA service worker for offline + install support.
//
// Strategy:
//   - HTML pages  → network-first (always fresh content)
//   - /_next/static + /fonts → cache-first (immutable build assets)
//   - CloudBase images  → stale-while-revalidate (CDN URLs are slow to
//     refetch; users revisit the same card often)
//   - manifest.webmanifest + icon-*.png → cache-first (static)
//
// Registered from src/components/sw-register.tsx on first load.

const CACHE_VERSION = "atlas-kit-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(
            (n) =>
              n !== STATIC_CACHE && n !== RUNTIME_CACHE && n !== IMAGE_CACHE,
          )
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

const isCloudBaseImage = (url) =>
  url.host.endsWith(".tcb.qcloud.la") || url.host.endsWith(".r2.dev");

const isNextStatic = (url) =>
  url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin && !isCloudBaseImage(url)) return;

  // Static build assets — cache-first
  if (isNextStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, clone));
            return response;
          }),
      ),
    );
    return;
  }

  // CloudBase CDN images — stale-while-revalidate
  if (isCloudBaseImage(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  // HTML pages + other same-origin GETs — network-first, fall back to
  // cached copy (offline-friendly).
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && request.destination === "document") {
            const clone = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then(
              (cached) => cached || caches.match("/offline.html") || caches.match("/"),
            ),
        ),
    );
  }
});