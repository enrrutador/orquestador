// Service Worker básico para Orquestador PWA
// Versión simple: cachea assets estáticos y permite instalación

const CACHE_NAME = "orquestador-v2";

const PRECACHE = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Solo cacheamos requests GET del mismo origen
  if (event.request.method !== "GET") return;

  // Nunca cacheamos la API: son datos vivos (Páginas, chat, estado del
  // navegador) y respuestas ligadas a la sesión del usuario.
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          // Cacheamos respuestas válidas de assets
          if (
            response &&
            response.status === 200 &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});