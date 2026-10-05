// Service worker: makes the app installable and usable offline.
// App shell and the base model are cached at install; full-detail packs are cached
// the first time they are viewed. A new build gets a new version and replaces all the caches.
const VERSION = 'd5958891dd3e';
const SHELL = `vh-shell-${VERSION}`;
const DETAIL = `vh-detail-${VERSION}`; // full-detail packs change with the data, so each build starts afresh
const FONTS = 'vh-fonts-v1';
const PRECACHE = ["./","index.html","app.24e4ed555c.js","manifest.webmanifest","icons/apple-touch-icon.png","icons/favicon-32.png","icons/favicon-64.png","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","data/manifest.json","data/refs.json","data/base/femfield.mvb","data/base/hair.mvb","data/base/joints.mvb","data/base/lymph.mvb","data/base/muscles.mvb","data/base/nerves.mvb","data/base/organs.mvb","data/base/skeleton.mvb","data/base/skin.mvb","data/base/vessels.mvb"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = new Set([SHELL, DETAIL, FONTS]);
    for (const k of await caches.keys()) if (!keep.has(k)) await caches.delete(k);
    // drop detail packs that this build no longer lists
    const listed = new Set(["data/hi/joints-abdomen.mvb","data/hi/joints-armL.mvb","data/hi/joints-armR.mvb","data/hi/joints-head.mvb","data/hi/joints-legL.mvb","data/hi/joints-legR.mvb","data/hi/joints-neck.mvb","data/hi/joints-thorax.mvb","data/hi/lymph-abdomen.mvb","data/hi/lymph-armL.mvb","data/hi/lymph-armR.mvb","data/hi/lymph-head.mvb","data/hi/lymph-legL.mvb","data/hi/lymph-legR.mvb","data/hi/lymph-thorax.mvb","data/hi/muscles-abdomen.mvb","data/hi/muscles-armL.mvb","data/hi/muscles-armR.mvb","data/hi/muscles-head.mvb","data/hi/muscles-legL.mvb","data/hi/muscles-legR.mvb","data/hi/muscles-neck.mvb","data/hi/muscles-thorax.mvb","data/hi/nerves-abdomen.mvb","data/hi/nerves-armL.mvb","data/hi/nerves-armR.mvb","data/hi/nerves-head.mvb","data/hi/nerves-legL.mvb","data/hi/nerves-legR.mvb","data/hi/nerves-thorax.mvb","data/hi/organs-abdomen.mvb","data/hi/organs-head.mvb","data/hi/organs-legL.mvb","data/hi/organs-legR.mvb","data/hi/organs-neck.mvb","data/hi/organs-thorax.mvb","data/hi/skeleton-abdomen.mvb","data/hi/skeleton-armL.mvb","data/hi/skeleton-armR.mvb","data/hi/skeleton-head.mvb","data/hi/skeleton-legL.mvb","data/hi/skeleton-legR.mvb","data/hi/skeleton-neck.mvb","data/hi/skeleton-thorax.mvb","data/hi/vessels-abdomen.mvb","data/hi/vessels-armL.mvb","data/hi/vessels-armR.mvb","data/hi/vessels-head.mvb","data/hi/vessels-legL.mvb","data/hi/vessels-legR.mvb","data/hi/vessels-thorax.mvb"].map((f) => new URL(f, self.registration.scope).href));
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
    // a request tagged for another build (a newer page while this worker is still in charge): straight to the network
    const v = url.searchParams.get('v');
    if (v && v !== VERSION) return;
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
