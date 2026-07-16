// ============================================================
// sw-register.js — unabhaengiger Service-Worker-Starter
// ============================================================
// Muss ohne app.js lauffaehig bleiben: Ein alter, unbrauchbarer Modulcache
// darf sonst genau das Modul blockieren, das den reparierenden Service Worker
// registrieren soll. Diese Datei kennt weder App-State noch Fachdaten.

(function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const RELEASE = 'v78';
  const SERVICE_WORKER_URL = `./sw.js?v=${RELEASE}`;
  const MAIN_MODULE_URL = `./js/app.js?v=${RELEASE}`;
  const APP_CACHE_PREFIX = 'trade-kalender-';
  const REPAIR_GUARD = `trade-kalender-module-repair-${RELEASE}`;

  function isJavaScriptResponse(response) {
    if (!response || response.ok === false) return false;
    const contentType = String(response.headers.get('content-type') || '')
      .split(';')[0].trim().toLowerCase();
    return contentType === 'text/javascript' ||
      contentType === 'application/javascript' ||
      contentType === 'text/ecmascript' ||
      contentType === 'application/ecmascript';
  }

  function repairAlreadyAttempted() {
    try { return sessionStorage.getItem(REPAIR_GUARD) === '1'; }
    catch (_) { return false; }
  }

  function markRepairAttempt() {
    try { sessionStorage.setItem(REPAIR_GUARD, '1'); }
    catch (_) { /* Private Modi koennen sessionStorage sperren. */ }
  }

  async function repairPoisonedModuleCache() {
    if (navigator.onLine === false || repairAlreadyAttempted()) return false;

    try {
      // HEAD wird vom bisherigen Service Worker nicht behandelt und prueft
      // deshalb den echten Server. Nur wenn dieser korrektes JavaScript
      // liefert, darf ein alter App-Shell-Cache entfernt werden.
      const serverResponse = await fetch(MAIN_MODULE_URL, {
        method: 'HEAD',
        cache: 'no-store'
      });
      if (!isJavaScriptResponse(serverResponse)) return false;

      // Dieser GET laeuft bewusst durch den aktiven Service Worker. Weicht sein
      // MIME-Typ vom bereits geprueften Server ab, ist dessen Cache vergiftet.
      const routedResponse = await fetch(MAIN_MODULE_URL, { cache: 'reload' });
      if (isJavaScriptResponse(routedResponse)) return false;

      markRepairAttempt();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith(APP_CACHE_PREFIX))
          .map(name => caches.delete(name))
      );
      window.location.reload();
      return true;
    } catch (_) {
      // Offline oder Server nicht erreichbar: vorhandenen Offline-Cache
      // unangetastet lassen und beim naechsten Online-Start erneut pruefen.
      return false;
    }
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  repairPoisonedModuleCache().then(repairStarted => {
    if (repairStarted) return;

    navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      updateViaCache: 'none'
    }).then(registration => {
      registration.update().catch(() => {});
      window.addEventListener('focus', () => registration.update().catch(() => {}));
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            // sw.js ruft skipWaiting bereits beim Installieren auf. Die Nachricht
            // bleibt kompatibel mit aelteren Workern, die darauf noch warten.
            worker.postMessage?.('skipWaiting');
          }
        });
      });
    }).catch(() => {});
  }).catch(() => {});
})();
