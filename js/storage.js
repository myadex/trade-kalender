// ============================================================
// storage.js — Google-Drive-Kommunikation (zustandslos)
// ============================================================
// Reine API-Funktionen: sie bekommen accessToken (und ggf. Daten/Datei-ID)
// als Parameter übergeben und greifen NICHT auf globalen Zustand zu.
// Der State (DATA, accessToken, driveFileId) bleibt in app.js.

import { DATA_FILENAME } from './config.js';

// ------------------------------------------------------------
// fetch mit Bearer-Token. Wirft bei abgelaufener Sitzung (401).
// ------------------------------------------------------------
export async function driveFetch(accessToken, url, opts = {}) {
  opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + accessToken });
  const r = await fetch(url, opts);
  if (r.status === 401) {
    throw new Error('Sitzung abgelaufen \u2014 bitte neu anmelden.');
  }
  return r;
}

// ------------------------------------------------------------
// Sucht die Datendatei in Drive. Gibt die Datei-ID zurück oder null.
// (Sieht nur Dateien, die die App selbst erstellt hat — drive.file-Scope.)
// ------------------------------------------------------------
export async function findDataFile(accessToken) {
  const q = encodeURIComponent("name='" + DATA_FILENAME + "' and trashed=false");
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + q + '&spaces=drive&fields=files(id,name)';
  const r = await driveFetch(accessToken, url);
  const j = await r.json();
  if (j.files && j.files.length > 0) return j.files[0].id;
  return null;
}

// ------------------------------------------------------------
// Lädt und parst die Datendatei. Gibt ein sauberes DATA-Objekt zurück
// (mit Fallback-Werten, falls die Datei leer/kaputt ist).
// ------------------------------------------------------------
export async function downloadData(accessToken, fileId) {
  const r = await driveFetch(accessToken, 'https://www.googleapis.com/drive/v3/files/' + fileId + '?alt=media');
  const text = await r.text();
  try {
    const parsed = JSON.parse(text);
    return {
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      openLots: Array.isArray(parsed.openLots) ? parsed.openLots : [],
      capital: typeof parsed.capital === 'number' ? parsed.capital : 0,
      importRows: Array.isArray(parsed.importRows) ? parsed.importRows : [],
      importBaseOpenLots: Array.isArray(parsed.importBaseOpenLots) ? parsed.importBaseOpenLots : null
    };
  } catch (e) {
    return { trades: [], openLots: [], capital: 0, importRows: [], importBaseOpenLots: null };
  }
}

// ------------------------------------------------------------
// Erstellt eine neue Datendatei in Drive (multipart). Gibt die neue ID zurück.
// ------------------------------------------------------------
export async function createData(accessToken, data) {
  const content = JSON.stringify(data, null, 2);
  const metadata = { name: DATA_FILENAME, mimeType: 'application/json' };
  const boundary = 'tk_boundary_' + Date.now();
  const body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: application/json\r\n\r\n' +
    content + '\r\n' +
    '--' + boundary + '--';
  const r = await driveFetch(accessToken, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
    body
  });
  const j = await r.json();
  return j.id;
}

// ------------------------------------------------------------
// Aktualisiert eine bestehende Datendatei (media update).
// ------------------------------------------------------------
export async function updateData(accessToken, fileId, data) {
  const content = JSON.stringify(data, null, 2);
  await driveFetch(accessToken, 'https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: content
  });
}
