// ============================================================
// trade-search.js — rein lesender Dialog fuer die Trade-Suche
// ============================================================
// Das Modul liest Filter und rendert Suchergebnisse aus uebergebenen Trades.
// Es kennt weder globalen App-State noch Persistenz; die Auswahl eines Tages
// meldet es ueber einen Callback an den App-Controller zurueck.

import { $, escapeHtml, fmtDE } from './helpers.js';
import { filterTrades, holdMinutes, tradeDirection } from './views.js';
import { openAccessibleDialog, closeAccessibleDialog } from './dialog-accessibility.js';

export function readTradeSearchFilters() {
  return {
    query: $('search-query').value,
    from: $('search-from').value,
    to: $('search-to').value,
    direction: $('search-direction').value,
    result: $('search-result').value,
    hold: $('search-hold').value
  };
}

function searchDateLabel(value) {
  const parts = String(value || '').split('-');
  return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : '\u2014';
}

function searchHoldLabel(trade) {
  const minutes = holdMinutes(trade);
  const duration = minutes === null
    ? ''
    : (minutes < 60
      ? minutes + ' Min.'
      : Math.floor(minutes / 60) + ' Std.' + (minutes % 60 ? ' ' + (minutes % 60) + ' Min.' : ''));
  if (trade.buyDate && trade.date && trade.buyDate !== trade.date) {
    return 'Overnight' + (duration ? ' \u00b7 ' + duration : '');
  }
  return duration || 'Unbekannt';
}

export function closeTradeSearch() {
  closeAccessibleDialog('search-overlay');
}

export function renderTradeSearch(trades, onShowDetail) {
  const source = Array.isArray(trades) ? trades : [];
  const result = filterTrades(source, readTradeSearchFilters());
  const summary = $('search-summary');
  const results = $('search-results');
  results.innerHTML = '';

  if (result.invalidRange) {
    summary.className = 'search-summary error';
    summary.textContent = 'Der Start des Zeitraums liegt nach dem Ende. Bitte die Ausstiegsdaten korrigieren.';
    results.innerHTML = '<div class="search-empty">Keine Suche ausgef\u00fchrt.</div>';
    return;
  }

  summary.className = 'search-summary';
  summary.innerHTML = '<span><strong>' + result.count + '</strong> von ' + source.length + ' Trades</span>' +
    '<span>Netto-P&amp;L <strong class="' + (result.totalPnl >= 0 ? 'pos' : 'neg') + '">' +
    fmtDE(result.totalPnl) + '</strong></span>' +
    '<span><strong class="pos">' + result.wins + ' W</strong> \u00b7 <strong class="neg">' +
    result.losses + ' L</strong> \u00b7 ' + result.flat + ' neutral</span>';

  if (result.trades.length === 0) {
    results.innerHTML = '<div class="search-empty">Keine Trades passen zu diesen Filtern.</div>';
    return;
  }

  result.trades.forEach(trade => {
    const direction = tradeDirection(trade.desc);
    const directionLabel = direction === 'long' ? 'Long' : (direction === 'short' ? 'Short' : 'Neutral');
    const pnl = Number(trade.pnl) || 0;
    const row = document.createElement('article');
    row.className = 'search-result-row';
    row.innerHTML = '<div class="search-result-date"><strong>' + escapeHtml(searchDateLabel(trade.date)) + '</strong>' +
      '<span>' + escapeHtml(trade.time || '') + '</span></div>' +
      '<div class="search-result-product"><strong>' + escapeHtml(trade.desc || 'Ohne Produkt') + '</strong>' +
      '<span>' + escapeHtml(trade.isin || 'Manueller Trade') + '</span></div>' +
      '<div class="search-result-meta"><span class="search-direction ' + direction + '">' + directionLabel + '</span>' +
      '<span>' + escapeHtml(searchHoldLabel(trade)) + '</span></div>' +
      '<div class="search-result-pnl ' + (pnl >= 0 ? 'pos' : 'neg') + '">' + fmtDE(pnl) + '</div>' +
      '<button type="button" class="search-result-open">Tag anzeigen</button>';
    row.querySelector('.search-result-open').onclick = () => {
      closeTradeSearch();
      if (typeof onShowDetail === 'function') onShowDetail(trade.date);
    };
    results.appendChild(row);
  });
}

export function openTradeSearchDialog(trades, onShowDetail) {
  renderTradeSearch(trades, onShowDetail);
  openAccessibleDialog('search-overlay', 'search-query');
}

export function resetTradeSearchDialog(trades, onShowDetail) {
  $('search-query').value = '';
  $('search-from').value = '';
  $('search-to').value = '';
  $('search-direction').value = 'all';
  $('search-result').value = 'all';
  $('search-hold').value = 'all';
  renderTradeSearch(trades, onShowDetail);
  $('search-query').focus();
}
