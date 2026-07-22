// ============================================================
// invis-view.js — diskrete, rein lesende Anzeigeformatierung
// ============================================================
// Wandelt Geldwerte optional in Anteile des festen Startkapitals um und
// maskiert Identifikatoren. Das Modul kennt weder DOM noch App-Zustand und
// speichert bewusst keine Einstellung; der Modus gilt nur fuer die Sitzung.

import { fmtDE, fmtPlain, fmtK } from './helpers.js';

function validNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function capitalPercent(value, options, digits, signed) {
  const amount = validNumber(value);
  const capital = validNumber(options && options.capital);
  if (amount === null || capital === null || capital <= 0) return '\u2014';
  const percentage = amount / capital * 100;
  const absolute = Math.abs(percentage).toLocaleString('de-DE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
  if (!signed) return (percentage < 0 ? '-' : '') + absolute + ' %';
  return (percentage < 0 ? '-' : '+') + absolute + ' %';
}

export function formatViewMoney(value, options = {}, digits = 2) {
  return options.enabled
    ? capitalPercent(value, options, digits, true)
    : fmtDE(Number(value), digits);
}

export function formatViewAmount(value, options = {}, digits = 2) {
  return options.enabled
    ? capitalPercent(value, options, digits, false)
    : fmtPlain(Number(value), digits) + ' \u20ac';
}

export function formatViewCompactMoney(value, options = {}) {
  return options.enabled
    ? capitalPercent(value, options, 2, true)
    : fmtK(Number(value));
}

export function formatViewIsin(value, options = {}) {
  if (options.enabled) return 'ISIN verborgen';
  return String(value || 'Keine ISIN');
}

export function formatViewShares(value, options = {}, digits = 3) {
  if (options.enabled) return 'Stückzahl verborgen';
  const shares = validNumber(value);
  return shares === null ? '\u2014' : fmtPlain(shares, digits) + ' Stueck';
}

export function allowViewMutation(options = {}) {
  return options.enabled !== true;
}
