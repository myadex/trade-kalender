const CACHE = 'trade-kalender-v47';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './js/app.js',
  './js/config.js',
  './js/fifo.js',
  './js/helpers.js',
  './js/import.js',
  './js/storage.js',
  './js/views.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
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
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // Google-Anmeldung und Nutzerdaten muessen immer vom Netz kommen.
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') || url.includes('gstatic.com')) {
    return;
  }
  // Eine Navigation muss offline zumindest die bereits installierte App-Huelle
  // laden koennen. Die Drive-Anmeldung und Daten laden danach wieder online.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  // JS-Module, index.html, sw.js und root: immer network-first, damit Updates sofort greifen
  if (url.includes('/js/') || url.endsWith('.js') || url.endsWith('index.html') || url.endsWith('sw.js') || url.endsWith('/trade-kalender/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Everything else: cache-first with network fallback
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
