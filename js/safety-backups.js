// ============================================================
// safety-backups.js — versionierte Sicherungen des App-Zustands
// ============================================================
// Erstellt und restauriert reine JSON-Snapshots ohne DOM oder Drive-Zugriff.
// Die Sicherungen enthalten bewusst keine weiteren Sicherungen, damit die
// Datei nicht bei jedem Snapshot rekursiv und exponentiell waechst.

export const MAX_SAFETY_BACKUPS = 10;

const ALLOWED_REASONS = new Set([
  'csv-import',
  'json-restore',
  'reset',
  'backup-restore',
  'drive-replaced',
  'local-replaced',
  'encrypted-restore'
]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneArray(value) {
  return Array.isArray(value) ? cloneJson(value) : [];
}

// Nur der aktuelle fachliche Zustand gehoert in einen Snapshot. safetyBackups
// bleibt absichtlich draussen, sonst enthaelt jede Sicherung alle aelteren
// Sicherungen erneut.
export function snapshotSafetyData(data = {}) {
  return {
    trades: cloneArray(data.trades),
    openLots: cloneArray(data.openLots),
    capital: Number.isFinite(data.capital) ? data.capital : 0,
    importRows: cloneArray(data.importRows),
    importBaseOpenLots: Array.isArray(data.importBaseOpenLots)
      ? cloneJson(data.importBaseOpenLots)
      : null,
    hiddenOpenPositions: cloneArray(data.hiddenOpenPositions)
  };
}

export function normalizeSafetyBackups(backups) {
  if (!Array.isArray(backups)) return [];
  const seen = new Set();
  return backups
    .filter(entry => {
      if (!entry || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id)) return false;
      if (!Number.isFinite(entry.createdAt) || !entry.data || !Array.isArray(entry.data.trades)) return false;
      seen.add(entry.id);
      return true;
    })
    .map(entry => ({
      schemaVersion: 1,
      id: entry.id,
      createdAt: entry.createdAt,
      reason: ALLOWED_REASONS.has(entry.reason) ? entry.reason : 'unknown',
      data: snapshotSafetyData(entry.data)
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_SAFETY_BACKUPS);
}

function uniqueBackupId(backups, createdAt) {
  const prefix = 'safety-' + createdAt;
  let id = prefix;
  let suffix = 2;
  const ids = new Set(backups.map(entry => entry.id));
  while (ids.has(id)) {
    id = prefix + '-' + suffix;
    suffix++;
  }
  return id;
}

export function addSafetyBackup(data, reason, createdAt = Date.now()) {
  return addSafetyBackupFrom(data, data, reason, createdAt);
}

// Bei einem Speicherwechsel ist der zu sichernde Stand nicht der neue
// Zielstand. Deshalb kann die Quelle explizit uebergeben werden, ohne die
// bestehenden Sicherungen des Zielstands zu verlieren.
export function addSafetyBackupFrom(data, sourceData, reason, createdAt = Date.now()) {
  if (!ALLOWED_REASONS.has(reason)) {
    throw new Error('Unbekannter Sicherungsgrund: ' + reason);
  }
  const timestamp = Number(createdAt);
  if (!Number.isFinite(timestamp)) {
    throw new Error('Ungueltiger Sicherungszeitpunkt.');
  }

  const existing = normalizeSafetyBackups(data && data.safetyBackups);
  const current = snapshotSafetyData(data);
  const source = snapshotSafetyData(sourceData);
  const entry = {
    schemaVersion: 1,
    id: uniqueBackupId(existing, timestamp),
    createdAt: timestamp,
    reason,
    data: source
  };

  return Object.assign({}, current, {
    safetyBackups: [entry].concat(existing).slice(0, MAX_SAFETY_BACKUPS)
  });
}

// Auch eine Wiederherstellung bekommt zuerst einen Rueckweg. Dadurch kann der
// Nutzer nach einer versehentlich gewaehlten alten Sicherung zum unmittelbar
// vorherigen Stand zurueckkehren.
export function restoreSafetyBackup(data, backupId, createdAt = Date.now()) {
  const existing = normalizeSafetyBackups(data && data.safetyBackups);
  const selected = existing.find(entry => entry.id === backupId);
  if (!selected) return null;

  const protectedCurrent = addSafetyBackup(
    Object.assign({}, snapshotSafetyData(data), { safetyBackups: existing }),
    'backup-restore',
    createdAt
  );
  return Object.assign({}, snapshotSafetyData(selected.data), {
    safetyBackups: protectedCurrent.safetyBackups
  });
}
