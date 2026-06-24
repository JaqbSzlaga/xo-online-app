const CACHE_NAME = "xo-online-pwa-v33-0-stable-modes";

const STATIC_ASSETS = [
  "/",
  "/static/style.css?v=33.0",
  "/static/game.js?v=33.0",
  "/static/app-paper-template.js?v=33.0",
  "/static/bot-v27-bridge.js?v=33.0",
  "/static/public-v28-bridge.js?v=33.0",
  "/static/match-chat-v29-bridge.js?v=33.0",
  "/static/manifest.json",
  "/static/icon-192.png",
  "/static/icon-512.png",
  "/static/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => undefined))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return (await caches.match(request)) || (await caches.match("/"));
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/socket.io/")) return;
  if (event.request.method !== "GET") return;
  event.respondWith(networkFirst(event.request));
});
