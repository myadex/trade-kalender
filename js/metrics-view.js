// ============================================================
// metrics-view.js — UI fuer klassische Trading-Kennzahlen
// ============================================================
// Dieses Modul liest nur den Zeitraum und rendert ein bereits berechnetes
// Ergebnis. Es kennt weder App-State noch Drive und fuehrt keine Berechnung
// auf Trades aus; diese bleibt als pure Funktion in views.js.

import { $, fmtDE, escapeHtml } from './helpers.js';

export function readTradingMetricRange() {
  return {
    from: $('metrics-from') ? $('metrics-from').value : '',
    to: $('metrics-to') ? $('metrics-to').value : ''
  };
}

export function clearTradingMetricRange() {
  if ($('metrics-from')) $('metrics-from').value = '';
  if ($('metrics-to')) $('metrics-to').value = '';
}

function displayDate(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : dateKey;
}

function rangeLabel(range) {
  if (range.from && range.to) return displayDate(range.from) + '–' + displayDate(range.to);
  if (range.from) return 'Ab ' + displayDate(range.from);
  if (range.to) return 'Bis ' + displayDate(range.to);
  return 'Gesamter Zeitraum';
}

function numberDE(value, digits = 2) {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function ratio(value) {
  if (value === null || value === undefined) return '—';
  if (value === Infinity) return '∞';
  return numberDE(value);
}

function percent(value) {
  return value === null || value === undefined ? '—' : numberDE(value, 1) + ' %';
}

function pnlClass(value) {
  return value > 0 ? 'pos' : (value < 0 ? 'neg' : '');
}

function tradeMeta(trade) {
  if (!trade) return '';
  const product = trade.desc ? ' · ' + escapeHtml(trade.desc) : '';
  return displayDate(trade.date) + product;
}

function card(label, value, cssClass = '', meta = '') {
  return '<article class="metrics-card">' +
    '<div class="metrics-card-label">' + label + '</div>' +
    '<div class="metrics-card-value ' + cssClass + '">' + value + '</div>' +
    (meta ? '<div class="metrics-card-meta">' + meta + '</div>' : '') +
    '</article>';
}

export function renderTradingMetrics(result) {
  const summary = $('metrics-summary');
  const grid = $('metrics-grid');
  const note = $('metrics-note');
  if (!summary || !grid || !note || !result) return;

  if (!result.range.valid) {
    summary.textContent = 'Der gewählte Zeitraum ist ungültig.';
    grid.innerHTML = '<div class="metrics-empty">Keine Kennzahlen berechnet.</div>';
    note.textContent = '„Von“ muss vor oder am selben Tag wie „Bis“ liegen.';
    return;
  }

  summary.textContent = rangeLabel(result.range) + ' · ' + result.count + ' Trades · ' +
    result.wins + ' Gewinn / ' + result.losses + ' Verlust / ' + result.flat + ' neutral';

  if (result.count === 0) {
    grid.innerHTML = '<div class="metrics-empty">Für diesen Zeitraum sind keine auswertbaren Trades vorhanden.</div>';
  } else {
    const drawdownPct = result.maxDrawdownPct === null
      ? ''
      : ' · ' + percent(result.maxDrawdownPct);
    grid.innerHTML =
      card('Netto-P&L', fmtDE(result.totalPnl), result.totalPnl >= 0 ? 'pos' : 'neg',
        'Summe im gewählten Zeitraum') +
      card('Trade-Winrate', percent(result.winrate), '',
        result.wins + ' von ' + result.decisiveTrades + ' entschiedenen Trades') +
      card('Profit Factor', ratio(result.profitFactor),
        result.profitFactor === null ? '' : (result.profitFactor >= 1 ? 'pos' : 'neg'),
        'Gewinnsumme ÷ Verlustsumme') +
      card('Erwartungswert / Trade', fmtDE(result.expectancy),
        result.expectancy >= 0 ? 'pos' : 'neg', 'Netto-P&L ÷ alle Trades') +
      card('Ø Gewinn', result.avgWin === null ? '—' : fmtDE(result.avgWin),
        result.avgWin === null ? '' : 'pos',
        result.wins + ' Gewinn-Trades') +
      card('Ø Verlust', result.avgLoss === null ? '—' : fmtDE(result.avgLoss),
        result.avgLoss === null ? '' : 'neg',
        result.losses + ' Verlust-Trades') +
      card('Payoff-Ratio', ratio(result.payoffRatio), '', 'Ø Gewinn ÷ |Ø Verlust|') +
      card('Bester Trade', result.bestTrade ? fmtDE(result.bestTrade.pnl) : '—',
        result.bestTrade ? pnlClass(result.bestTrade.pnl) : '',
        tradeMeta(result.bestTrade)) +
      card('Schlechtester Trade', result.worstTrade ? fmtDE(result.worstTrade.pnl) : '—',
        result.worstTrade ? pnlClass(result.worstTrade.pnl) : '',
        tradeMeta(result.worstTrade)) +
      card('Max. Gewinnserie', String(result.maxWinStreak), '', 'Aufeinanderfolgende Gewinn-Trades') +
      card('Max. Verlustserie', String(result.maxLossStreak), '', 'Aufeinanderfolgende Verlust-Trades') +
      card('Max. Drawdown', result.maxDrawdown > 0 ? fmtDE(-result.maxDrawdown) : '0,00 €',
        result.maxDrawdown > 0 ? 'neg' : '',
        'Realisierte Tagesendstände' + drawdownPct) +
      card('Recovery Factor', ratio(result.recoveryFactor),
        result.recoveryFactor === null ? '' : (result.recoveryFactor >= 0 ? 'pos' : 'neg'),
        'Netto-P&L ÷ Max. Drawdown');
  }

  const notes = ['Zeitraum = realisierter Ausstiegstag.'];
  if (result.count < 8) notes.push('Kleine Stichprobe: Kennzahlen noch vorsichtig einordnen.');
  if (result.excluded.outsideRange > 0) {
    notes.push(result.excluded.outsideRange + ' Trades liegen außerhalb des Zeitraums.');
  }
  if (result.excluded.invalidDate > 0 || result.excluded.invalidPnl > 0) {
    notes.push('Ausgeschlossen: ' + result.excluded.invalidDate + ' mit ungültigem Datum, ' +
      result.excluded.invalidPnl + ' mit ungültigem P&L.');
  }
  if (result.capital <= 0) notes.push('Drawdown-Prozent benötigt ein positives Startkapital.');
  note.textContent = notes.join(' ');
}
