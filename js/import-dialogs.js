// ============================================================
// import-dialogs.js — UI fuer CSV-Auswahl, Vorschau und Importberichte
// ============================================================
// Das Modul liest lokale CSV-Dateien und rendert bereits berechnete Ergebnisse.
// Parsing, FIFO-Replay, Pending-State, Datenmutation und Speichern bleiben in app.js.

import { $, escapeHtml, fmtDE, fmtPlain } from './helpers.js';
import { openAccessibleDialog, closeAccessibleDialog } from './dialog-accessibility.js';

function dateLabel(value) {
  const parts = String(value || '').split('-');
  return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : '\u2014';
}

export function closeImportMigration() {
  closeAccessibleDialog('import-migration-overlay');
}

export function openImportDialog() {
  closeImportMigration();
  $('import-tbody').innerHTML = '';
  $('import-preview').style.display = 'none';
  $('import-summary').style.display = 'none';
  $('import-report').style.display = 'none';
  $('import-confirm-btn').style.display = 'none';
  $('drop-zone').style.display = 'block';
  $('csv-input').value = '';
  openAccessibleDialog('import-overlay');
}

export function closeImportDialog() {
  closeImportMigration();
  closeAccessibleDialog('import-overlay');
}

export function chooseImportMigrationFile() {
  closeImportMigration();
  $('csv-input').value = '';
  $('csv-input').click();
}

export function handleImportDragOver(event) {
  event.preventDefault();
  $('drop-zone').classList.add('dragover');
}

export function handleImportDragLeave() {
  $('drop-zone').classList.remove('dragover');
}

export function handleImportDrop(event, onFileSelected) {
  event.preventDefault();
  $('drop-zone').classList.remove('dragover');
  const file = event.dataTransfer && event.dataTransfer.files
    ? event.dataTransfer.files[0]
    : null;
  if (file && typeof onFileSelected === 'function') onFileSelected(file);
}

export function readImportFile(file, onText, onError) {
  if (!file) return;
  if (!/\.csv$/i.test(file.name)) {
    onError('Bitte eine .csv-Datei ausw\u00e4hlen (Scalable Capital Export).');
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => onError('Datei konnte nicht gelesen werden.');
  reader.onload = event => {
    try {
      onText(event.target.result);
    } catch (error) {
      onError('Import fehlgeschlagen: ' +
        (error && error.message ? error.message : 'unbekannter Fehler'));
    }
  };
  reader.readAsText(file, 'utf-8');
}

export function showImportError(message) {
  const summary = $('import-summary');
  if (summary) {
    summary.textContent = message;
    summary.className = 'import-summary warn';
    summary.style.display = 'block';
  }
  const dropZone = $('drop-zone');
  if (dropZone) dropZone.style.display = 'block';
  const preview = $('import-preview');
  if (preview) preview.style.display = 'none';
  const report = $('import-report');
  if (report) report.style.display = 'none';
  const button = $('import-confirm-btn');
  if (button) button.style.display = 'none';
}

export function renderImportMigration(migration) {
  $('import-preview').style.display = 'none';
  $('import-confirm-btn').style.display = 'none';
  $('drop-zone').style.display = 'block';
  $('import-summary').style.display = 'none';
  $('import-report').style.display = 'none';

  const tradeLabel = migration.legacyTradeCount === 1 ? 'geschlossener Trade' : 'geschlossene Trades';
  const lotLabel = migration.baseOpenLotCount === 1 ? 'offenes Lot' : 'offene Lots';
  $('migration-existing-count').textContent =
    migration.legacyTradeCount + ' ' + tradeLabel + ' \u00b7 ' +
    migration.baseOpenLotCount + ' ' + lotLabel;
  $('migration-history-range').textContent = migration.historyFrom && migration.historyTo
    ? (migration.historyFrom === migration.historyTo
      ? dateLabel(migration.historyFrom)
      : dateLabel(migration.historyFrom) + ' bis ' + dateLabel(migration.historyTo))
    : 'Nicht automatisch bestimmbar';
  $('migration-cutoff').textContent = migration.cutoff
    ? 'Nur Zeilen nach dem ' + dateLabel(migration.cutoff)
    : 'Manuelle Pr\u00fcfung erforderlich';
  $('migration-overlap-count').textContent = migration.overlapCount === 0
    ? 'Kein geschlossener Trade-Treffer'
    : migration.overlapCount + ' bereits vorhandene' +
      (migration.overlapCount === 1 ? 'r Trade' : ' Trades');

  const datedRows = migration.incomingRowCount - migration.rowsWithoutDate;
  let rowSummary = migration.incomingRowCount + ' Brokerzeilen';
  if (migration.cutoff) {
    rowSummary += ' \u00b7 ' + migration.rowsAtOrBeforeCutoff + ' bis einschlie\u00dflich Stichtag' +
      ' \u00b7 ' + migration.rowsAfterCutoff + ' danach';
  } else if (datedRows > 0) {
    rowSummary += ' \u00b7 ' + datedRows + ' mit Datum';
  }
  if (migration.rowsWithoutDate > 0) {
    rowSummary += ' \u00b7 ' + migration.rowsWithoutDate + ' ohne Datum';
  }
  $('migration-row-summary').textContent = rowSummary;
  $('migration-step-cutoff').textContent = migration.cutoff
    ? 'Entferne alle Datenzeilen bis einschlie\u00dflich ' + dateLabel(migration.cutoff) +
      '. Die Kopfzeile bleibt unver\u00e4ndert.'
    : 'Vergleiche die Datei mit deiner App und behalte nur Brokerzeilen, die dort noch nicht erfasst sind.';
  $('migration-same-day-note').style.display = migration.cutoff ? 'block' : 'none';
  openAccessibleDialog('import-migration-overlay');
}

export function renderImportReport(report, saved) {
  if (!report) return;
  const hasChanges = report.newBrokerRows > 0;
  const signedCount = value => (value > 0 ? '+' : '') + value;
  const state = saved
    ? 'Import gespeichert'
    : (hasChanges ? 'Vorschau vor dem Speichern' : 'Keine neuen Brokerzeilen');
  const badge = saved ? 'Gespeichert' : (hasChanges ? 'Vorschau' : 'Unver\u00e4ndert');

  $('import-report-state').textContent = state;
  $('import-report-badge').textContent = badge;
  $('import-report-rows').textContent = report.newBrokerRows + ' neu';
  $('import-report-rows-meta').textContent = report.duplicateBrokerRows + ' Duplikate \u00b7 ' +
    report.acceptedRows + ' von ' + report.sourceRows + ' angenommen';
  $('import-report-rejected').textContent = report.rejectedRows + ' ignoriert';
  $('import-report-rejected-meta').textContent = 'Nicht ausgef\u00fchrt oder kein Buy/Sell';
  $('import-report-trades').textContent = report.newClosedTrades + ' neu geschlossen';
  $('import-report-trades-meta').textContent = report.duplicateClosedTrades + ' bereits vorhanden';
  $('import-report-open').textContent = report.openPositionsAfter + ' Positionen';
  $('import-report-open-meta').textContent = 'Vorher ' + report.openPositionsBefore +
    ' \u00b7 \u00c4nderung ' + signedCount(report.openPositionsDelta);
  $('import-report-pnl').textContent = fmtDE(report.pnlAfter);
  $('import-report-pnl-meta').textContent = 'Vorher ' + fmtDE(report.pnlBefore) +
    ' \u00b7 \u00c4nderung ' + fmtDE(report.pnlDelta);
  $('import-report-tax').textContent = fmtDE(report.taxAfter);
  $('import-report-tax-meta').textContent = 'Vorher ' + fmtDE(report.taxBefore) +
    ' \u00b7 \u00c4nderung ' + fmtDE(report.taxDelta);
  $('import-report-note').textContent = saved
    ? 'Der dargestellte Stand wurde in Google Drive gespeichert.'
    : (hasChanges
      ? 'Noch nicht gespeichert. Bitte Bericht pr\u00fcfen und den Import best\u00e4tigen.'
      : 'Es gibt nichts zu speichern; alle angenommenen Brokerzeilen sind bereits bekannt.');
  $('import-report').classList.toggle('saved', saved);
  $('import-report').style.display = 'block';
}

export function renderImportPreview(trades, report, newImportRowCount, newTradeCount) {
  const source = Array.isArray(trades) ? trades : [];
  const tbody = $('import-tbody');
  tbody.innerHTML = '';
  source.slice(0, 40).forEach(trade => {
    const row = document.createElement('tr');
    row.className = trade.isDup ? 'dup' : '';
    const color = trade.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    row.innerHTML = '<td>' + escapeHtml(trade.date) + '</td>' +
      '<td style="font-size:.65rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
      escapeHtml(trade.desc) + '</td>' +
      '<td class="r">' + trade.shares + '</td>' +
      '<td class="r">' + fmtPlain(trade.buy, 0) + '</td>' +
      '<td class="r">' + fmtPlain(trade.sell, 0) + '</td>' +
      '<td class="r" style="color:' + color + '">' + fmtDE(trade.pnl) + '</td>' +
      '<td>' + (trade.isDup ? 'Vorhanden' : 'Neu') + '</td>';
    tbody.appendChild(row);
  });
  if (source.length > 40) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="7" style="color:var(--muted);font-size:.65rem;padding:.3rem .5rem">' +
      '\u2026 und ' + (source.length - 40) + ' weitere</td>';
    tbody.appendChild(row);
  }

  $('import-preview').style.display = 'block';
  $('drop-zone').style.display = 'none';
  $('import-summary').style.display = 'none';
  renderImportReport(report, false);
  if (newImportRowCount > 0) {
    const button = $('import-confirm-btn');
    button.style.display = 'inline-block';
    button.textContent = newTradeCount > 0
      ? newTradeCount + ' Trade' + (newTradeCount !== 1 ? 's' : '') + ' importieren'
      : newImportRowCount + ' Brokerzeile' + (newImportRowCount !== 1 ? 'n' : '') + ' importieren';
  }
}

export function showSavedImportReport(report) {
  $('import-preview').style.display = 'none';
  $('import-confirm-btn').style.display = 'none';
  renderImportReport(report, true);
}
