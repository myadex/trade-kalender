// ============================================================
// storage-migration-dialog.js — UI fuer lokalen Stand vs. Drive
// ============================================================
// Rendert ausschliesslich die bereits berechneten Zusammenfassungen. Laden,
// Schreiben, Auswahl und Konfliktbehandlung bleiben im App-Controller.

import { $, fmtDE } from './helpers.js';
import { openAccessibleDialog, closeAccessibleDialog } from './dialog-accessibility.js';

function dateLabel(value) {
  if (!value) return 'Keine Trades';
  const parts = String(value).split('-');
  return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : value;
}

function backupLabel(value) {
  if (!value) return 'Keine Sicherung';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unbekannt';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function fact(label, value) {
  const row = document.createElement('div');
  row.className = 'storage-migration-fact';
  const name = document.createElement('span');
  name.textContent = label;
  const result = document.createElement('strong');
  result.textContent = value;
  row.append(name, result);
  return row;
}

function renderSummary(id, title, summary) {
  const container = $(id);
  container.replaceChildren();
  const heading = document.createElement('h4');
  heading.textContent = title;
  container.appendChild(heading);
  container.appendChild(fact('Trades', String(summary.tradeCount)));
  container.appendChild(fact('Zeitraum', summary.from
    ? dateLabel(summary.from) + ' bis ' + dateLabel(summary.to)
    : 'Keine geschlossenen Trades'));
  container.appendChild(fact('Netto-P&L', fmtDE(summary.netPnl)));
  container.appendChild(fact('Offene Positionen', String(summary.openPositionCount)));
  container.appendChild(fact('Letzte Sicherung', backupLabel(summary.latestBackupAt)));
  container.classList.toggle('empty', !summary.hasData);
}

export function openStorageMigrationDialog(comparison) {
  renderSummary('storage-migration-local-summary', 'Dieses Geraet', comparison.local);
  renderSummary('storage-migration-drive-summary', 'Google Drive', comparison.drive);
  const note = $('storage-migration-note');
  if (comparison.kind === 'local-only') {
    note.textContent = 'Google Drive ist leer. Empfohlen: lokalen Stand zu Drive uebertragen.';
  } else if (comparison.kind === 'drive-only') {
    note.textContent = 'Dieses Geraet ist leer. Empfohlen: vorhandenen Drive-Stand verwenden.';
  } else if (comparison.kind === 'empty') {
    note.textContent = 'Beide Staende sind leer. Es gehen keine Handelsdaten verloren.';
  } else {
    note.textContent = 'Beide Seiten enthalten Daten. Waehle bewusst genau einen fuehrenden Stand.';
  }
  setStorageMigrationBusy(false);
  openAccessibleDialog('storage-migration-overlay', 'storage-migration-cancel');
}

export function setStorageMigrationBusy(busy, message = '') {
  ['storage-migration-local', 'storage-migration-drive', 'storage-migration-cancel']
    .forEach(id => { $(id).disabled = !!busy; });
  if (message) $('storage-migration-note').textContent = message;
}

export function closeStorageMigrationDialog() {
  closeAccessibleDialog('storage-migration-overlay');
}

