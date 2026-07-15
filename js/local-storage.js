// ============================================================
// local-storage.js — lokale IndexedDB-Persistenz
// ============================================================
// Speichert App-Daten und die gewaehlte Speicherart getrennt in IndexedDB.
// Alle Browser-Abhaengigkeiten koennen fuer Tests injiziert werden; fachliche
// Datenvalidierung und UI gehoeren bewusst nicht in dieses Modul.

import { emptyAppData, isAppDataDocument, normalizeAppData } from './app-data.js';

export const LOCAL_DB_NAME = 'trade-kalender-local';
export const LOCAL_DB_VERSION = 1;
export const LOCAL_STORE_NAME = 'app-state';
export const STORAGE_MODE_LOCAL = 'local';
export const STORAGE_MODE_DRIVE = 'drive';

const DATA_KEY = 'data';
const MODE_KEY = 'storage-mode';

function indexedDbDefault() {
  return typeof indexedDB === 'undefined' ? null : indexedDB;
}

function openLocalDatabase(indexedDBApi = indexedDbDefault()) {
  if (!indexedDBApi || typeof indexedDBApi.open !== 'function') {
    return Promise.reject(new Error('Lokaler Browser-Speicher ist nicht verfuegbar.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDBApi.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(LOCAL_STORE_NAME)) {
        request.result.createObjectStore(LOCAL_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Lokaler Browser-Speicher konnte nicht geoeffnet werden.'));
    request.onblocked = () => reject(new Error('Lokaler Browser-Speicher wird von einem anderen Tab blockiert.'));
  });
}

async function readValue(key, indexedDBApi) {
  const db = await openLocalDatabase(indexedDBApi);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCAL_STORE_NAME, 'readonly');
      const request = transaction.objectStore(LOCAL_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Lokale Daten konnten nicht gelesen werden.'));
      transaction.onabort = () => reject(transaction.error || new Error('Lokales Lesen wurde abgebrochen.'));
    });
  } finally {
    db.close();
  }
}

async function writeValue(key, value, indexedDBApi) {
  const db = await openLocalDatabase(indexedDBApi);
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCAL_STORE_NAME, 'readwrite');
      transaction.objectStore(LOCAL_STORE_NAME).put(value, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Lokale Daten konnten nicht gespeichert werden.'));
      transaction.onabort = () => reject(transaction.error || new Error('Lokales Speichern wurde abgebrochen.'));
    });
  } finally {
    db.close();
  }
}

export async function loadLocalData(indexedDBApi = indexedDbDefault()) {
  const value = await readValue(DATA_KEY, indexedDBApi);
  if (value === undefined) return emptyAppData();
  if (!isAppDataDocument(value)) {
    throw new Error('Lokaler Datenstand ist ungueltig und wurde nicht geladen.');
  }
  return normalizeAppData(value);
}

export async function saveLocalData(data, indexedDBApi = indexedDbDefault()) {
  const normalized = normalizeAppData(data);
  await writeValue(DATA_KEY, normalized, indexedDBApi);
  return normalized;
}

export async function loadStorageMode(indexedDBApi = indexedDbDefault()) {
  const value = await readValue(MODE_KEY, indexedDBApi);
  return value === STORAGE_MODE_LOCAL || value === STORAGE_MODE_DRIVE ? value : null;
}

export async function saveStorageMode(mode, indexedDBApi = indexedDbDefault()) {
  if (mode !== STORAGE_MODE_LOCAL && mode !== STORAGE_MODE_DRIVE) {
    throw new Error('Unbekannter Speichermodus.');
  }
  await writeValue(MODE_KEY, mode, indexedDBApi);
  return mode;
}

export async function requestPersistentLocalStorage(
  storageManager = typeof navigator === 'undefined' ? null : navigator.storage
) {
  if (!storageManager || typeof storageManager.persist !== 'function') return false;
  try {
    return await storageManager.persist();
  } catch (_) {
    return false;
  }
}
