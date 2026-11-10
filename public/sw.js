/* KriyaOS conservative service worker.
 * Safety rules:
 * - NEVER cache /api/* responses (diagnosis, safety, maintenance, manuals, integrations, robotics, watchdog).
 * - Navigation failures fall back to /offline (do not serve stale app pages with stale safety/diagnosis state).
 * - Only precache minimal offline fallback/manifest. Hashed Next static assets may be cached by runtime match.
 * - No offline AI diagnosis claim. No sensitive data cached.
 */
const CACHE_VERSION = 'kriyaos-sw-v1';
const PRECACHE = ['/', '/offline', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses (safety/diagnosis/maintenance/manuals/integrations/robotics).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // Navigations: network first; on failure show offline fallback (never stale app HTML).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE_VERSION);
        const offline = await cache.match('/offline');
        return offline || new Response('Offline. Reconnect for current safety and diagnosis data.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  // Hashed Next static assets can be cache-first (immutable-ish).
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  // Default: network only (avoid stale data/UI states).
  event.respondWith(fetch(req));
});
