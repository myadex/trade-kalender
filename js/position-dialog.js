// ============================================================
// position-dialog.js — UI zum manuellen Schliessen offener Positionen
// ============================================================
// Das Modul zeigt aggregierte Lots, liest das Formular und berechnet nur die
// Vorschau. Ledger, Trade-Erzeugung, App-State und Speichern bleiben in app.js.

import { TAX_RATE } from './config.js';
import { $, fmtDE, fmtPlain, toLocalDateStr } from './helpers.js';

export function readClosePositionForm() {
  return {
    date: $('cp-date').value,
    sell: parseFloat($('cp-sell').value),
    tax: parseFloat($('cp-tax').value) || 0
  };
}

export function updateClosePreview() {
  const cost = parseFloat($('cp-cost').value) || 0;
  const sell = parseFloat($('cp-sell').value) || 0;
  const grossPnl = sell - cost;
  const taxField = $('cp-tax');
  // Eine manuelle Steuerangabe hat Vorrang; automatische Folgeeingaben duerfen
  // sie nicht unbemerkt wieder mit dem Standardsteuersatz ueberschreiben.
  if (!taxField.dataset.touched) {
    const autoTax = +(grossPnl * TAX_RATE).toFixed(2);
    taxField.value = autoTax.toFixed(2);
  }
  const tax = parseFloat(taxField.value) || 0;
  const pnl = sell - cost - tax;
  const preview = $('cp-preview');
  preview.textContent = 'P&L: ' + fmtDE(pnl) +
    (tax < 0 ? '  (inkl. ' + fmtPlain(Math.abs(tax)) + ' \u20ac Steuererstattung)' : '');
  preview.className = 'pnl-preview ' + (pnl >= 0 ? 'pos' : 'neg');
}

export function openClosePositionDialog(lots, preferredDate = '') {
  const source = Array.isArray(lots) ? lots : [];
  const totalShares = source.reduce((sum, lot) => sum + lot.shares, 0);
  const totalCost = source.reduce((sum, lot) => sum + lot.amount, 0);
  $('cp-name').textContent = source.length > 0 ? source[0].desc : '';
  $('cp-info').textContent = totalShares.toLocaleString('de-DE') +
    ' St\u00fcck \u00b7 Einstand ' + fmtPlain(totalCost, 2) + ' \u20ac';
  $('cp-cost').value = totalCost.toFixed(2);
  $('cp-date').value = preferredDate || toLocalDateStr(new Date());
  $('cp-sell').value = '';
  $('cp-tax').value = '';
  delete $('cp-tax').dataset.touched;
  updateClosePreview();
  $('close-pos-overlay').classList.add('open');
}

export function closeClosePositionDialog() {
  $('close-pos-overlay').classList.remove('open');
}

export function setCloseTotalLoss() {
  $('cp-sell').value = '0';
  updateClosePreview();
}

export function onCloseTaxInput() {
  $('cp-tax').dataset.touched = '1';
  updateClosePreview();
}
