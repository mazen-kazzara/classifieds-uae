// Classifieds UAE — Service Worker (enables PWA install)
const CACHE_NAME = "classifieds-uae-v3";
const PRECACHE = ["/icon-192.png", "/icon-512.png", "/og-image.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls, admin, or auth routes
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.includes("auth")) {
    return;
  }

  // Network-first for HTML pages
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => new Response("Offline", { status: 503, headers: { "Content-Type": "text/html" } }))
    );
    return;
  }

  // Cache-first for static assets (images, fonts, CSS, JS)
  if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff|woff2|css|js)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }))
    );
    return;
  }
});
