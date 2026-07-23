// ============================================================
// performance-view.js — gemeinsamer Equity-/Kapitaleinsatz-Chart
// ============================================================
// Das Modul rendert ausschließlich bereits berechnete Ergebnisse. Equity,
// Drawdown, FIFO-Rechnung und App-State bleiben außerhalb dieses UI-Moduls.

import { $, escapeHtml, fmtK, fmtPlain } from './helpers.js';
import { formatViewAmount, formatViewMoney } from './invis-view.js';

function displayDate(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3
    ? parts[2] + '.' + parts[1] + '.' + parts[0]
    : String(dateKey || '');
}

function shortDate(dateKey) {
  const value = String(dateKey || '');
  return value.length >= 10
    ? value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(2, 4)
    : value;
}

function dateValue(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : null;
}

function card(label, value, cls = '', sub = '') {
  return '<div class="equity-card"><div class="equity-card-label">' + label + '</div>' +
    '<div class="equity-card-value ' + cls + '">' + escapeHtml(value) + '</div>' +
    (sub ? '<div class="equity-card-sub">' + escapeHtml(sub) + '</div>' : '') +
    '</div>';
}

function capitalQualityNotes(result) {
  if (!result || !result.available || result.points.length === 0) {
    return ['Für den Kapitaleinsatz fehlen auswertbare Einstiegsdaten.'];
  }

  const coverage = result.coverage || {};
  const notes = [];
  if (coverage.estimatedTradeCount > 0) {
    notes.push(coverage.ledgerStartDate
      ? 'Kapitaleinsatz vor ' + displayDate(coverage.ledgerStartDate) +
        ' geschätzt; vollständiges FIFO-Ledger ab diesem Tag.'
      : 'Kapitaleinsatz aus Alt-Trades geschätzt.');
  }
  if (coverage.missingEntryDateTrades > 0) {
    notes.push(coverage.missingEntryDateTrades + ' Alt-Trade' +
      (coverage.missingEntryDateTrades === 1 ? '' : 's') +
      ' ohne Einstiegsdatum nur am Ausstiegstag berücksichtigt.');
  }
  if (coverage.equityConstrainedDays > 0) {
    notes.push(coverage.equityConstrainedDays + ' Tageswert' +
      (coverage.equityConstrainedDays === 1 ? ' auf' : 'e auf') +
      ' die verfügbare Equity begrenzt.');
  }
  if (coverage.missingTimeRows > 0) {
    notes.push(coverage.missingTimeRows + ' Ledger-Zeile' +
      (coverage.missingTimeRows === 1 ? '' : 'n') +
      ' ohne gültige Uhrzeit geschätzt.');
  }
  const invalidCount = (coverage.invalidRows || 0) +
    (coverage.invalidBaseLots || 0) + (coverage.invalidLegacyTrades || 0);
  if (invalidCount > 0) {
    notes.push(invalidCount === 1
      ? '1 ungültiger Datensatz ausgeschlossen.'
      : invalidCount + ' ungültige Datensätze ausgeschlossen.');
  }
  if (coverage.oversellErrors > 0) {
    notes.push(coverage.oversellErrors +
      ' nicht deckbarer Verkauf nicht eingerechnet.');
  }
  return notes;
}

export function renderPerformance(equity, capitalUsage, options = {}) {
  const summary = $('equity-summary');
  const chart = $('equity-chart');
  const note = $('equity-note');
  if (!summary || !chart || !note || !equity) return;

  if (equity.points.length === 0) {
    summary.innerHTML = '';
    chart.innerHTML =
      '<div class="equity-empty">Noch keine geschlossenen Trades für eine Equity-Kurve.</div>';
    note.textContent = '';
    return;
  }

  const view = {
    enabled: options.enabled === true,
    capital: equity.initialCapital || options.capital
  };
  const hasCapital = equity.initialCapital > 0;
  const capitalVisible = hasCapital && capitalUsage &&
    capitalUsage.available && capitalUsage.points.length > 0;
  const percentage = value => value === null
    ? ''
    : ' (' + value.toFixed(1).replace('.', ',') + ' %)';
  const drawdownValue = (amount, pct) => amount > 0
    ? (view.enabled
        ? formatViewMoney(-amount, view)
        : '−' + fmtPlain(amount) + ' €') + percentage(pct)
    : (view.enabled ? formatViewMoney(0, view) : '0,00 €') + percentage(pct);

  const currentLabel = hasCapital ? 'Aktueller Stand' : 'P&L kumuliert';
  const highLabel = hasCapital ? 'Höchststand' : 'P&L-Hoch';
  const currentValue = hasCapital
    ? formatViewAmount(equity.currentEquity, view)
    : formatViewMoney(equity.netPnl, view);
  const highValue = hasCapital
    ? formatViewAmount(equity.highWaterMark, view)
    : formatViewMoney(equity.highWaterMark, view);
  summary.innerHTML =
    card(currentLabel, currentValue, equity.netPnl >= 0 ? 'pos' : 'neg') +
    card(highLabel, highValue) +
    card('Aktueller Drawdown',
      drawdownValue(equity.currentDrawdown, equity.currentDrawdownPct),
      equity.currentDrawdown > 0 ? 'neg' : 'pos',
      equity.currentDrawdownDays + ' Tage unter Hoch') +
    card('Max. Drawdown',
      drawdownValue(equity.maxDrawdown, equity.maxDrawdownPct),
      equity.maxDrawdown > 0 ? 'neg' : 'pos') +
    card('Längste DD-Phase', equity.longestDrawdownDays + ' Tage', '',
      'bis Erholung oder heute');

  const width = 840;
  const height = 240;
  const left = 46;
  const right = 14;
  const top = 14;
  const bottom = 32;
  const equityFirstDate = equity.points[0].date;
  const equityLastDate = equity.points[equity.points.length - 1].date;
  const capitalFirstDate = capitalVisible ? capitalUsage.points[0].date : equityFirstDate;
  const capitalLastDate = capitalVisible
    ? capitalUsage.points[capitalUsage.points.length - 1].date
    : equityLastDate;
  const startDate = equityFirstDate.localeCompare(capitalFirstDate) <= 0
    ? equityFirstDate
    : capitalFirstDate;
  const endDate = equityLastDate.localeCompare(capitalLastDate) >= 0
    ? equityLastDate
    : capitalLastDate;
  const startTime = dateValue(startDate);
  const endTime = dateValue(endDate);
  const timeSpan = Math.max((endTime || 0) - (startTime || 0), 1);
  const xForDate = date => left +
    (((dateValue(date) || startTime) - startTime) / timeSpan) *
    (width - left - right);

  const equityDisplayPoints = equity.points.slice();
  if (endDate.localeCompare(equityLastDate) > 0) {
    equityDisplayPoints.push({ date: endDate, equity: equity.currentEquity });
  }
  const values = equityDisplayPoints.map(point => point.equity)
    .concat([equity.initialCapital]);
  if (capitalVisible) {
    values.push(...capitalUsage.points.map(point => point.peakCapital));
  }
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  if (capitalVisible) {
    minValue = Math.min(0, minValue);
    maxValue += Math.max((maxValue - minValue) * 0.05, 1);
  } else {
    const margin = Math.max((maxValue - minValue) * 0.08, 1);
    minValue -= margin;
    maxValue += margin;
  }
  if (maxValue === minValue) maxValue = minValue + 1;

  const yFor = value => top + ((maxValue - value) / (maxValue - minValue)) *
    (height - top - bottom);
  const equityLinePoints = equityDisplayPoints.map(point =>
    xForDate(point.date).toFixed(1) + ',' + yFor(point.equity).toFixed(1)).join(' ');
  const firstX = xForDate(startDate).toFixed(1);
  const lastX = xForDate(endDate).toFixed(1);
  const chartBottom = height - bottom;
  const equityAreaPoints = xForDate(equityDisplayPoints[0].date).toFixed(1) +
    ',' + chartBottom + ' ' + equityLinePoints + ' ' +
    xForDate(equityDisplayPoints[equityDisplayPoints.length - 1].date).toFixed(1) +
    ',' + chartBottom;
  const capitalLine = capitalVisible
    ? '<polyline class="capital-usage-line" points="' +
      capitalUsage.points.map(point =>
        xForDate(point.date).toFixed(1) + ',' +
        yFor(point.peakCapital).toFixed(1)).join(' ') +
      '"><title>Höchster gleichzeitig gebundener Einstand pro Kalendertag</title></polyline>'
    : '';

  let grid = '';
  for (let index = 0; index <= 4; index++) {
    const value = maxValue - ((maxValue - minValue) * index / 4);
    const y = yFor(value).toFixed(1);
    const label = view.enabled ? formatViewAmount(value, view, 0) : fmtK(value);
    grid += '<line class="equity-grid-line" x1="' + left + '" y1="' + y +
      '" x2="' + (width - right) + '" y2="' + y + '"></line>' +
      '<text class="equity-axis-label" x="' + (left - 6) + '" y="' +
      (+y + 3) + '" text-anchor="end">' + escapeHtml(label) + '</text>';
  }

  const maxPointIndex = equity.maxDrawdownDate
    ? equity.points.findIndex(point => point.date === equity.maxDrawdownDate)
    : -1;
  const marker = maxPointIndex >= 0 && equity.maxDrawdown > 0
    ? '<circle class="equity-dd-marker" cx="' +
      xForDate(equity.points[maxPointIndex].date).toFixed(1) + '" cy="' +
      yFor(equity.points[maxPointIndex].equity).toFixed(1) +
      '" r="4"><title>Max. Drawdown am ' +
      escapeHtml(equity.maxDrawdownDate) + ': ' +
      escapeHtml(view.enabled
        ? formatViewMoney(-equity.maxDrawdown, view)
        : fmtPlain(equity.maxDrawdown) + ' €') +
      '</title></circle>'
    : '';
  const baseline = equity.initialCapital >= minValue &&
      equity.initialCapital <= maxValue
    ? '<line class="equity-baseline" x1="' + left + '" y1="' +
      yFor(equity.initialCapital).toFixed(1) + '" x2="' + (width - right) +
      '" y2="' + yFor(equity.initialCapital).toFixed(1) + '"></line>'
    : '';
  const qualityNotes = capitalVisible ? capitalQualityNotes(capitalUsage) : [];
  const legend = capitalVisible
    ? '<button type="button" class="performance-legend-button" ' +
      'aria-label="Legende und Datenqualität des Kapitaleinsatzes" ' +
      'aria-describedby="capital-quality-tooltip">' +
      '<span class="performance-legend-item">' +
      '<span class="performance-legend-swatch equity" aria-hidden="true"></span>Equity</span>' +
      '<span class="performance-legend-item">' +
      '<span class="performance-legend-swatch capital" aria-hidden="true"></span>' +
      'Kapitaleinsatz</span>' +
      '<span class="performance-legend-info" aria-hidden="true">i</span>' +
      '<span id="capital-quality-tooltip" class="performance-tooltip" role="tooltip">' +
      escapeHtml(qualityNotes.join(' ')) + '</span></button>'
    : '';

  chart.innerHTML =
    legend +
    '<svg class="equity-svg" viewBox="0 0 ' + width + ' ' + height +
    '" role="img" aria-label="' +
    (capitalVisible
      ? 'Equity, Drawdown und eingesetztes Kapital nach Kalendertag'
      : 'Equity und Drawdown nach Handelstag') + '">' +
    '<defs><linearGradient id="equity-area-gradient" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--green)" stop-opacity=".22"></stop>' +
    '<stop offset="100%" stop-color="var(--green)" stop-opacity=".02"></stop>' +
    '</linearGradient></defs>' +
    grid + baseline +
    '<polygon class="equity-area" points="' + equityAreaPoints + '"></polygon>' +
    capitalLine +
    '<polyline class="equity-line" points="' + equityLinePoints +
    '"><title>Realisierte Equity am Tagesende</title></polyline>' +
    marker +
    '<text class="equity-date-label" x="' + firstX + '" y="' + (height - 8) +
    '" text-anchor="start">' + escapeHtml(shortDate(startDate)) + '</text>' +
    '<text class="equity-date-label" x="' + lastX + '" y="' + (height - 8) +
    '" text-anchor="end">' + escapeHtml(shortDate(endDate)) + '</text>' +
    '</svg>';

  const notes = [
    'Equity basiert auf realisiertem Netto-P&L; offene Positionen sind nicht enthalten.'
  ];
  if (!capitalVisible && !hasCapital) {
    notes.push('Für den Kapitaleinsatz zuerst das Startkapital im Kopfbereich setzen.');
  } else if (!capitalVisible) {
    notes.push(...capitalQualityNotes(capitalUsage));
  }
  note.textContent = notes.join(' ');
}
