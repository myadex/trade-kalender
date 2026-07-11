const CACHE = 'trade-kalender-v26';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // JS-Module, index.html, sw.js und root: immer network-first, damit Updates sofort greifen
  if (url.includes('/js/') || url.endsWith('.js') || url.endsWith('index.html') || url.endsWith('sw.js') || url.endsWith('/trade-kalender/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Google API / auth: never cache
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') || url.includes('gstatic.com')) {
    return;
  }
  // Everything else: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
