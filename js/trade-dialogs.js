// ============================================================
// trade-dialogs.js — UI der Dialoge Hinzufuegen und Bearbeiten
// ============================================================
// Dieses Modul zeigt Trade-Formulare, liest ihre Werte und berechnet nur die
// sichtbare Vorschau. Validierung, Datenmutation, FIFO und Speichern bleiben
// bewusst im App-Controller.

import { $, fmtDE, toLocalDateStr } from './helpers.js';

function numberValue(id) {
  return parseFloat($(id).value) || 0;
}

export function readAddTradeForm() {
  return {
    date: $('f-date').value,
    desc: $('f-desc').value.trim(),
    broker: $('f-broker').value,
    shares: numberValue('f-shares'),
    buy: numberValue('f-buy'),
    sell: numberValue('f-sell'),
    tax: numberValue('f-tax')
  };
}

export function updatePnlPreview() {
  const form = readAddTradeForm();
  const pnl = form.sell - form.buy - form.tax;
  const preview = $('pnl-preview');
  preview.textContent = 'P&L: ' + fmtDE(pnl);
  preview.className = 'pnl-preview ' + (pnl >= 0 ? 'pos' : 'neg');
}

export function openAddModal(preferredDate = '') {
  if (preferredDate) $('f-date').value = preferredDate;
  else if (!$('f-date').value) $('f-date').value = toLocalDateStr(new Date());
  $('f-desc').value = '';
  $('f-shares').value = '';
  $('f-buy').value = '';
  $('f-sell').value = '';
  $('f-tax').value = '';
  updatePnlPreview();
  $('add-overlay').classList.add('open');
}

export function closeAddModal() {
  $('add-overlay').classList.remove('open');
}

export function readEditTradeForm() {
  return {
    uid: $('e-uid').value,
    date: $('e-date').value,
    desc: $('e-desc').value.trim(),
    broker: $('e-broker').value,
    shares: numberValue('e-shares'),
    buy: numberValue('e-buy'),
    sell: numberValue('e-sell'),
    tax: numberValue('e-tax')
  };
}

export function updateEditPreview() {
  const preview = $('edit-pnl-preview');
  if ($('edit-overlay').dataset.imported === 'true') {
    preview.textContent = 'P&L wird beim Speichern per FIFO neu berechnet.';
    preview.className = 'pnl-preview';
    return;
  }
  const form = readEditTradeForm();
  const pnl = form.sell - form.buy - form.tax;
  preview.textContent = 'P&L: ' + fmtDE(pnl);
  preview.className = 'pnl-preview ' + (pnl >= 0 ? 'pos' : 'neg');
}

export function openEditTradeDialog(trade) {
  const isImported = trade.source === 'import';
  $('e-uid').value = trade.uid;
  $('e-date').value = trade.date;
  $('e-desc').value = trade.desc;
  $('e-broker').value = trade.broker || 'scalable';
  $('e-shares').value = trade.shares || '';
  $('e-buy').value = trade.buy;
  $('e-sell').value = trade.sell;
  $('e-tax').value = trade.tax;
  // Bei Importen gehoert der Einstand zu den Buy-Rohzeilen und der Broker ist
  // durch die Quelle festgelegt. Der Sell-Editor darf beides nicht veraendern.
  $('e-buy').readOnly = isImported;
  $('e-broker').disabled = isImported;
  $('e-import-note').style.display = isImported ? 'block' : 'none';
  $('edit-overlay').dataset.imported = isImported ? 'true' : 'false';
  updateEditPreview();
  $('edit-overlay').classList.add('open');
}

export function closeEditModal() {
  $('edit-overlay').classList.remove('open');
}
