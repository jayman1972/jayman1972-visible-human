// Service worker: makes the app installable and usable offline.
// App shell and the base model are cached at install; full-detail packs are cached
// the first time they are viewed. A new build gets a new version and replaces the caches.
const VERSION = '__VERSION__';
const SHELL = `vh-shell-${VERSION}`;
const DETAIL = 'vh-detail-v1';
const FONTS = 'vh-fonts-v1';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, DETAIL, FONTS]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    // drop detail packs that this build no longer lists
    const listed = new Set(__DETAIL_FILES__.map((f) => new URL(f, self.registration.scope).href));
    const dc = await caches.open(DETAIL);
    for (const req of await dc.keys()) if (!listed.has(req.url)) await dc.delete(req);
    await self.clients.claim();
  })());
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // network first so a new version shows up, cached copy when offline
      e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('./', copy)); return res; })
        .catch(() => caches.match('./', { cacheName: SHELL }).then((r) => r || caches.match('index.html'))));
      return;
    }
    if (url.pathname.includes('/data/hi/')) { e.respondWith(cacheFirst(req, DETAIL)); return; }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(cacheFirst(req, FONTS));
});
