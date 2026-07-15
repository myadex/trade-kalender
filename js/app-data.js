// ============================================================
// app-data.js — kanonischer persistenter App-Zustand
// ============================================================
// Normalisiert Daten aus Drive, IndexedDB und Backups auf denselben Vertrag.
// Das Modul kennt weder DOM noch Netzwerk und verwirft unbekannte Felder
// bewusst, damit untrusted Importdaten nicht ungeprueft in den State gelangen.

import { normalizeSafetyBackups } from './safety-backups.js';

function cloneArray(value) {
  return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
}

export function emptyAppData() {
  return {
    trades: [],
    openLots: [],
    capital: 0,
    importRows: [],
    importBaseOpenLots: null,
    hiddenOpenPositions: [],
    safetyBackups: []
  };
}

export function isAppDataDocument(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Array.isArray(value.trades);
}

export function normalizeAppData(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
  return {
    trades: cloneArray(source.trades),
    openLots: cloneArray(source.openLots),
    capital: Number.isFinite(source.capital) ? source.capital : 0,
    importRows: cloneArray(source.importRows),
    importBaseOpenLots: Array.isArray(source.importBaseOpenLots)
      ? cloneArray(source.importBaseOpenLots)
      : null,
    hiddenOpenPositions: cloneArray(source.hiddenOpenPositions),
    safetyBackups: normalizeSafetyBackups(source.safetyBackups)
  };
}

