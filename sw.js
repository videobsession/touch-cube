// Touch Cube offline worker. Bump VERSION on every release.
const VERSION = 'touch-cube-2';
const FILES = ["./", "index.html", "three.min.js", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/favicon-32.png"];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate';
  const key = isPage ? './' : req;

  // Fetch a fresh copy and keep it for next time.
  const refresh = fetch(isPage ? new Request(req.url, { cache: 'no-cache' }) : req)
    .then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(VERSION).then(cache => cache.put(key, copy));
      }
      return res;
    });

  event.respondWith(
    caches.match(key, { ignoreSearch: isPage }).then(hit => {
      if (hit) {
        if (isPage) event.waitUntil(refresh.catch(() => {}));
        return hit;
      }
      return refresh.catch(() => caches.match('index.html'));
    })
  );
});
