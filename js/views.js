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

// ------------------------------------------------------------
// DAX-Handelsphasen für die Uhrzeit-Statistik.
// Der DAX hat eine "gespaltene Persönlichkeit": Vorbörse, Xetra-Kassa,
// Mittagsflaute, US-Eröffnung — die Performance unterscheidet sich oft
// systematisch zwischen diesen Blöcken.
// ------------------------------------------------------------
export const TIME_BLOCKS = [
  { key: 'pre',     label: 'Vorb\u00f6rse',        from: 8 * 60,       to: 9 * 60 },
  { key: 'open',    label: 'Xetra-Er\u00f6ffnung', from: 9 * 60,       to: 10 * 60 },
  { key: 'morning', label: 'Vormittag',            from: 10 * 60,      to: 13 * 60 },
  { key: 'lunch',   label: 'Mittagsflaute',        from: 13 * 60,      to: 15 * 60 + 30 },
  { key: 'us',      label: 'US-Er\u00f6ffnung',    from: 15 * 60 + 30, to: 17 * 60 + 30 },
  { key: 'late',    label: 'Nachb\u00f6rse',       from: 17 * 60 + 30, to: 22 * 60 }
];

// "17:26:48" -> Minuten seit Mitternacht (1046). Ungültig -> null.
export function timeToMinutes(t) {
  if (t === null || t === undefined) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// ------------------------------------------------------------
// Berechnet die Uhrzeit-Statistik über alle Trades:
// - blocks: pro DAX-Phase { n, wins, losses, winrate, pnl, avg }
// - hours:  pro Stunde (8-21) dasselbe (für das Balken-Profil)
// - noTime: Anzahl Trades ohne Uhrzeit (Alt-Daten, manuelle Einträge)
// ------------------------------------------------------------
export function computeTimeStats(trades) {
  const mkBucket = () => ({ n: 0, wins: 0, losses: 0, pnl: 0 });
  const blocks = TIME_BLOCKS.map(b => Object.assign({ key: b.key, label: b.label, from: b.from, to: b.to }, mkBucket()));
  const hours = {};
  for (let h = 8; h <= 21; h++) hours[h] = mkBucket();
  let noTime = 0;

  (trades || []).forEach(t => {
    const min = timeToMinutes(t.time);
    if (min === null) { noTime++; return; }
    const add = b => {
      b.n++;
      if (t.pnl > 0) b.wins++;
      else if (t.pnl < 0) b.losses++;
      b.pnl += t.pnl;
    };
    const block = blocks.find(b => min >= b.from && min < b.to);
    if (block) add(block);
    const h = Math.floor(min / 60);
    if (hours[h]) add(hours[h]);
  });

  const finalize = b => {
    b.pnl = +b.pnl.toFixed(2);
    b.winrate = (b.wins + b.losses) > 0 ? +((b.wins / (b.wins + b.losses)) * 100).toFixed(1) : null;
    b.avg = b.n > 0 ? +(b.pnl / b.n).toFixed(2) : 0;
    return b;
  };
  blocks.forEach(finalize);
  Object.values(hours).forEach(finalize);
  return { blocks, hours, noTime };
}
