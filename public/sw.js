const STATIC_CACHE = 'home-v2-static-v1';
const RUNTIME_CACHE = 'home-v2-runtime-v1';
const PRECACHE_URLS = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(key => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep API requests network-first to avoid serving stale protected payloads.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, cloned));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/offline.html');
        }),
    );
    return;
  }

  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/_next/static/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const cloned = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, cloned));
          return response;
        });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        const cloned = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, cloned));
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
