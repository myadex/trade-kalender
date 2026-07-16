const CACHE = 'trade-kalender-v78';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './sw-register.js',
  './js/app.js',
  './js/app-data.js',
  './js/backup-crypto.js',
  './js/config.js',
  './js/dialog-accessibility.js',
  './js/encrypted-backup-dialog.js',
  './js/fifo.js',
  './js/helpers.js',
  './js/import-dialogs.js',
  './js/import.js',
  './js/local-storage.js',
  './js/metrics-view.js',
  './js/navigation.js',
  './js/position-dialog.js',
  './js/safety-backup-dialog.js',
  './js/safety-backups.js',
  './js/storage.js',
  './js/storage-migration.js',
  './js/storage-migration-dialog.js',
  './js/trade-dialogs.js',
  './js/trade-search.js',
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

function isUsableAppShellResponse(request, response) {
  if (!response) return false;
  const pathname = new URL(request.url).pathname.toLowerCase();
  if (!pathname.endsWith('.js')) return true;
  const contentType = String(response.headers.get('content-type') || '')
    .split(';')[0].trim().toLowerCase();
  return contentType === 'text/javascript' ||
    contentType === 'application/javascript' ||
    contentType === 'text/ecmascript' ||
    contentType === 'application/ecmascript';
}

async function appShellResponse(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (isUsableAppShellResponse(request, cached)) return cached;

  // Ein lokaler Entwicklungsserver kann .js versehentlich als text/plain
  // ausliefern. Solch ein Eintrag darf nicht dauerhaft den Modulstart
  // blockieren: online neu laden und den kanonischen Cache-Key reparieren.
  const network = await fetch(request);
  if (network.ok && isUsableAppShellResponse(request, network)) {
    const cache = await caches.open(CACHE);
    const canonicalUrl = new URL(request.url);
    canonicalUrl.search = '';
    canonicalUrl.hash = '';
    await cache.put(canonicalUrl.href, network.clone());
  }
  return network;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  // Google-Anmeldung und Nutzerdaten muessen immer vom Netz kommen.
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') || url.includes('gstatic.com')) {
    return;
  }
  // Eine Navigation muss offline zumindest die bereits installierte App-Huelle
  // laden koennen. Lokale IndexedDB-Daten funktionieren dann ohne Netz;
  // Drive-Anmeldung und Drive-Daten benoetigen weiterhin eine Verbindung.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  // Die App-Shell ist durch den versionsgebundenen CACHE atomar. Deshalb muss
  // ein bereits gecachtes Modul ohne jeden Netzversuch starten koennen. Neue
  // Versionen kommen weiterhin ueber den Browser-SW-Updatecheck und einen neuen
  // CACHE-Namen; network-first wuerde den Offline-Start unnoetig gefaehrden.
  if (url.includes('/js/') || url.endsWith('.js') || url.endsWith('index.html') || url.endsWith('sw.js') || url.endsWith('/trade-kalender/')) {
    e.respondWith(
      appShellResponse(e.request)
    );
    return;
  }
  // Everything else: cache-first with network fallback
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(cached => cached || fetch(e.request))
  );
});
