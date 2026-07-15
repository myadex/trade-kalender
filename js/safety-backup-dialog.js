// ============================================================
// safety-backup-dialog.js — UI fuer automatische Sicherungen
// ============================================================
// Rendert den Verlauf und reicht die ausgewaehlte ID an app.js zurueck.
// Persistenz und Zustandswechsel bleiben bewusst ausserhalb dieses Moduls.

import { $, fmtDE } from './helpers.js';
import { openAccessibleDialog, closeAccessibleDialog } from './dialog-accessibility.js';
import { MAX_SAFETY_BACKUPS, normalizeSafetyBackups } from './safety-backups.js';

const REASON_LABELS = {
  'csv-import': 'Vor CSV-Import',
  'json-restore': 'Vor JSON-Wiederherstellung',
  reset: 'Vor komplettem Reset',
  'backup-restore': 'Vor Wiederherstellung',
  unknown: 'Automatische Sicherung'
};

function formatBackupTime(createdAt) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Unbekannter Zeitpunkt';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function backupPnl(entry) {
  return entry.data.trades.reduce((sum, trade) =>
    sum + (Number.isFinite(Number(trade.pnl)) ? Number(trade.pnl) : 0), 0);
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

export function renderSafetyBackupDialog(backups, onRestore) {
  const entries = normalizeSafetyBackups(backups);
  const list = $('safety-backup-list');
  const empty = $('safety-backup-empty');
  list.replaceChildren();
  empty.hidden = entries.length > 0;
  $('safety-backup-count').textContent = entries.length + ' von ' + MAX_SAFETY_BACKUPS + ' Sicherungen';

  entries.forEach(entry => {
    const row = document.createElement('article');
    row.className = 'safety-backup-row';
    row.setAttribute('role', 'listitem');

    const copy = document.createElement('div');
    copy.className = 'safety-backup-copy';
    copy.appendChild(textElement('strong', 'safety-backup-reason', REASON_LABELS[entry.reason] || REASON_LABELS.unknown));
    copy.appendChild(textElement('span', 'safety-backup-time', formatBackupTime(entry.createdAt)));
    copy.appendChild(textElement(
      'span',
      'safety-backup-meta',
      entry.data.trades.length + ' Trades · ' + fmtDE(backupPnl(entry)) + ' netto'
    ));

    const button = textElement('button', 'btn safety-backup-restore', 'Wiederherstellen');
    button.type = 'button';
    button.setAttribute('aria-label', REASON_LABELS[entry.reason] + ' vom ' + formatBackupTime(entry.createdAt) + ' wiederherstellen');
    button.addEventListener('click', () => onRestore(entry.id));

    row.appendChild(copy);
    row.appendChild(button);
    list.appendChild(row);
  });
}

export function openSafetyBackupDialog(backups, onRestore) {
  renderSafetyBackupDialog(backups, onRestore);
  openAccessibleDialog('safety-backup-overlay');
}

export function closeSafetyBackupDialog() {
  closeAccessibleDialog('safety-backup-overlay');
}
