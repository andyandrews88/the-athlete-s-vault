const CACHE_NAME = 'vault-v2';
const STATIC_ASSETS = ['/', '/home', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('supabase')) return;
  if (event.request.url.includes('/node_modules/.vite/')) return;
  if (event.request.url.includes('/@vite/')) return;
  if (event.request.url.includes('hot-update')) return;

  const isRuntimeAsset = ['script', 'style', 'worker'].includes(event.request.destination);
  if (isRuntimeAsset) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone);
              });
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});