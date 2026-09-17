const CACHE = 'vibr-v11';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './highlight.js',
  './zip.js',
  './storage.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './spec/vibe-spec.md',
  './spec/AGENTS.md',
  './spec/examples/service_call.vibe',
  './spec/examples/dates_and_times.vibe',
  './spec/examples/database/renewal_case.vibe',
  './spec/examples/database/property_lease.vibe',
  './spec/examples/database/unit.vibe',
  './spec/examples/database/tenant.vibe',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request, { ignoreSearch: true })
          .then((cached) => cached || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error())),
      ),
  );
});
