// ============================================================
// storage-migration.js — Vergleich und Vorbereitung eines Speicherwechsels
// ============================================================
// Berechnet reine, erklaerbare Zusammenfassungen und erstellt den gewaehlen
// Zielstand mit Rueckweg. Es greift weder auf Drive noch IndexedDB oder DOM zu.

import { normalizeAppData } from './app-data.js';
import { addSafetyBackupFrom } from './safety-backups.js';
import { deriveOpenPositions, visibleOpenLots } from './fifo.js';

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function hasMeaningfulAppData(value) {
  const data = normalizeAppData(value);
  return data.trades.length > 0 || data.openLots.length > 0 ||
    data.importRows.length > 0 || data.hiddenOpenPositions.length > 0 ||
    data.safetyBackups.length > 0 || data.capital !== 0;
}

export function summarizeStorageData(value) {
  const data = normalizeAppData(value);
  const dates = data.trades
    .map(trade => typeof trade.date === 'string' ? trade.date : '')
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();
  const netPnl = data.trades.reduce((sum, trade) => sum + finite(trade.pnl), 0);
  const latestBackupAt = data.safetyBackups.reduce(
    (latest, entry) => Math.max(latest, finite(entry.createdAt)),
    0
  );
  return {
    hasData: hasMeaningfulAppData(data),
    tradeCount: data.trades.length,
    openPositionCount: deriveOpenPositions(
      visibleOpenLots(data.openLots, data.hiddenOpenPositions)
    ).length,
    netPnl: +netPnl.toFixed(2),
    from: dates.length ? dates[0] : null,
    to: dates.length ? dates[dates.length - 1] : null,
    latestBackupAt: latestBackupAt || null
  };
}

export function classifyStorageMigration(localData, driveData) {
  const local = summarizeStorageData(localData);
  const drive = summarizeStorageData(driveData);
  let kind = 'empty';
  if (local.hasData && drive.hasData) kind = 'compare';
  else if (local.hasData) kind = 'local-only';
  else if (drive.hasData) kind = 'drive-only';
  return { kind, local, drive };
}

export function prepareStorageMigration(localData, driveData, choice, createdAt = Date.now()) {
  if (choice !== 'local' && choice !== 'drive') {
    throw new Error('Bitte einen Datenstand fuer die Migration auswaehlen.');
  }
  const selected = normalizeAppData(choice === 'local' ? localData : driveData);
  const replaced = normalizeAppData(choice === 'local' ? driveData : localData);
  if (!hasMeaningfulAppData(replaced)) return selected;
  return addSafetyBackupFrom(
    selected,
    replaced,
    choice === 'local' ? 'drive-replaced' : 'local-replaced',
    createdAt
  );
}
