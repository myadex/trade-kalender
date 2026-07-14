// ============================================================
// views.js — Aggregations- und Statistik-Logik (pure functions)
// ============================================================
// Diese Funktionen RECHNEN nur — sie schreiben nichts ins DOM.
// Das DOM-Rendering bleibt in app.js (dünne Wrapper, die diese
// Ergebnisse in die Tabellen/Karten schreiben). So bleibt die
// Logik testbar ohne Browser.

// ------------------------------------------------------------
// Bestimmt die ISO-Kalenderwoche eines YYYY-MM-DD-Schluessels. Die Rechnung
// nutzt ausschliesslich UTC-Komponenten als neutrale Kalenderarithmetik. So
// kann weder die lokale Zeitzone noch die Sommerzeit einen Tag verschieben.
// ------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDateKey(date) {
  return String(date.getUTCFullYear()).padStart(4, '0') + '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(date.getUTCDate()).padStart(2, '0');
}

function displayDate(date) {
  return String(date.getUTCDate()).padStart(2, '0') + '.' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '.' +
    String(date.getUTCFullYear()).padStart(4, '0');
}

function utcDateFromKey(dateKey) {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day) return null;
  return date;
}

export function isoWeekInfo(dateKey) {
  const date = utcDateFromKey(dateKey);
  if (!date) return null;

  // ISO: Montag = 0, Sonntag = 6. Das ISO-Wochenjahr gehoert zum
  // Donnerstag der Woche; dadurch wird der Jahreswechsel korrekt behandelt.
  const weekday = (date.getUTCDay() + 6) % 7;
  const monday = new Date(date.getTime() - weekday * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const thursday = new Date(monday.getTime() + 3 * DAY_MS);
  const isoYear = thursday.getUTCFullYear();

  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
  const januaryFourthWeekday = (januaryFourth.getUTCDay() + 6) % 7;
  const firstMonday = new Date(januaryFourth.getTime() - januaryFourthWeekday * DAY_MS);
  const isoWeek = Math.round((monday.getTime() - firstMonday.getTime()) / (7 * DAY_MS)) + 1;
  const from = utcDateKey(monday);
  const to = utcDateKey(sunday);

  return {
    isoWeek,
    isoYear,
    from,
    to,
    label: 'KW ' + String(isoWeek).padStart(2, '0') + ' \u00b7 ' +
      displayDate(monday) + '\u2013' + displayDate(sunday)
  };
}

// ------------------------------------------------------------
// Aggregiert die Tages-Map zu ISO-Wochen (Montag bis Sonntag). Der bisherige
// week-Schluessel bleibt als Wochen-Montag erhalten; neue Ansichten bekommen
// zusaetzlich ISO-Jahr, KW-Nummer, Zeitraum und das fertige Anzeigelabel.
// Neueste Kalenderwoche zuerst.
// ------------------------------------------------------------
export function aggregateWeeks(dm) {
  const weeks = {};
  Object.entries(dm).forEach(([k, v]) => {
    const info = isoWeekInfo(k);
    if (!info) return;
    if (!weeks[info.from]) weeks[info.from] = Object.assign({ pnl: 0, rev: 0, n: 0 }, info);
    weeks[info.from].pnl += v.pnl;
    weeks[info.from].rev += v.rev;
    weeks[info.from].n += v.n;
  });
  return Object.entries(weeks)
    .sort((a, b) => b[0].localeCompare(a[0]))
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
// Baut die Equity-Kurve aus geschlossenen Trades pro Handelstag auf.
// Drawdown ist der Abstand zum bis dahin hoechsten Tagesendstand. Absolute
// Werte funktionieren immer; Prozentwerte brauchen bewusst ein Startkapital,
// weil ohne Bezugswert keine ehrliche Drawdown-Quote existiert.
// ------------------------------------------------------------
export function computeEquityCurve(trades, initialCapital = 0) {
  const parsedCapital = Number(initialCapital);
  const capital = Number.isFinite(parsedCapital) && parsedCapital > 0 ? parsedCapital : 0;
  const dailyPnl = {};

  (trades || []).forEach(trade => {
    const date = String(trade && trade.date || '').slice(0, 10);
    const pnl = Number(trade && trade.pnl);
    if (!utcDateFromKey(date) || !Number.isFinite(pnl)) return;
    dailyPnl[date] = (dailyPnl[date] || 0) + pnl;
  });

  const dates = Object.keys(dailyPnl).sort((a, b) => a.localeCompare(b));
  const roundMoney = value => +value.toFixed(2);
  const dayDistance = (from, to) => {
    const a = utcDateFromKey(from);
    const b = utcDateFromKey(to);
    return a && b ? Math.round((b.getTime() - a.getTime()) / DAY_MS) : 0;
  };

  let cumulativePnl = 0;
  let peakPnl = 0;
  let peakDate = dates[0] || null;
  let activeDrawdownStart = null;
  let maxDrawdown = 0;
  let maxDrawdownPct = capital > 0 ? 0 : null;
  let maxDrawdownStart = null;
  let maxDrawdownDate = null;
  let longestDrawdownDays = 0;
  const points = [];

  dates.forEach(date => {
    const dayPnl = roundMoney(dailyPnl[date]);
    cumulativePnl = roundMoney(cumulativePnl + dayPnl);

    if (cumulativePnl >= peakPnl) {
      if (activeDrawdownStart) {
        longestDrawdownDays = Math.max(longestDrawdownDays,
          dayDistance(activeDrawdownStart, date));
      }
      peakPnl = cumulativePnl;
      peakDate = date;
      activeDrawdownStart = null;
    } else if (!activeDrawdownStart) {
      activeDrawdownStart = peakDate || date;
    }

    const drawdown = roundMoney(peakPnl - cumulativePnl);
    const peakEquity = roundMoney(capital + peakPnl);
    const drawdownPct = capital > 0 && peakEquity > 0
      ? (drawdown / peakEquity) * 100
      : null;
    const drawdownDays = drawdown > 0 && activeDrawdownStart
      ? dayDistance(activeDrawdownStart, date)
      : 0;
    longestDrawdownDays = Math.max(longestDrawdownDays, drawdownDays);

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPct = drawdownPct;
      maxDrawdownStart = activeDrawdownStart;
      maxDrawdownDate = date;
    }

    points.push({
      date,
      dayPnl,
      cumulativePnl,
      equity: roundMoney(capital + cumulativePnl),
      peakEquity,
      drawdown,
      drawdownPct,
      drawdownDays
    });
  });

  const last = points[points.length - 1] || null;
  return {
    points,
    initialCapital: capital,
    netPnl: roundMoney(cumulativePnl),
    currentEquity: last ? last.equity : capital,
    highWaterMark: roundMoney(capital + peakPnl),
    currentDrawdown: last ? last.drawdown : 0,
    currentDrawdownPct: last ? last.drawdownPct : (capital > 0 ? 0 : null),
    currentDrawdownDays: last ? last.drawdownDays : 0,
    maxDrawdown,
    maxDrawdownPct,
    maxDrawdownStart,
    maxDrawdownDate,
    longestDrawdownDays
  };
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
// Vergleicht Long/Call und Short/Put nach Wochentag. Standard ist der
// Einstiegstag, weil dort die Handelsentscheidung getroffen wurde. Alt- und
// manuelle Trades ohne buyDate werden nicht stillschweigend dem Ausstiegstag
// zugeschlagen, sondern als fehlend ausgewiesen.
// ------------------------------------------------------------
export function computeWeekdayStats(trades, mode = 'buy', minSample = 8) {
  const selectedMode = mode === 'sell' ? 'sell' : 'buy';
  const parsedMinSample = Math.floor(Number(minSample));
  const threshold = Number.isFinite(parsedMinSample) && parsedMinSample > 0
    ? parsedMinSample
    : 8;
  const labels = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const keys = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const makeBucket = () => ({
    n: 0, wins: 0, losses: 0, pnl: 0,
    grossProfit: 0, grossLoss: 0, values: []
  });
  const days = labels.map((label, index) => ({
    index,
    key: keys[index],
    label,
    long: makeBucket(),
    short: makeBucket(),
    comparison: null
  }));
  const excluded = { neutral: 0, missingDate: 0, weekend: 0, invalidPnl: 0 };

  (trades || []).forEach(trade => {
    const direction = tradeDirection(trade && trade.desc);
    if (direction === 'neutral') { excluded.neutral++; return; }

    const dateKey = selectedMode === 'buy' ? trade && trade.buyDate : trade && trade.date;
    const date = utcDateFromKey(String(dateKey || '').slice(0, 10));
    if (!date) { excluded.missingDate++; return; }
    const utcDay = date.getUTCDay();
    if (utcDay === 0 || utcDay === 6) { excluded.weekend++; return; }

    const pnl = Number(trade && trade.pnl);
    if (!Number.isFinite(pnl)) { excluded.invalidPnl++; return; }
    const bucket = days[utcDay - 1][direction];
    bucket.n++;
    bucket.pnl += pnl;
    bucket.values.push(pnl);
    if (pnl > 0) {
      bucket.wins++;
      bucket.grossProfit += pnl;
    } else if (pnl < 0) {
      bucket.losses++;
      bucket.grossLoss += Math.abs(pnl);
    }
  });

  const finalize = bucket => {
    const values = bucket.values.slice().sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    const medianValue = values.length === 0
      ? null
      : (values.length % 2
        ? values[middle]
        : (values[middle - 1] + values[middle]) / 2);
    const decided = bucket.wins + bucket.losses;
    const profitFactor = bucket.grossLoss > 0
      ? bucket.grossProfit / bucket.grossLoss
      : (bucket.grossProfit > 0 ? Infinity : null);
    return {
      n: bucket.n,
      wins: bucket.wins,
      losses: bucket.losses,
      pnl: +bucket.pnl.toFixed(2),
      avg: bucket.n > 0 ? +(bucket.pnl / bucket.n).toFixed(2) : 0,
      median: medianValue === null ? null : +medianValue.toFixed(2),
      winrate: decided > 0 ? +((bucket.wins / decided) * 100).toFixed(1) : null,
      profitFactor: profitFactor === null || profitFactor === Infinity
        ? profitFactor
        : +profitFactor.toFixed(2),
      significant: bucket.n >= threshold
    };
  };

  days.forEach(day => {
    day.long = finalize(day.long);
    day.short = finalize(day.short);
    if (!day.long.significant || !day.short.significant) return;
    const difference = +(day.long.avg - day.short.avg).toFixed(2);
    day.comparison = {
      winner: difference > 0 ? 'long' : (difference < 0 ? 'short' : 'tie'),
      edge: +Math.abs(difference).toFixed(2)
    };
  });

  return {
    mode: selectedMode,
    minSample: threshold,
    days,
    excluded,
    included: days.reduce((sum, day) => sum + day.long.n + day.short.n, 0)
  };
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

  // Haltedauer-Asymmetrie (Dispositionseffekt): Verlierer laenger gehalten?
  // Bewusst auf die JUENGSTE Periode (45 Tage) bezogen — der Gesamt-Median
  // versteckt aktuelle Verhaltensmuster hinter der langen Historie.
  const allDates = (trades || []).map(t => t.date).filter(Boolean).sort();
  if (allDates.length) {
    const newest = allDates[allDates.length - 1];
    const [ny, nm, nd] = newest.split('-').map(Number);
    const cutoff = new Date(ny, nm - 1, nd - 45);
    const cutoffStr = cutoff.getFullYear() + '-' + String(cutoff.getMonth() + 1).padStart(2, '0') + '-' + String(cutoff.getDate()).padStart(2, '0');
    const recent = (trades || []).filter(t => t.date >= cutoffStr);
    const holdRecent = computeHoldStats(recent);
    if (holdRecent.winN >= 8 && holdRecent.lossN >= 5 && holdRecent.ratio !== null && holdRecent.ratio >= 2) {
      findings.push({ kind: 'warn', id: 'hold-asymmetry', data: Object.assign({ since: cutoffStr }, holdRecent) });
    }
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

// ------------------------------------------------------------
// Haltedauer eines Trades in Minuten (Einstieg -> Ausstieg).
// Braucht buyDate/buyTime und date/time. Sonst null.
// ------------------------------------------------------------
export function holdMinutes(t) {
  if (!t.buyDate || !t.buyTime || !t.date || !t.time) return null;
  const p = (ds, ts) => {
    const [y, m, d] = ds.split('-').map(Number);
    const mins = timeToMinutes(ts);
    if (!y || mins === null) return null;
    return new Date(y, m - 1, d).getTime() / 60000 + mins;
  };
  const a = p(t.buyDate, t.buyTime), b = p(t.date, t.time);
  if (a === null || b === null) return null;
  const diff = b - a;
  return diff >= 0 ? Math.round(diff) : null;
}

// Median einer Zahlenliste (leer -> null)
function median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

// ------------------------------------------------------------
// Haltedauer-Asymmetrie: halten Verlierer laenger als Gewinner?
// (Der messbare Kern des Dispositionseffekts.)
// ------------------------------------------------------------
export function computeHoldStats(trades) {
  const winHolds = [], lossHolds = [];
  (trades || []).forEach(t => {
    const h = holdMinutes(t);
    if (h === null) return;
    if (t.pnl > 0) winHolds.push(h);
    else if (t.pnl < 0) lossHolds.push(h);
  });
  return {
    winMedian: median(winHolds),
    lossMedian: median(lossHolds),
    winN: winHolds.length,
    lossN: lossHolds.length,
    ratio: (median(winHolds) && median(lossHolds)) ? +(median(lossHolds) / median(winHolds)).toFixed(1) : null
  };
}

// ------------------------------------------------------------
// Disziplin-Trend pro Monat: die Kernmetriken, an denen sich
// Verbesserung ablesen laesst. Sortiert aufsteigend nach Monat.
// bigLossLimit = Schwelle fuer "Grossverlust" (Default 1000 Euro).
// ------------------------------------------------------------
export function computeMonthlyDiscipline(trades, bigLossLimit = 1000) {
  const byMonth = {};
  (trades || []).forEach(t => {
    const mo = (t.date || '').slice(0, 7);
    if (mo.length !== 7) return;
    if (!byMonth[mo]) byMonth[mo] = [];
    byMonth[mo].push(t);
  });
  return Object.keys(byMonth).sort().map(mo => {
    const ts = byMonth[mo];
    const wins = ts.filter(t => t.pnl > 0), losses = ts.filter(t => t.pnl < 0);
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
    const overnight = ts.filter(t => t.buyDate && t.buyDate !== t.date);
    const bigLosses = losses.filter(t => t.pnl <= -bigLossLimit);
    const winH = [], lossH = [];
    ts.forEach(t => {
      const h = holdMinutes(t);
      if (h === null) return;
      if (t.pnl > 0) winH.push(h);
      else if (t.pnl < 0) lossH.push(h);
    });
    return {
      month: mo,
      n: ts.length,
      pnl: +ts.reduce((s, t) => s + t.pnl, 0).toFixed(2),
      avgLoss: +avgLoss.toFixed(2),
      overnightPnl: +overnight.reduce((s, t) => s + t.pnl, 0).toFixed(2),
      overnightN: overnight.length,
      bigLossN: bigLosses.length,
      bigLossSum: +bigLosses.reduce((s, t) => s + t.pnl, 0).toFixed(2),
      payoff: avgLoss !== 0 ? +(avgWin / Math.abs(avgLoss)).toFixed(2) : null,
      holdWinMedian: median(winH),
      holdLossMedian: median(lossH)
    };
  });
}
