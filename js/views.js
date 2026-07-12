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

// Erkennt die Handelsrichtung aus der Produkt-Beschreibung.
// "DAX Short ... Turbo" / "... Put ..." -> 'short'
// "DAX Long ... Turbo"  / "... Call ..." -> 'long'
// Alles andere (Aktien, manuelle Korrekturen) -> 'neutral'
export function tradeDirection(desc) {
  const d = String(desc || '').toLowerCase();
  if (/\bshort\b/.test(d) || /\bput\b/.test(d)) return 'short';
  if (/\blong\b/.test(d) || /\bcall\b/.test(d)) return 'long';
  return 'neutral';
}

// ------------------------------------------------------------
// Berechnet die Uhrzeit-Statistik über alle Trades.
// mode: 'sell' = nach Ausstieg (Realisierung), 'buy' = nach Einstieg
//       (Entscheidung). 'buy' nutzt buyTime/buyDate, falls vorhanden.
// - blocks: pro DAX-Phase { n, wins, losses, winrate, pnl, avg, long, short }
// - hours:  pro Stunde (8-21) dasselbe (für das Balken-Profil)
// - noTime: Anzahl Trades ohne passende Uhrzeit
// - overnight: Trades mit Kaufdatum != Verkaufsdatum (eigene "Strategie")
// ------------------------------------------------------------
export function computeTimeStats(trades, mode = 'sell') {
  const mkDir = () => ({ n: 0, wins: 0, losses: 0, pnl: 0 });
  const mkBucket = () => ({ n: 0, wins: 0, losses: 0, pnl: 0, long: mkDir(), short: mkDir(), trades: [] });
  const blocks = TIME_BLOCKS.map(b => Object.assign({ key: b.key, label: b.label, from: b.from, to: b.to }, mkBucket()));
  const hours = {};
  for (let h = 8; h <= 21; h++) hours[h] = mkBucket();
  let noTime = 0;
  const overnight = mkBucket();

  (trades || []).forEach(t => {
    const isOvernight = !!(t.buyDate && t.date && t.buyDate !== t.date);
    const dir = tradeDirection(t.desc);
    const addTo = d => {
      d.n++;
      if (t.pnl > 0) d.wins++;
      else if (t.pnl < 0) d.losses++;
      d.pnl += t.pnl;
    };
    const add = b => {
      addTo(b);
      if (b.trades) b.trades.push(t);
      if (dir === 'long') addTo(b.long);
      else if (dir === 'short') addTo(b.short);
    };
    if (isOvernight) add(overnight);

    const timeField = mode === 'buy' ? t.buyTime : t.time;
    const min = timeToMinutes(timeField);
    if (min === null) { noTime++; return; }
    const block = blocks.find(b => min >= b.from && min < b.to);
    if (block) add(block);
    const h = Math.floor(min / 60);
    if (hours[h]) add(hours[h]);
  });

  const finalizeDir = b => {
    b.pnl = +b.pnl.toFixed(2);
    b.winrate = (b.wins + b.losses) > 0 ? +((b.wins / (b.wins + b.losses)) * 100).toFixed(1) : null;
    b.avg = b.n > 0 ? +(b.pnl / b.n).toFixed(2) : 0;
    return b;
  };
  const finalize = b => {
    finalizeDir(b);
    finalizeDir(b.long);
    finalizeDir(b.short);
    return b;
  };
  blocks.forEach(finalize);
  Object.values(hours).forEach(finalize);
  finalize(overnight);
  return { blocks, hours, noTime, overnight };
}

// ------------------------------------------------------------
// Analyse-Erkenntnisse: berechnet die "Schulterklopfer" aus den Daten.
// Liefert strukturierte Befunde; die Textdarstellung macht app.js.
// Alle Regeln greifen erst ab Mindest-Stichprobe (statistische Relevanz).
// ------------------------------------------------------------
export function computeInsights(trades) {
  const withBuy = (trades || []).filter(t => t.buyTime && t.buyDate);
  const mk = () => ({ n: 0, wins: 0, losses: 0, pnl: 0 });
  const addTo = (d, t) => {
    d.n++;
    if (t.pnl > 0) d.wins++;
    else if (t.pnl < 0) d.losses++;
    d.pnl += t.pnl;
  };
  const fin = d => {
    d.pnl = +d.pnl.toFixed(2);
    d.winrate = (d.wins + d.losses) > 0 ? +((d.wins / (d.wins + d.losses)) * 100).toFixed(1) : null;
    return d;
  };

  // --- Overnight-Zerlegung nach Einstiegs-Stunde ---
  const overnight = withBuy.filter(t => t.buyDate !== t.date);
  const onTotal = mk();
  const onByHour = {};
  // Kategorien: frueh (<11h), haengengeblieben (11-19h), geplant (>=19h)
  const onEarly = mk(), onStuck = mk(), onPlanned = mk();
  overnight.forEach(t => {
    addTo(onTotal, t);
    const h = parseInt(t.buyTime.split(':')[0], 10);
    if (!onByHour[h]) onByHour[h] = mk();
    addTo(onByHour[h], t);
    if (h < 11) addTo(onEarly, t);
    else if (h < 19) addTo(onStuck, t);
    else addTo(onPlanned, t);
  });
  fin(onTotal); fin(onEarly); fin(onStuck); fin(onPlanned);
  Object.values(onByHour).forEach(fin);

  // --- Einstiegs-Phasen (fuer beste/schlechteste Phase) ---
  const phase = mk; // reuse
  const byPhase = TIME_BLOCKS.map(b => Object.assign({ key: b.key, label: b.label }, mk()));
  withBuy.forEach(t => {
    const min = timeToMinutes(t.buyTime);
    if (min === null) return;
    const b = byPhase.find(p => {
      const tb = TIME_BLOCKS.find(x => x.key === p.key);
      return min >= tb.from && min < tb.to;
    });
    if (b) addTo(b, t);
  });
  byPhase.forEach(fin);

  // --- Long/Short gesamt ---
  const longAll = mk(), shortAll = mk();
  (trades || []).forEach(t => {
    const d = tradeDirection(t.desc);
    if (d === 'long') addTo(longAll, t);
    else if (d === 'short') addTo(shortAll, t);
  });
  fin(longAll); fin(shortAll);

  // --- Teuerste Stunde-Richtung-Kombination (nach Ausstieg) ---
  const hourDir = {};
  (trades || []).forEach(t => {
    const min = timeToMinutes(t.time);
    const d = tradeDirection(t.desc);
    if (min === null || d === 'neutral') return;
    const key = Math.floor(min / 60) + '|' + d;
    if (!hourDir[key]) hourDir[key] = mk();
    addTo(hourDir[key], t);
  });
  Object.values(hourDir).forEach(fin);
  let worstCombo = null;
  Object.entries(hourDir).forEach(([key, v]) => {
    if (v.n >= 5 && v.pnl < 0 && (!worstCombo || v.pnl < worstCombo.pnl)) {
      const [h, dir] = key.split('|');
      worstCombo = { hour: +h, dir, n: v.n, pnl: v.pnl, winrate: v.winrate };
    }
  });

  // --- Befunde zusammenstellen (nur bei ausreichender Stichprobe) ---
  const findings = [];
  const MIN_N = 8;
  if (onStuck.n >= MIN_N && onStuck.pnl < 0) {
    findings.push({ kind: 'warn', id: 'overnight-stuck', data: { stuck: onStuck, planned: onPlanned, total: onTotal } });
  } else if (onTotal.n >= MIN_N && onTotal.pnl < 0) {
    findings.push({ kind: 'warn', id: 'overnight-neg', data: { total: onTotal } });
  }
  if (onPlanned.n >= MIN_N && onPlanned.pnl > 0) {
    findings.push({ kind: 'good', id: 'overnight-planned', data: { planned: onPlanned } });
  }
  const eligible = byPhase.filter(p => p.n >= MIN_N);
  if (eligible.length >= 2) {
    const best = eligible.slice().sort((a, b) => b.pnl - a.pnl)[0];
    const worst = eligible.slice().sort((a, b) => a.pnl - b.pnl)[0];
    if (best.pnl > 0) findings.push({ kind: 'good', id: 'best-phase', data: best });
    if (worst.pnl < 0 && worst.key !== best.key) findings.push({ kind: 'warn', id: 'worst-phase', data: worst });
  }
  if (longAll.n >= MIN_N && shortAll.n >= MIN_N && Math.abs(longAll.pnl - shortAll.pnl) > Math.abs(longAll.pnl + shortAll.pnl) * 0.25) {
    findings.push({ kind: 'info', id: 'direction-bias', data: { long: longAll, short: shortAll } });
  }
  if (worstCombo) {
    findings.push({ kind: 'warn', id: 'worst-hour-dir', data: worstCombo });
  }

  return { findings, overnight: { total: onTotal, early: onEarly, stuck: onStuck, planned: onPlanned, byHour: onByHour } };
}

// ------------------------------------------------------------
// Diagnostiziert einen (roten) Stunden-Bucket: WARUM ist er negativ?
// Prueft: Ausreisser-Dominanz (Top-2-Verluste), Overnight-Anteil,
// Richtungs-Schieflage. Liefert strukturierte Diagnose fuer die Anzeige.
// ------------------------------------------------------------
export function diagnoseBucket(bucketTrades) {
  const losses = (bucketTrades || []).filter(t => t.pnl < 0).sort((a, b) => a.pnl - b.pnl);
  if (losses.length === 0) return null;
  const lossSum = losses.reduce((s, t) => s + t.pnl, 0);
  const top2 = losses.slice(0, 2).reduce((s, t) => s + t.pnl, 0);
  const onLosses = losses.filter(t => t.buyDate && t.date && t.buyDate !== t.date);
  const onSum = onLosses.reduce((s, t) => s + t.pnl, 0);
  const longSum = losses.filter(t => tradeDirection(t.desc) === 'long').reduce((s, t) => s + t.pnl, 0);
  const shortSum = losses.filter(t => tradeDirection(t.desc) === 'short').reduce((s, t) => s + t.pnl, 0);

  const outlierShare = Math.abs(top2) / Math.abs(lossSum);
  const overnightShare = Math.abs(onSum) / Math.abs(lossSum);
  const tags = [];
  if (outlierShare >= 0.7) tags.push('outlier');
  if (overnightShare >= 0.6) tags.push('overnight');
  if (tags.length === 0 && losses.length >= 5) tags.push('systematic');
  let dirSkew = null;
  if (Math.abs(shortSum) >= Math.abs(lossSum) * 0.75) dirSkew = 'short';
  else if (Math.abs(longSum) >= Math.abs(lossSum) * 0.75) dirSkew = 'long';

  return {
    lossCount: losses.length,
    lossSum: +lossSum.toFixed(2),
    top2: +top2.toFixed(2),
    outlierShare: +(outlierShare * 100).toFixed(0),
    overnightCount: onLosses.length,
    overnightShare: +(overnightShare * 100).toFixed(0),
    dirSkew,
    tags
  };
}
