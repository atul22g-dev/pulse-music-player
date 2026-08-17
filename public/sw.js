/**
 * sw.js — Pulse service worker.
 *
 * Caches the app shell (index.html, manifest, icons, and — after first load —
 * the hashed Vite assets) so the app opens instantly and works offline.
 * Navigations are network-first so new deploys are picked up automatically,
 * with the cached shell as an offline fallback.
 *
 * Only same-origin GET requests are handled; cross-origin traffic (YouTube
 * CDNs, fonts, the playlist API) always goes straight to the network.
 */

const CACHE = "Pulse-shell-v1";

// Relative to the worker's scope so subpath deploys (GitHub Pages, Vercel
// previews) resolve correctly.
const scopeUrl = (p) => new URL(p, self.registration.scope).href;

const SHELL = [
  "manifest.webmanifest",
  "index.html",
  "icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(
          // The scope root serves the SPA shell on most hosts; individual
          // failures (offline first install) must not break the whole install.
          [cache.add(self.registration.scope), ...SHELL.map((p) => cache.add(scopeUrl(p)))]
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: try the network first (fresh deploys), fall back to the
  // cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(scopeUrl("index.html"), copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(scopeUrl("index.html"))))
    );
    return;
  }

  // Assets: cache-first, then network with a runtime cache fill.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
