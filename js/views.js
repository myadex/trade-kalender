// ============================================================
// views.js — Aggregations- und Statistik-Logik (pure functions)
// ============================================================
// Diese Funktionen RECHNEN nur — sie schreiben nichts ins DOM.
// Das DOM-Rendering bleibt in app.js (dünne Wrapper, die diese
// Ergebnisse in die Tabellen/Karten schreiben). So bleibt die
// Logik testbar ohne Browser.

import { toLocalDateStr } from './helpers.js';

// ------------------------------------------------------------
// Aggregiert die Tages-Map zu Wochen (Mo-So-Wochen, Schlüssel = Montag).
// Gibt ein sortiertes Array [{ week, monday, pnl, rev, n }] zurück.
// ------------------------------------------------------------
export function aggregateWeeks(dm) {
  const weeks = {};
  Object.entries(dm).forEach(([k, v]) => {
    const date = new Date(k);
    const mon = new Date(date);
    mon.setDate(date.getDate() - (date.getDay() === 0 ? 6 : date.getDay() - 1));
    const wk = toLocalDateStr(mon);
    if (!weeks[wk]) weeks[wk] = { pnl: 0, rev: 0, n: 0 };
    weeks[wk].pnl += v.pnl;
    weeks[wk].rev += v.rev;
    weeks[wk].n += v.n;
  });
  return Object.entries(weeks)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({ week, ...v }));
}

// ------------------------------------------------------------
// Aggregiert die Tages-Map zu Monaten (Schlüssel = 'YYYY-MM').
// Gibt ein sortiertes Array [{ month, pnl, rev, n }] zurück.
// ------------------------------------------------------------
export function aggregateMonths(dm) {
  const months = {};
  Object.entries(dm).forEach(([k, v]) => {
    const mo = k.slice(0, 7);
    if (!months[mo]) months[mo] = { pnl: 0, rev: 0, n: 0 };
    months[mo].pnl += v.pnl;
    months[mo].rev += v.rev;
    months[mo].n += v.n;
  });
  return Object.entries(months)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({ month, ...v }));
}

// ------------------------------------------------------------
// Berechnet alle Gesamt-Kennzahlen aus der Tages-Map.
// capital = Einstand (für die Rendite). Gibt ein Objekt mit allen Werten.
// ------------------------------------------------------------
export function computeStats(dm, capital) {
  const days = Object.values(dm);
  const allPnl = days.map(d => d.pnl);
  const totalPnl = allPnl.reduce((a, b) => a + b, 0);
  const totalTax = days.reduce((a, d) => a + (d.tax || 0), 0);
  const wins = allPnl.filter(p => p > 0).length;
  const losses = allPnl.filter(p => p < 0).length;
  const totalTrades = days.reduce((a, d) => a + (d.n || 0), 0);
  const avgDay = days.length > 0 ? totalPnl / days.length : 0;
  const avgTrade = totalTrades > 0 ? totalPnl / totalTrades : 0;
  let maxStreak = 0, cur = 0;
  allPnl.forEach(p => { cur = p > 0 ? cur + 1 : 0; maxStreak = Math.max(maxStreak, cur); });
  const winrate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
  const cap = capital || 0;
  const rendite = cap > 0 ? (totalPnl / cap) * 100 : null;
  return { totalPnl, totalTax, wins, losses, totalTrades, avgDay, avgTrade, maxStreak, winrate, capital: cap, rendite };
}
