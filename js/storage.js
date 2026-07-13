// ============================================================
// storage.js — Google-Drive-Kommunikation (zustandslos)
// ============================================================
// Reine API-Funktionen: sie bekommen accessToken (und ggf. Daten/Datei-ID)
// als Parameter übergeben und greifen NICHT auf globalen Zustand zu.
// Der State (DATA, accessToken, driveFileId) bleibt in app.js.

import { DATA_FILENAME } from './config.js';

// Ein 412 ist kein normaler Netzwerkfehler: Drive hat den Schreibvorgang
// atomar abgelehnt, weil seit dem letzten Laden eine neuere Dateiversion
// entstanden ist. Der eigene Fehlertyp erlaubt app.js eine gezielte Reaktion.
export class DriveConflictError extends Error {
  constructor() {
    super('Die Drive-Datei wurde zwischenzeitlich geaendert.');
    this.name = 'DriveConflictError';
    this.status = 412;
  }
}

// Serialisiert Schreibauftraege innerhalb eines Tabs. Nach einem Fehler bleibt
// die Queue nutzbar, damit ein spaeterer Speicherversuch nicht mit dem ersten
// fehlgeschlagenen Promise verkettet haengen bleibt.
export function createWriteQueue() {
  let tail = Promise.resolve();
  return task => {
    const current = tail.then(task);
    tail = current.catch(() => {});
    return current;
  };
}

async function driveErrorMessage(response) {
  let text = '';
  try { text = await response.text(); } catch (e) { return ''; }
  if (!text) return '';
  try {
    const parsed = JSON.parse(text);
    return String((parsed.error && parsed.error.message) || parsed.message || text).slice(0, 300);
  } catch (e) {
    return text.slice(0, 300);
  }
}

// ------------------------------------------------------------
// fetch mit Bearer-Token. Wirft bei abgelaufener Sitzung (401).
// ------------------------------------------------------------
export async function driveFetch(accessToken, url, opts = {}) {
  opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + accessToken });
  const r = await fetch(url, opts);
  if (!r.ok) {
    if (r.status === 401) {
      throw new Error('Sitzung abgelaufen \u2014 bitte neu anmelden.');
    }
    if (r.status === 412) {
      throw new DriveConflictError();
    }
    const detail = await driveErrorMessage(r);
    throw new Error('Google Drive Fehler (' + r.status + ')' + (detail ? ': ' + detail : ''));
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
    throw new Error('Datendatei in Google Drive ist ung\u00fcltig und wurde nicht geladen.');
  }
}

// Drive API v3 stellt kein ETag-Feld mehr bereit. Die weiterhin offizielle
// v2-Dateirepräsentation liefert fuer Blob-Dateien ein starkes ETag, das der
// v2-Update-Endpunkt mit If-Match serverseitig atomar prueft.
export async function getDataEtag(accessToken, fileId) {
  const r = await driveFetch(
    accessToken,
    'https://www.googleapis.com/drive/v2/files/' + fileId + '?fields=etag'
  );
  const j = await r.json();
  if (!j.etag || String(j.etag).startsWith('W/')) {
    throw new Error('Google Drive hat keine starke Versionskennung geliefert; Speichern bleibt aus Sicherheitsgruenden gesperrt.');
  }
  return String(j.etag);
}

// Das ETag wird absichtlich VOR dem Inhalt geladen. Aendert sich die Datei
// zwischen beiden Requests, ist das ETag aelter als der geladene Inhalt und
// der naechste Schreibversuch endet sicher mit 412 statt fremde Daten zu
// ueberschreiben. Die umgekehrte Reihenfolge waere datenverlustgefaehrlich.
export async function downloadVersionedData(accessToken, fileId) {
  const etag = await getDataEtag(accessToken, fileId);
  const data = await downloadData(accessToken, fileId);
  return { data, etag };
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
export async function updateData(accessToken, fileId, data, etag) {
  if (!etag || String(etag).startsWith('W/')) {
    throw new Error('Drive-Versionskennung fehlt; ungeschuetztes Speichern wurde verhindert.');
  }
  const content = JSON.stringify(data, null, 2);
  const r = await driveFetch(accessToken, 'https://www.googleapis.com/upload/drive/v2/files/' + fileId + '?uploadType=media&fields=etag', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'If-Match': String(etag) },
    body: content
  });
  const j = await r.json();
  if (!j.etag || String(j.etag).startsWith('W/')) {
    throw new Error('Google Drive hat nach dem Speichern keine neue Versionskennung geliefert; bitte Daten neu laden.');
  }
  return String(j.etag);
}
