'use strict';

// ============================================================
// app.js — Haupt-Einstiegspunkt (verbindet alle Module)
// ============================================================
import { CLIENT_ID, SCOPE, TAX_RATE, APP_VERSION } from './config.js';
import { $, fmtDE, fmtPlain, fmtK, setStatus, toLocalDateStr, escapeHtml } from './helpers.js';
import { dayMap, deriveOpenPositions, fifoMatch, replayImportLedger, closePositionPnl, tradePnl } from './fifo.js';
import { findDataFile, downloadData, createData, updateData, createWriteQueue } from './storage.js';
import { aggregateWeeks, aggregateMonths, computeStats, computeTimeStats, computeInsights, diagnoseBucket, computeMonthlyDiscipline } from './views.js';
import { parseScalableCsv, markDuplicates, mergeImportRows } from './import.js';

/* ============================================================
   STATE
   ============================================================ */
let tokenClient = null;
let accessToken = null;
let driveFileId = null;          // id of trade-kalender.json in Drive
const emptyData = () => ({ trades: [], openLots: [], capital: 0, importRows: [], importBaseOpenLots: null });
let DATA = emptyData();
let pendingImport = [];
let pendingOpenLots = [];
let pendingImportRows = null;
let pendingImportBaseOpenLots = null;
const enqueuePersist = createWriteQueue();
let currentDetailDate = null;
// Aktuell angezeigter Monat im Kalender (Jahr + Monat 0-11). Standard: aktueller Monat.
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

/* ============================================================
   GOOGLE AUTH (Google Identity Services, token flow)
   ============================================================ */
function initAuth() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error) {
        setStatus('Login fehlgeschlagen: ' + resp.error, true);
        return;
      }
      accessToken = resp.access_token;
      onSignedIn();
    }
  });
  $('btn-login').style.display = 'inline-block';
}

function signIn() {
  if (!tokenClient) { setStatus('Auth noch nicht bereit, bitte neu laden.', true); return; }
  tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
}

function signOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  driveFileId = null;
  DATA = emptyData();
  $('app-main').style.display = 'none';
  $('login-screen').style.display = 'flex';
  $('btn-logout').style.display = 'none';
}

async function onSignedIn() {
  $('login-screen').style.display = 'none';
  $('app-main').style.display = 'block';
  $('btn-logout').style.display = 'inline-block';
  setStatus('Lade Daten aus Google Drive \u2026');
  try {
    await loadFromDrive();
    setStatus('');
    rebuildAll();
  } catch (e) {
    setStatus('Fehler beim Laden: ' + e.message, true);
  }
}

/* ============================================================
   GOOGLE DRIVE DATA LAYER
   ============================================================ */
// Die reine Drive-Kommunikation lebt jetzt in storage.js (zustandslos).
// Hier bleiben nur die Funktionen, die den App-Zustand (accessToken,
// driveFileId, DATA) mit diesen API-Aufrufen verbinden.

async function loadFromDrive() {
  driveFileId = await findDataFile(accessToken);
  if (!driveFileId) {
    // Noch keine Datei vorhanden — leere anlegen
    DATA = emptyData();
    driveFileId = await createData(accessToken, DATA);
    return;
  }
  DATA = await downloadData(accessToken, driveFileId);
}

async function saveToDrive(isCreate, data = DATA) {
  if (!driveFileId || isCreate) {
    driveFileId = await createData(accessToken, data);
  } else {
    await updateData(accessToken, driveFileId, data);
  }
}

function persist() {
  // Jede Aktion speichert ihren eigenen Zustandsschnappschuss. Ohne Snapshot
  // koennte eine spaetere Mutation waehrend eines laufenden Requests in den
  // falschen Schreibauftrag gelangen.
  const snapshot = JSON.parse(JSON.stringify(DATA));
  return enqueuePersist(async () => {
    setStatus('Speichere in Google Drive \u2026');
    try {
      await saveToDrive(false, snapshot);
      setStatus('');
    } catch (e) {
      setStatus('Speichern fehlgeschlagen: ' + e.message, true);
    }
  });
}

/* ============================================================
   DERIVED VIEWS
   ============================================================ */
function tradesByDate(date) { return DATA.trades.filter(t => t.date === date); }

// dayMap und deriveOpenPositions kommen jetzt aus fifo.js (pure functions).
// Dünne Wrapper reichen die globale DATA durch, damit der restliche Code
// unverändert dayMapDATA()/openPositionsDATA() nutzen kann.
function dayMapDATA() { return dayMap(DATA.trades); }
function openPositionsDATA() { return deriveOpenPositions(DATA.openLots); }

// Alte Daten haben keine Rohzeilen. Der Snapshot offener Lots zu Beginn der
// Migration bleibt deshalb unveraendert die Basis; nur neue Importe werden
// vollstaendig aus ihren Brokerzeilen abgeleitet.
function hasImportLedger() { return Array.isArray(DATA.importBaseOpenLots); }
function cloneLots(lots) { return (lots || []).map(lot => Object.assign({}, lot)); }
function legacyTrades() { return DATA.trades.filter(t => t.source !== 'import'); }

function replayStoredImports(importRows = DATA.importRows, importBaseOpenLots = DATA.importBaseOpenLots) {
  const replay = replayImportLedger(importRows, importBaseOpenLots);
  if (replay.errors.length > 0) {
    throw new Error('Import-Ledger enth\u00e4lt einen Verkauf ohne ausreichende offene Lots.');
  }
  return replay;
}

/* ============================================================
   TABS
   ============================================================ */
function showTab(id) {
  const order = ['calendar', 'weekly', 'monthly', 'open', 'timestats'];
  document.querySelectorAll('.nav-tab').forEach((t, i) => t.classList.toggle('active', order[i] === id));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + id));
}

/* ============================================================
   STATS
   ============================================================ */
function rebuildStats() {
  const s = computeStats(dayMapDATA(), DATA.capital);

  $('hdr-pnl').textContent = fmtDE(s.totalPnl);
  $('hdr-pnl').className = 'total-pnl ' + (s.totalPnl >= 0 ? 'pos' : 'neg');
  $('s-winrate').textContent = s.winrate.toFixed(1).replace('.', ',') + ' %';
  $('s-wins').textContent = s.wins;
  $('s-losses').textContent = s.losses;
  $('s-trades').textContent = s.totalTrades;
  $('s-avgday').textContent = fmtK(s.avgDay);
  $('s-avgtrade').textContent = fmtK(s.avgTrade);
  $('s-streak').textContent = s.maxStreak;
  $('s-tax').textContent = fmtPlain(Math.abs(s.totalTax)) + ' \u20ac';

  const renditeEl = $('s-rendite');
  if (renditeEl) {
    if (s.rendite !== null) {
      renditeEl.textContent = (s.rendite >= 0 ? '+' : '') + s.rendite.toFixed(1).replace('.', ',') + ' %';
      renditeEl.className = 'stat-val ' + (s.rendite >= 0 ? 'pos' : 'neg');
    } else {
      renditeEl.textContent = '\u2014';
      renditeEl.className = 'stat-val';
    }
  }
  const capEl = $('s-capital');
  if (capEl) capEl.textContent = s.capital > 0 ? fmtPlain(s.capital, 0) + ' \u20ac' : '\u2014';
}

/* ============================================================
   CALENDAR (GitHub-style heatmap, full year)
   ============================================================ */
function buildCalendar() {
  const dm = dayMapDATA();
  const container = $('cal-container');
  container.innerHTML = '';

  if (DATA.trades.length === 0) {
    container.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:2rem 0;text-align:center">Noch keine Trades. Importiere deine CSV oder f\u00fcge einen Trade hinzu.</div>';
    return;
  }

  const MON = ['Januar', 'Februar', 'M\u00e4rz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr']; // nur Handelstage

  // Farbskala für dunkles Theme: von dunkler Fläche zu kräftigem Grün/Rot.
  function dayColor(pnl, maxAbs) {
    if (!pnl || pnl === 0) return null;
    const t = Math.min(Math.abs(pnl) / maxAbs, 1);
    if (pnl > 0) {
      // von #0d1a12 (dunkelgrün) zu #22c55e (kräftig)
      const r = Math.round(13 + (34 - 13) * t);
      const g = Math.round(26 + (197 - 26) * t);
      const b = Math.round(18 + (94 - 18) * t);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
      // von #1f1214 (dunkelrot) zu #ef4444 (kräftig)
      const r = Math.round(31 + (239 - 31) * t);
      const g = Math.round(18 + (68 - 18) * t);
      const b = Math.round(20 + (68 - 20) * t);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
  }
  // Auf kräftiger Fläche dunkler Text, auf schwacher heller Text
  function textColor(pnl, maxAbs) {
    if (!pnl) return 'var(--ink)';
    const t = Math.min(Math.abs(pnl) / maxAbs, 1);
    return t > 0.55 ? '#0a0e14' : 'var(--ink)';
  }

  // --- Navigationsleiste (Vor / Monat-Jahr / Zur\u00fcck) ---
  const nav = document.createElement('div');
  nav.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;gap:.5rem;';
  const btnPrev = document.createElement('button');
  btnPrev.textContent = '\u2039';
  btnPrev.style.cssText = 'font-size:1.4rem;line-height:1;background:none;border:1px solid var(--border);border-radius:8px;width:40px;height:40px;cursor:pointer;color:var(--ink);flex-shrink:0;';
  btnPrev.onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } buildCalendar(); };
  const btnNext = document.createElement('button');
  btnNext.textContent = '\u203a';
  btnNext.style.cssText = btnPrev.style.cssText;
  btnNext.onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } buildCalendar(); };
  const title = document.createElement('div');
  title.style.cssText = "font-family:'Chakra Petch',sans-serif;font-size:1.6rem;letter-spacing:.04em;color:var(--ink);text-align:center;flex:1;";
  title.textContent = MON[calMonth] + ' ' + calYear;
  nav.appendChild(btnPrev);
  nav.appendChild(title);
  nav.appendChild(btnNext);
  container.appendChild(nav);

  // --- Monats-Statistik ---
  const prefix = calYear + '-' + String(calMonth + 1).padStart(2, '0');
  const mTrades = DATA.trades.filter(t => t.date.startsWith(prefix));
  const mKeys = Object.keys(dm).filter(k => k.startsWith(prefix));
  const maxAbs = mKeys.length > 0 ? Math.max(...mKeys.map(k => Math.abs(dm[k].pnl)), 1) : 1;
  if (mTrades.length > 0) {
    const mPnl = mTrades.reduce((s, t) => s + t.pnl, 0);
    const mTax = mTrades.reduce((s, t) => s + t.tax, 0);
    const wins = mKeys.filter(k => dm[k].pnl > 0).length;
    const losses = mKeys.filter(k => dm[k].pnl < 0).length;
    const sr = document.createElement('div');
    sr.style.cssText = 'display:flex;gap:1.5rem;margin-bottom:1rem;font-family:"JetBrains Mono",monospace;font-size:.65rem;color:var(--muted);flex-wrap:wrap;';
    const c = mPnl >= 0 ? 'var(--green)' : 'var(--red)';
    sr.innerHTML =
      '<span>P&L: <strong style="color:' + c + '">' + fmtDE(mPnl) + '</strong></span>' +
      '<span>' + mTrades.length + ' Trades</span>' +
      '<span>' + wins + 'W / ' + losses + 'L</span>' +
      '<span>Steuer: ' + fmtPlain(Math.abs(mTax)) + ' \u20ac</span>';
    container.appendChild(sr);
  } else {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:.65rem;color:var(--muted);margin-bottom:1rem;';
    empty.textContent = 'Keine Trades in diesem Monat.';
    container.appendChild(empty);
  }

  // --- Wochentags-Kopfzeile (Mo-Fr) ---
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:6px;';
  DOW.forEach(d => {
    const h = document.createElement('div');
    h.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:.62rem;color:var(--muted);text-align:center;padding-bottom:.2rem;text-transform:uppercase;letter-spacing:.08em;';
    h.textContent = d;
    grid.appendChild(h);
  });

  // --- Tageszellen ---
  const firstOfMonth = new Date(calYear, calMonth, 1);
  // Wochentag des Ersten (0=Mo ... 6=So); Wochenenden überspringen
  const firstDow = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  // Leerzellen vor dem Ersten (nur Mo-Fr-Raster)
  let leading = firstDow <= 4 ? firstDow : 0; // Sa/So am Anfang -> kein Vorlauf nötig
  for (let i = 0; i < leading; i++) {
    const blank = document.createElement('div');
    grid.appendChild(blank);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(calYear, calMonth, day);
    const dow = (date.getDay() + 6) % 7;
    if (dow > 4) continue; // Sa/So überspringen

    const key = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    const data = dm[key] || null;

    const cell = document.createElement('div');
    const bg = data ? (dayColor(data.pnl, maxAbs) || 'var(--paper)') : 'var(--paper)';
    cell.style.cssText =
      'aspect-ratio:1;border:1px solid var(--border);border-radius:8px;padding:.4rem;' +
      'display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;' +
      'background:' + bg + ';min-height:64px;overflow:hidden;';

    const dnum = document.createElement('div');
    dnum.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:.72rem;font-weight:600;color:' + (data ? textColor(data.pnl, maxAbs) : 'var(--ink)') + ';';
    dnum.textContent = String(day).padStart(2, '0') + '.';
    cell.appendChild(dnum);

    if (data) {
      const amt = document.createElement('div');
      const sign = data.pnl >= 0 ? '+' : '';
      amt.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:.7rem;font-weight:700;line-height:1.1;color:' + textColor(data.pnl, maxAbs) + ';';
      amt.textContent = sign + Math.round(data.pnl) + '\u20ac';
      cell.appendChild(amt);
      const cnt = document.createElement('div');
      cnt.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:.52rem;opacity:.7;color:' + textColor(data.pnl, maxAbs) + ';';
      cnt.textContent = data.n + (data.n === 1 ? ' Trade' : ' Trades');
      cell.appendChild(cnt);
      (function (k) { cell.onclick = () => showDetail(k); })(key);
    } else {
      (function (k) { cell.onclick = () => openDetailNew(k); })(key);
    }
    grid.appendChild(cell);
  }

  container.appendChild(grid);
}

/* ============================================================
   WEEKLY
   ============================================================ */
function buildWeekly() {
  const sorted = aggregateWeeks(dayMapDATA());
  const maxAbs = Math.max(...sorted.map(w => Math.abs(w.pnl)), 1);
  const tbody = $('weekly-tbody');
  tbody.innerHTML = '';
  if (sorted.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);padding:1rem">Keine Daten.</td></tr>'; return; }
  sorted.forEach(({ week, pnl, rev, n }) => {
    const end = new Date(week); end.setDate(end.getDate() + 4);
    const lbl = week.slice(8) + '.' + week.slice(5, 7) + '.\u2013' + String(end.getDate()).padStart(2, '0') + '.' + String(end.getMonth() + 1).padStart(2, '0') + '.';
    const pct = Math.round((Math.abs(pnl) / maxAbs) * 100);
    const cls = pnl >= 0 ? 'pos' : 'neg';
    tbody.innerHTML += '<tr><td>' + escapeHtml(lbl) + '</td><td class="r ' + cls + '">' + fmtDE(pnl) + '</td><td class="r">' + fmtPlain(rev, 0) + ' \u20ac</td><td class="r">' + n + '</td><td><div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div></td></tr>';
  });
}

/* ============================================================
   MONTHLY
   ============================================================ */
function buildMonthly() {
  const sorted = aggregateMonths(dayMapDATA());
  const maxAbs = Math.max(...sorted.map(m => Math.abs(m.pnl)), 1);
  const MON = { '01': 'Jan', '02': 'Feb', '03': 'M\u00e4r', '04': 'Apr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dez' };
  const barsWrap = $('monthly-bars-wrap');
  if (sorted.length === 0) { barsWrap.innerHTML = ''; $('monthly-tbody').innerHTML = '<tr><td colspan="4" style="color:var(--muted);padding:1rem">Keine Daten.</td></tr>'; return; }
  let bars = '<div class="monthly-bars">';
  sorted.forEach(({ month, pnl }) => {
    const pct = Math.max(Math.round((Math.abs(pnl) / maxAbs) * 100), 2);
    const cls = pnl >= 0 ? 'pos' : 'neg';
    bars += '<div class="month-bar-col"><div class="month-bar ' + cls + '" style="height:' + pct + '%" title="' + fmtDE(pnl) + '"></div><div class="month-bar-lbl">' + MON[month.slice(5)] + '</div><div class="month-bar-val ' + cls + '">' + fmtK(pnl) + '</div></div>';
  });
  barsWrap.innerHTML = bars + '</div>';
  const tbody = $('monthly-tbody');
  tbody.innerHTML = '';
  sorted.forEach(({ month, pnl, rev, n }) => {
    const cls = pnl >= 0 ? 'pos' : 'neg';
    tbody.innerHTML += '<tr><td>' + escapeHtml(MON[month.slice(5)] + ' ' + month.slice(0, 4)) + '</td><td class="r ' + cls + '">' + fmtDE(pnl) + '</td><td class="r">' + fmtPlain(rev, 0) + ' \u20ac</td><td class="r">' + n + '</td></tr>';
  });
}

/* ============================================================
   OPEN POSITIONS
   ============================================================ */
let closingIsin = null;

function openClosePosModal(isin) {
  closingIsin = isin;
  const lots = DATA.openLots.filter(l => l.isin === isin);
  if (lots.length === 0) { alert('Position nicht gefunden.'); return; }
  const totalShares = lots.reduce((s, l) => s + l.shares, 0);
  const totalCost = lots.reduce((s, l) => s + l.amount, 0);
  $('cp-name').textContent = lots[0].desc;
  $('cp-info').textContent = totalShares.toLocaleString('de-DE') + ' St\u00fcck \u00b7 Einstand ' + fmtPlain(totalCost, 2) + ' \u20ac';
  $('cp-cost').value = totalCost.toFixed(2);
  $('cp-date').value = toLocalDateStr(new Date());
  $('cp-sell').value = '';
  $('cp-tax').value = '';
  delete $('cp-tax').dataset.touched;
  updateClosePreview();
  $('close-pos-overlay').classList.add('open');
}

function closeClosePosModal() {
  $('close-pos-overlay').classList.remove('open');
  closingIsin = null;
}

function setCloseTotalLoss() {
  $('cp-sell').value = '0';
  updateClosePreview();
}

function updateClosePreview() {
  const cost = parseFloat($('cp-cost').value) || 0;
  const sell = parseFloat($('cp-sell').value) || 0;
  const grossPnl = sell - cost; // before tax
  // On a loss: tax refund = loss × tax rate (negative tax). On a gain: tax = gain × rate.
  // Auto-fill the tax field only if the user hasn't manually overridden it.
  const taxField = $('cp-tax');
  if (!taxField.dataset.touched) {
    const autoTax = +(grossPnl * TAX_RATE).toFixed(2); // negative if loss → refund
    taxField.value = autoTax.toFixed(2);
  }
  const tax = parseFloat(taxField.value) || 0;
  const pnl = sell - cost - tax;
  const el = $('cp-preview');
  el.textContent = 'P&L: ' + fmtDE(pnl) + (tax < 0 ? '  (inkl. ' + fmtPlain(Math.abs(tax)) + ' \u20ac Steuererstattung)' : '');
  el.className = 'pnl-preview ' + (pnl >= 0 ? 'pos' : 'neg');
}

function onCloseTaxInput() {
  $('cp-tax').dataset.touched = '1';
  updateClosePreview();
}

async function confirmClosePos() {
  if (!closingIsin) return;
  const lots = DATA.openLots.filter(l => l.isin === closingIsin);
  if (lots.length === 0) { alert('Position nicht gefunden.'); return; }
  const date = $('cp-date').value;
  const sell = parseFloat($('cp-sell').value);
  const tax = parseFloat($('cp-tax').value) || 0;
  if (!date || isNaN(sell)) { alert('Bitte Datum und Verkaufswert eingeben (0 f\u00fcr Totalverlust).'); return; }
  const totalShares = lots.reduce((s, l) => s + l.shares, 0);
  const totalCost = lots.reduce((s, l) => s + l.amount, 0);
  const desc = lots[0].desc;
  if (hasImportLedger()) {
    // Nach der Migration muss auch ein manueller Schluss im Roh-Ledger landen.
    // Sonst wuerde der naechste Replay den bereits geschlossenen Restbestand
    // wieder als offen ableiten.
    const nextRows = mergeImportRows(DATA.importRows, [{
      type: 'Sell', status: 'Executed', isin: closingIsin,
      shares: +totalShares.toFixed(3), amount: +sell.toFixed(2), tax: +tax.toFixed(2),
      date, time: '', description: desc
    }]);
    let replay;
    try {
      replay = replayStoredImports(nextRows);
    } catch (e) {
      alert('Position konnte nicht geschlossen werden: ' + e.message);
      return;
    }
    DATA.importRows = nextRows;
    DATA.trades = legacyTrades().concat(replay.trades);
    DATA.openLots = replay.openLots;
    await persist();
    closeClosePosModal();
    rebuildAll();
    return;
  }
  const pnl = +(sell - totalCost - tax).toFixed(2);
  const base = closingIsin + '_' + date + '_' + sell.toFixed(2) + '_' + totalShares.toFixed(3);
  const uid = DATA.trades.some(t => t.uid === base) ? base + '_' + Date.now() : base;
  DATA.trades.push({
    uid, date, isin: closingIsin, desc, broker: 'scalable',
    shares: +totalShares.toFixed(3), buy: +totalCost.toFixed(2),
    sell: +sell.toFixed(2), tax: +tax.toFixed(2), pnl
  });
  // remove all lots of this isin from openLots
  DATA.openLots = DATA.openLots.filter(l => l.isin !== closingIsin);
  await persist();
  closeClosePosModal();
  rebuildAll();
}

function buildOpenPositions() {
  const wrap = $('open-pos-wrap');
  wrap.innerHTML = '';
  const positions = openPositionsDATA();
  if (positions.length === 0) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.82rem;padding:1rem 0">Keine offenen Positionen.</div>';
    return;
  }
  positions.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'open-pos-card';
    card.innerHTML =
      '<div><div class="op-name">' + escapeHtml(p.desc) + '</div>' +
      '<div class="op-isin">' + escapeHtml(p.isin) + '</div>' +
      '<div class="op-badge">' + escapeHtml(p.dir) + ' \u00b7 offen seit ' + escapeHtml(p.since) + '</div></div>' +
      '<div class="op-nums">' +
      '<div><div class="op-num-lbl">St\u00fcck</div><div class="op-num-val">' + p.shares.toLocaleString('de-DE') + '</div></div>' +
      '<div><div class="op-num-lbl">\u00d8 Preis</div><div class="op-num-val">' + fmtPlain(p.avgPrice, 4) + '</div></div>' +
      '<div><div class="op-num-lbl">Lots</div><div class="op-num-val">' + p.lots + '</div></div>' +
      '<div><div class="op-num-lbl">Einstand</div><div class="op-num-val">' + fmtPlain(p.cost, 0) + ' \u20ac</div></div>' +
      '</div>' +
      '<div class="op-btns">' +
      '<button class="btn-close-pos" data-isin="' + escapeHtml(p.isin) + '">Schlie\u00dfen</button>' +
      '<button class="btn-del-pos" data-isin="' + escapeHtml(p.isin) + '" title="Position l\u00f6schen (ohne P&L-Buchung)">\u2715</button>' +
      '</div>';
    card.querySelector('.btn-close-pos').onclick = () => openClosePosModal(p.isin);
    card.querySelector('.btn-del-pos').onclick = () => deleteOpenPosition(p.isin);
    wrap.appendChild(card);
  });
}

// Löscht eine offene Position komplett (alle Lots der ISIN) — OHNE
// P&L-Buchung und ohne Steuer. Für Rest-Lots, Import-Artefakte oder
// Positionen, die nicht getrackt werden sollen. Mit Sicherheitsabfrage.
async function deleteOpenPosition(isin) {
  if (hasImportLedger()) {
    alert('Offene Positionen ohne P&L-Buchung lassen sich nach dem Ledger-Start nicht l\u00f6schen. Bitte die Position schlie\u00dfen oder die zugrundeliegende CSV korrigieren.');
    return;
  }
  const lots = DATA.openLots.filter(l => l.isin === isin);
  if (lots.length === 0) return;
  const shares = lots.reduce((s, l) => s + l.shares, 0);
  const cost = lots.reduce((s, l) => s + Math.abs(l.amount), 0);
  const desc = lots[0].description || isin;
  if (!confirm('Offene Position l\u00f6schen?\n\n' + desc + '\n' + isin + '\n' +
    shares.toLocaleString('de-DE') + ' St\u00fcck, Einstand ' + fmtPlain(cost, 2) + ' \u20ac\n\n' +
    'Die Position wird OHNE P&L-Buchung entfernt (kein Gewinn/Verlust, keine Steuer). ' +
    'Kann nicht r\u00fcckg\u00e4ngig gemacht werden.')) return;
  DATA.openLots = DATA.openLots.filter(l => l.isin !== isin);
  await persist();
  rebuildAll();
}

/* ============================================================
   UHRZEIT-STATISTIK (DAX-Handelsphasen)
   ============================================================ */
function fmtMin(m) {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

let tsMode = 'sell'; // 'sell' = nach Ausstieg, 'buy' = nach Einstieg

function setTsMode(mode) {
  tsMode = mode;
  $('ts-mode-sell').classList.toggle('active', mode === 'sell');
  $('ts-mode-buy').classList.toggle('active', mode === 'buy');
  buildTimeStats();
}

function buildTimeStats() {
  const { blocks, hours, noTime, overnight } = computeTimeStats(DATA.trades, tsMode);

  // Hinweis auf Trades ohne (passende) Uhrzeit
  const note = $('ts-note');
  if (noTime > 0) {
    note.className = 'ts-note';
    note.textContent = noTime + ' Trade' + (noTime !== 1 ? 's' : '') + ' ohne ' +
      (tsMode === 'buy' ? 'Einstiegszeit (Alt-Daten, manuelle Eintr\u00e4ge)' : 'Uhrzeit (Alt-Daten oder manuell)') +
      ' \u2014 nicht in der Statistik enthalten.';
    note.style.display = 'block';
  } else {
    note.style.display = 'none';
  }

  // Overnight-Trades: eigene "Strategie", separat ausgewiesen
  const onEl = $('ts-overnight');
  if (overnight.n > 0) {
    const col = overnight.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    onEl.className = 'ts-on';
    onEl.innerHTML = '<b>\u00dcber Nacht gehalten:</b> ' + overnight.n + ' Trades \u00b7 Trefferquote ' +
      (overnight.winrate === null ? '\u2014' : overnight.winrate.toFixed(1).replace('.', ',') + ' %') +
      ' \u00b7 P&L <span style="color:' + col + '">' + fmtDE(overnight.pnl) + '</span>' +
      ' \u00b7 Long ' + overnight.long.n + ' / Short ' + overnight.short.n +
      ' \u2014 diese Trades stecken auch in den Phasen unten (' + (tsMode === 'buy' ? 'nach Einstiegszeit' : 'nach Ausstiegszeit') + ' einsortiert).';
    onEl.style.display = 'block';
  } else {
    onEl.style.display = 'none';
    onEl.innerHTML = '';
  }

  // Phasen-Karten
  const wrap = $('ts-blocks');
  wrap.innerHTML = '';
  const withData = blocks.filter(b => b.n > 0);
  if (withData.length === 0) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.82rem;padding:1rem 0">Noch keine Trades mit Uhrzeit. Importiere eine CSV \u2014 die Verkaufszeit wird dann automatisch erfasst.</div>';
    $('ts-hours').innerHTML = '';
    return;
  }
  blocks.forEach(b => {
    const div = document.createElement('div');
    div.className = 'ts-block';
    const wrCls = b.winrate === null ? '' : (b.winrate >= 50 ? 'style="color:var(--green)"' : 'style="color:var(--red)"');
    const pnlCls = b.pnl >= 0 ? 'style="color:var(--green)"' : 'style="color:var(--red)"';
    const dirLine = (d, name) => {
      if (d.n === 0) return '<span style="color:var(--muted)">' + name + ': \u2014</span>';
      const col = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
      const wr = d.winrate === null ? '\u2014' : d.winrate.toFixed(0) + '%';
      return '<span>' + name + ': <b>' + d.n + '</b> \u00b7 ' + wr + ' \u00b7 <span style="color:' + col + '">' + fmtK(d.pnl) + '</span></span>';
    };
    div.innerHTML =
      '<div class="ts-block-label"><div class="ts-block-name">' + b.label + '</div>' +
      '<div class="ts-block-range">' + fmtMin(b.from) + '\u2013' + fmtMin(b.to) + ' Uhr</div></div>' +
      '<div class="ts-block-stats">' +
      '<div class="ts-stat"><div class="ts-stat-lbl">Trades</div><div class="ts-stat-val">' + b.n + '</div></div>' +
      '<div class="ts-stat"><div class="ts-stat-lbl">Trefferquote</div><div class="ts-stat-val" ' + wrCls + '>' + (b.winrate === null ? '\u2014' : b.winrate.toFixed(1).replace('.', ',') + ' %') + '</div></div>' +
      '<div class="ts-stat"><div class="ts-stat-lbl">P&L</div><div class="ts-stat-val" ' + pnlCls + '>' + fmtDE(b.pnl) + '</div></div>' +
      '<div class="ts-stat"><div class="ts-stat-lbl">\u00d8/Trade</div><div class="ts-stat-val">' + fmtDE(b.avg) + '</div></div>' +
      '</div>' +
      '<div class="ts-dir-row">' + dirLine(b.long, 'Long') + dirLine(b.short, 'Short') + '</div>';
    wrap.appendChild(div);
  });

  // Stunden-Profil (Balken, skaliert am stärksten |P&L|)
  const hw = $('ts-hours');
  hw.innerHTML = '';
  const hourKeys = Object.keys(hours).map(Number).sort((a, b) => a - b);
  const maxAbs = Math.max(...hourKeys.map(h => Math.abs(hours[h].pnl)), 1);
  hourKeys.forEach(h => {
    const b = hours[h];
    if (b.n === 0) return;
    const pct = Math.max(Math.round((Math.abs(b.pnl) / maxAbs) * 100), 2);
    const col = b.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    const row = document.createElement('div');
    row.className = 'ts-hour-row';
    row.innerHTML =
      '<div class="ts-hour-lbl">' + String(h).padStart(2, '0') + '\u2013' + String(h + 1).padStart(2, '0') + '</div>' +
      '<div class="ts-hour-track"><div class="ts-hour-fill" style="width:' + pct + '%;background:' + col + '"></div></div>' +
      '<div class="ts-hour-val" style="color:' + col + '">' + fmtDE(b.pnl) + ' \u00b7 ' + b.n + ' T \u00b7 ' + (b.winrate === null ? '\u2014' : b.winrate.toFixed(0) + '%') + '</div>';
    hw.appendChild(row);
    // Long/Short-Detailzeile unter dem Balken
    if (b.long.n > 0 || b.short.n > 0) {
      const dirPart = (d, name) => {
        if (d.n === 0) return name + ': \u2014';
        const c = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
        const wr = d.winrate === null ? '\u2014' : d.winrate.toFixed(0) + '%';
        return name + ': ' + d.n + ' \u00b7 ' + wr + ' \u00b7 <span style="color:' + c + '">' + fmtK(d.pnl) + '</span>';
      };
      const sub = document.createElement('div');
      sub.className = 'ts-hour-dir';
      sub.innerHTML = dirPart(b.long, 'Long') + '&nbsp;&nbsp;&nbsp;&nbsp;' + dirPart(b.short, 'Short');
      hw.appendChild(sub);
    }
    // Automatische Diagnose fuer rote Stunden: WARUM ist sie negativ?
    if (b.pnl < 0) {
      const diag = diagnoseBucket(b.trades);
      if (diag) {
        const dEl = document.createElement('div');
        dEl.className = 'ts-hour-diag';
        dEl.innerHTML = '\u2192 ' + diagText(diag);
        hw.appendChild(dEl);
      }
    }
  });

  buildInsights();
}

// Diagnose-Befund in Klartext. Unterscheidet "Ausreisser/Overnight-Grabstaette"
// von systematisch schlechten Stunden — das ist der Kern der Analyse.
function diagText(d) {
  const parts = [];
  if (d.tags.includes('outlier')) {
    parts.push(d.outlierShare + '% der Verluste aus nur ' + Math.min(2, d.lossCount) + ' Trade' + (d.lossCount > 1 ? 's' : '') + ' (' + fmtK(d.top2) + ')');
  }
  if (d.tags.includes('overnight')) {
    parts.push(d.overnightCount + ' Overnight-Verlust' + (d.overnightCount !== 1 ? 'e' : '') + ' = ' + d.overnightShare + '% der Verlustsumme');
  }
  if (d.tags.includes('systematic')) {
    parts.push('systematisch: ' + d.lossCount + ' Verluste ohne dominanten Ausreisser');
  }
  if (d.dirSkew) {
    parts.push('fast nur ' + (d.dirSkew === 'short' ? 'Short' : 'Long') + '-Verluste');
  }
  let verdict;
  if (d.tags.includes('systematic')) {
    verdict = 'echtes Stunden-Problem';
  } else if (d.tags.includes('overnight')) {
    verdict = 'kein Stunden-Problem, sondern Endstation h\u00e4ngengebliebener Positionen';
  } else if (d.tags.includes('outlier')) {
    verdict = 'Einzelfall-getrieben, kein Muster';
  } else {
    verdict = 'gemischtes Bild';
  }
  return 'Diagnose: ' + parts.join(' \u00b7 ') + ' \u2014 ' + verdict + '.';
}

/* ============================================================
   AUTO-ERKENNTNISSE + OVERNIGHT-ANALYSE
   ============================================================ */
function buildInsights() {
  const { findings, overnight } = computeInsights(DATA.trades);
  const wrap = $('ts-insights');
  wrap.innerHTML = '';

  const money = v => '<span style="color:' + (v >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmtDE(v) + '</span>';
  const wr = d => d.winrate === null ? '\u2014' : d.winrate.toFixed(0) + '%';
  const hasStuck = findings.some(f => f.id === 'overnight-stuck');

  const texts = {
    'overnight-stuck': d =>
      'Tages-Positionen \u00fcber Nacht zu halten kostet dich am meisten: <b>' + d.stuck.n + ' Trades</b> mit Einstieg 11\u201319 Uhr, \u00fcber Nacht gehalten = ' + money(d.stuck.pnl) +
      ' (Trefferquote ' + wr(d.stuck) + '). Geplante Abend-Einstiege ab 19 Uhr dagegen: ' + money(d.planned.pnl) + ' bei ' + wr(d.planned) + ' \u2014 Regel: Was bis Handelsschluss nicht aufgeht, wird geschlossen.',
    'overnight-neg': d =>
      '\u00dcbernacht-Positionen sind in Summe negativ: ' + d.total.n + ' Trades = ' + money(d.total.pnl) + ' trotz ' + wr(d.total) + ' Trefferquote.',
    'overnight-planned': d =>
      'Geplante Abend-Overnights (Einstieg ab 19 Uhr) sind ein Edge: <b>' + d.planned.n + ' Trades</b>, ' + wr(d.planned) + ' Trefferquote, ' + money(d.planned.pnl) + '.',
    'best-phase': d =>
      'St\u00e4rkste Einstiegs-Phase: <b>' + d.label + '</b> \u2014 ' + d.n + ' Trades, ' + wr(d) + ' Trefferquote, ' + money(d.pnl) + '.',
    'worst-phase': d =>
      'Schw\u00e4chste Einstiegs-Phase: <b>' + d.label + '</b> \u2014 ' + d.n + ' Trades, ' + wr(d) + ' Trefferquote, ' + money(d.pnl) + '.',
    'direction-bias': d => {
      const stronger = d.long.pnl >= d.short.pnl ? 'Long' : 'Short';
      const s = stronger === 'Long' ? d.long : d.short, w = stronger === 'Long' ? d.short : d.long;
      const wName = stronger === 'Long' ? 'Short' : 'Long';
      return '<b>' + stronger + '</b> ist deine st\u00e4rkere Seite: ' + s.n + ' Trades, ' + wr(s) + ', ' + money(s.pnl) +
        ' \u2014 ' + wName + ': ' + w.n + ' Trades, ' + wr(w) + ', ' + money(w.pnl) + '.';
    },
    'hold-asymmetry': d =>
      'FOMO-Check (seit ' + d.since.slice(8) + '.' + d.since.slice(5, 7) + '.): Du h\u00e4ltst Verlierer <b>' + d.ratio + '\u00d7 l\u00e4nger</b> als Gewinner (Median ' + fmtHold(d.lossMedian) + ' vs. ' + fmtHold(d.winMedian) + ') \u2014 Verluste aussitzen statt schlie\u00dfen. Dispositionseffekt.',
    'worst-hour-dir': d =>
      'Teuerste Kombination: <b>' + (d.dir === 'short' ? 'Short' : 'Long') + '-Ausstiege ' + String(d.hour).padStart(2, '0') + '\u2013' + String(d.hour + 1).padStart(2, '0') + ' Uhr</b> \u2014 ' +
      d.n + ' Trades = ' + money(d.pnl) + ' bei ' + wr(d) + ' Trefferquote.'
  };
  const marks = { warn: '\u26a0', good: '\u2713', info: '\u2139' };

  findings.forEach(f => {
    if (f.id === 'overnight-planned' && hasStuck) return; // steckt schon im stuck-Text
    const gen = texts[f.id];
    if (!gen) return;
    const div = document.createElement('div');
    div.className = 'ts-ins-item ' + f.kind;
    div.innerHTML = '<span class="mark">' + marks[f.kind] + '</span><span>' + gen(f.data) + '</span>';
    wrap.appendChild(div);
  });
  if (wrap.children.length === 0) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.75rem;">Noch zu wenige Daten f\u00fcr belastbare Erkenntnisse.</div>';
  }

  // Overnight-Kategorien-Tabelle
  const det = $('ts-on-detail');
  const cats = [
    ['Fr\u00fch (Einstieg vor 11 Uhr)', overnight.early],
    ['Tags\u00fcber (11\u201319 Uhr) \u2014 "h\u00e4ngengeblieben"', overnight.stuck],
    ['Abend (ab 19 Uhr) \u2014 geplant', overnight.planned],
    ['Gesamt', overnight.total]
  ];
  if (overnight.total.n === 0) {
    det.innerHTML = '<div style="color:var(--muted);font-size:.75rem;">Keine Overnight-Trades (oder Einstiegszeiten fehlen).</div>';
    return;
  }
  let html = '<table class="ts-on-table"><tr><th>Kategorie</th><th style="text-align:right">Trades</th><th style="text-align:right">Trefferquote</th><th style="text-align:right">P&L</th></tr>';
  cats.forEach(([label, d]) => {
    const col = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    html += '<tr><td>' + label + '</td><td class="r">' + d.n + '</td><td class="r">' + wr(d) + '</td><td class="r" style="color:' + col + '">' + fmtDE(d.pnl) + '</td></tr>';
  });
  det.innerHTML = html + '</table>';

  buildDiscipline();
}

// Haltedauer huebsch formatieren: 37min, 2h49, 1,3d
function fmtHold(m) {
  if (m === null || m === undefined) return '\u2014';
  if (m >= 1440) return (m / 1440).toFixed(1).replace('.', ',') + 'd';
  if (m >= 60) return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0');
  return m + 'min';
}

/* ============================================================
   DISZIPLIN-TREND PRO MONAT ("Werde ich besser?")
   ============================================================ */
function buildDiscipline() {
  const el = $('ts-discipline');
  if (!el) return;
  const months = computeMonthlyDiscipline(DATA.trades);
  if (months.length === 0) { el.innerHTML = ''; return; }
  const money = v => '<span style="color:' + (v >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmtK(v) + '</span>';
  const MON = { '01': 'Jan', '02': 'Feb', '03': 'M\u00e4r', '04': 'Apr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dez' };
  let html = '<table class="ts-on-table"><tr><th>Monat</th><th style="text-align:right">Trades</th><th style="text-align:right">P&L</th><th style="text-align:right">\u00d8-Verlust</th><th style="text-align:right">Overnight</th><th style="text-align:right">Verluste &gt;1k</th><th style="text-align:right">Payoff</th><th style="text-align:right">Haltezeit V/G</th></tr>';
  months.forEach(m => {
    const bigCol = m.bigLossN > 0 ? 'var(--red)' : 'var(--muted)';
    const payoffCol = m.payoff === null ? 'var(--muted)' : (m.payoff >= 1 ? 'var(--green)' : 'var(--amber)');
    html += '<tr><td>' + escapeHtml(MON[m.month.slice(5)] + ' ' + m.month.slice(2, 4)) + '</td>' +
      '<td class="r">' + m.n + '</td>' +
      '<td class="r">' + money(m.pnl) + '</td>' +
      '<td class="r" style="color:var(--muted)">' + (m.avgLoss ? fmtK(m.avgLoss) : '\u2014') + '</td>' +
      '<td class="r">' + (m.overnightN ? money(m.overnightPnl) : '\u2014') + '</td>' +
      '<td class="r" style="color:' + bigCol + '">' + m.bigLossN + (m.bigLossN ? ' (' + fmtK(m.bigLossSum) + ')' : '') + '</td>' +
      '<td class="r" style="color:' + payoffCol + '">' + (m.payoff === null ? '\u2014' : String(m.payoff).replace('.', ',')) + '</td>' +
      '<td class="r" style="color:var(--muted)">' + fmtHold(m.holdLossMedian) + ' / ' + fmtHold(m.holdWinMedian) + '</td></tr>';
  });
  el.innerHTML = html + '</table>' +
    '<div style="font-family:\'JetBrains Mono\',monospace;font-size:.55rem;color:var(--muted);margin-top:.4rem;">Payoff = \u00d8-Gewinn \u00f7 \u00d8-Verlust (\u22651 gut) \u00b7 Haltezeit V/G = Median Verlierer / Gewinner (V \u226b G = Dispositionseffekt)</div>';
}

/* ============================================================
   DAY DETAIL PANEL
   ============================================================ */
function showDetail(key) {
  currentDetailDate = key;
  const trades = tradesByDate(key);
  const dm = dayMapDATA();
  const v = dm[key] || { pnl: 0, rev: 0, tax: 0, n: 0 };
  const p = key.split('-');
  $('detail-date').textContent = p[2] + '.' + p[1] + '.' + p[0];
  $('detail-summary').textContent = v.n + ' Trades \u00b7 ' + fmtPlain(v.rev, 0) + ' \u20ac Umsatz \u00b7 ' + fmtPlain(Math.abs(v.tax), 2) + ' \u20ac Steuer';
  const ph = $('detail-pnl-hdr');
  ph.textContent = fmtDE(v.pnl);
  ph.style.color = v.pnl >= 0 ? 'var(--green)' : 'var(--red)';
  const c = $('detail-trades');
  c.innerHTML = '';
  trades.forEach(t => {
    const pnlCls = t.pnl >= 0 ? 'pos' : 'neg';
    const bl = t.broker === 'tr' ? 'TR' : 'SC';
    const bc = t.broker === 'tr' ? 'broker-tr' : 'broker-scalable';
    const uid = t.uid || '';
    const row = document.createElement('div');
    row.className = 'trade-row';
    row.innerHTML = '<div class="trade-left">' +
      '<div class="trade-desc">' + escapeHtml(t.desc) + ' <span class="broker-tag ' + bc + '">' + bl + '</span></div>' +
      '<div class="trade-meta">' +
      '<span>Kauf: ' + fmtPlain(t.buy) + ' \u20ac</span>' +
      '<span>Verkauf: ' + fmtPlain(t.sell) + ' \u20ac</span>' +
      '<span>Steuer: ' + fmtPlain(t.tax) + ' \u20ac</span>' +
      '</div></div>' +
      '<div class="trade-right">' +
      '<div class="trade-pnl ' + pnlCls + '">' + fmtDE(t.pnl) + '</div>' +
      '<button class="btn-edit" title="Bearbeiten">\u270e</button>' +
      '<button class="btn-del" title="L\u00f6schen">\u2715</button>' +
      '</div>';
    row.querySelector('.btn-edit').onclick = () => openEditModal(uid);
    row.querySelector('.btn-del').onclick = () => deleteTrade(uid, key);
    c.appendChild(row);
  });
  $('add-day-btn').style.display = 'flex';
  $('detail-overlay').classList.add('open');
}

function openDetailNew(key) {
  currentDetailDate = key;
  const p = key.split('-');
  $('detail-date').textContent = p[2] + '.' + p[1] + '.' + p[0];
  $('detail-summary').textContent = 'Noch keine Trades';
  $('detail-pnl-hdr').textContent = '';
  $('detail-trades').innerHTML = '<div style="color:var(--muted);font-size:.7rem;padding:.5rem 0">Kein Trade f\u00fcr diesen Tag.</div>';
  $('add-day-btn').style.display = 'flex';
  $('detail-overlay').classList.add('open');
}

function closeDetail() { $('detail-overlay').classList.remove('open'); currentDetailDate = null; }

async function deleteTrade(uid, date) {
  if (!uid) { alert('Kein UID \u2014 Trade kann nicht gel\u00f6scht werden.'); return; }
  if (!confirm('Trade l\u00f6schen?')) return;
  const trade = DATA.trades.find(t => t.uid === uid);
  if (!trade) { alert('Trade nicht gefunden.'); return; }
  if (trade.source === 'import') {
    if (!trade.sourceRowId) { alert('Import-Quelle fehlt \u2014 Trade kann nicht sicher gel\u00f6scht werden.'); return; }
    const nextRows = DATA.importRows.filter(row => row.sourceRowId !== trade.sourceRowId);
    let replay;
    try {
      replay = replayStoredImports(nextRows);
    } catch (e) {
      alert('L\u00f6schen abgebrochen: ' + e.message);
      return;
    }
    DATA.importRows = nextRows;
    DATA.trades = legacyTrades().concat(replay.trades);
    DATA.openLots = replay.openLots;
  } else {
    DATA.trades = DATA.trades.filter(t => t.uid !== uid);
    recomputeOpenLots();
  }
  await persist();
  rebuildAll();
  const rem = tradesByDate(date);
  if (rem.length > 0) showDetail(date); else closeDetail();
}

/* ============================================================
   ADD / EDIT TRADE
   ============================================================ */
function openAddModalForDate() {
  if (currentDetailDate) $('f-date').value = currentDetailDate;
  closeDetail();
  openAddModal();
}

function openAddModal() {
  if (!$('f-date').value) $('f-date').value = toLocalDateStr(new Date());
  $('f-desc').value = ''; $('f-shares').value = ''; $('f-buy').value = ''; $('f-sell').value = ''; $('f-tax').value = '';
  updatePnlPreview();
  $('add-overlay').classList.add('open');
}
function closeAddModal() { $('add-overlay').classList.remove('open'); }

function updatePnlPreview() {
  const buy = parseFloat($('f-buy').value) || 0;
  const sell = parseFloat($('f-sell').value) || 0;
  const tax = parseFloat($('f-tax').value) || 0;
  const pnl = sell - buy - tax;
  const el = $('pnl-preview');
  el.textContent = 'P&L: ' + fmtDE(pnl);
  el.className = 'pnl-preview ' + (pnl >= 0 ? 'pos' : 'neg');
}

async function saveTrade() {
  const date = $('f-date').value;
  const desc = $('f-desc').value.trim();
  const broker = $('f-broker').value;
  const shares = parseFloat($('f-shares').value) || 0;
  const buy = parseFloat($('f-buy').value) || 0;
  const sell = parseFloat($('f-sell').value) || 0;
  const tax = parseFloat($('f-tax').value) || 0;
  if (!date || !desc || !buy || !sell) { alert('Bitte Datum, Produkt, Kauf- und Verkaufsbetrag ausf\u00fcllen.'); return; }
  const pnl = parseFloat((sell - buy - tax).toFixed(2));
  const base = 'manual_' + date + '_' + sell.toFixed(2) + '_' + shares.toFixed(3);
  const uid = DATA.trades.some(t => t.uid === base) ? base + '_' + Date.now() : base;
  DATA.trades.push({ uid, date, isin: '', desc, broker, shares, buy: +buy.toFixed(2), sell: +sell.toFixed(2), tax: +tax.toFixed(2), pnl });
  await persist();
  closeAddModal();
  rebuildAll();
  setTimeout(() => showDetail(date), 50);
}

function openEditModal(uid) {
  const t = DATA.trades.find(x => x.uid === uid);
  if (!t) { alert('Trade nicht gefunden.'); return; }
  if (t.source === 'import') {
    alert('Importierte Trades werden aus ihren Rohzeilen abgeleitet. Bitte den Verkauf l\u00f6schen und die korrigierte CSV erneut importieren.');
    return;
  }
  $('e-uid').value = uid;
  $('e-date').value = t.date;
  $('e-desc').value = t.desc;
  $('e-broker').value = t.broker || 'scalable';
  $('e-shares').value = t.shares || '';
  $('e-buy').value = t.buy;
  $('e-sell').value = t.sell;
  $('e-tax').value = t.tax;
  updateEditPreview();
  $('edit-overlay').classList.add('open');
}
function closeEditModal() { $('edit-overlay').classList.remove('open'); }

function updateEditPreview() {
  const buy = parseFloat($('e-buy').value) || 0;
  const sell = parseFloat($('e-sell').value) || 0;
  const tax = parseFloat($('e-tax').value) || 0;
  const pnl = sell - buy - tax;
  const el = $('edit-pnl-preview');
  el.textContent = 'P&L: ' + fmtDE(pnl);
  el.className = 'pnl-preview ' + (pnl >= 0 ? 'pos' : 'neg');
}

async function saveEdit() {
  const uid = $('e-uid').value;
  const idx = DATA.trades.findIndex(x => x.uid === uid);
  if (idx === -1) { alert('Trade nicht gefunden.'); return; }
  const buy = parseFloat($('e-buy').value) || 0;
  const sell = parseFloat($('e-sell').value) || 0;
  const tax = parseFloat($('e-tax').value) || 0;
  const desc = $('e-desc').value.trim();
  const broker = $('e-broker').value;
  const shares = parseFloat($('e-shares').value) || 0;
  if (!desc || !buy || !sell) { alert('Bitte Produkt, Kauf- und Verkaufsbetrag ausf\u00fcllen.'); return; }
  const pnl = +(sell - buy - tax).toFixed(2);
  const date = $('e-date').value;
  DATA.trades[idx] = Object.assign({}, DATA.trades[idx], { date, desc, broker, shares, buy: +buy.toFixed(2), sell: +sell.toFixed(2), tax: +tax.toFixed(2), pnl });
  await persist();
  closeEditModal();
  rebuildAll();
  setTimeout(() => showDetail(date), 50);
}

/* ============================================================
   CSV IMPORT (FIFO, Buy-before-Sell tiebreak, UID dedup)
   ============================================================ */
function openImportModal() {
  pendingImport = []; pendingOpenLots = []; pendingImportRows = null; pendingImportBaseOpenLots = null;
  $('import-tbody').innerHTML = '';
  $('import-preview').style.display = 'none';
  $('import-summary').style.display = 'none';
  $('import-confirm-btn').style.display = 'none';
  $('drop-zone').style.display = 'block';
  $('import-overlay').classList.add('open');
}
function closeImportModal() { $('import-overlay').classList.remove('open'); }
function handleDragOver(e) { e.preventDefault(); $('drop-zone').classList.add('dragover'); }
function handleDragLeave() { $('drop-zone').classList.remove('dragover'); }
function handleDrop(e) { e.preventDefault(); $('drop-zone').classList.remove('dragover'); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }
function handleFileSelect(file) {
  if (!file) return;
  // Dateityp-Check: CSV
  if (!/\.csv$/i.test(file.name)) {
    importError('Bitte eine .csv-Datei ausw\u00e4hlen (Scalable Capital Export).');
    return;
  }
  const r = new FileReader();
  r.onerror = () => importError('Datei konnte nicht gelesen werden.');
  r.onload = e => {
    try {
      parseImport(e.target.result);
    } catch (err) {
      importError('Import fehlgeschlagen: ' + (err && err.message ? err.message : 'unbekannter Fehler'));
    }
  };
  r.readAsText(file, 'utf-8');
}

function importError(msg) {
  const sumEl = $('import-summary');
  if (sumEl) {
    sumEl.textContent = msg;
    sumEl.className = 'import-summary warn';
    sumEl.style.display = 'block';
  }
  const dz = $('drop-zone');
  if (dz) dz.style.display = 'block';
  const prev = $('import-preview');
  if (prev) prev.style.display = 'none';
  const btn = $('import-confirm-btn');
  if (btn) btn.style.display = 'none';
}

function parseImport(text) {
  // Parsen + Validieren passiert in import.js (pure). Hier nur Fehleranzeige + Rendering.
  const result = parseScalableCsv(text);
  if (result.error) { importError(result.error); return; }
  const filtered = result.rows;
  const importBaseOpenLots = hasImportLedger() ? cloneLots(DATA.importBaseOpenLots) : cloneLots(DATA.openLots);
  const importRows = mergeImportRows(DATA.importRows, filtered);
  const newImportRowCount = importRows.length - DATA.importRows.length;

  // FIFO-Matching über die zentrale Funktion aus fifo.js (keine Duplizierung).
  // Knockout-Filter aus: ausgeknockte Positionen bleiben offen und können
  // manuell geschlossen werden.
  const { trades: closed, openLots, errors } = replayImportLedger(importRows, importBaseOpenLots);
  if (errors.length > 0) {
    const first = errors[0];
    importError(
      'Import abgebrochen: Verkauf ' + first.requestedShares + ' St\u00fcck (' + first.isin +
      ') am ' + first.date + ' hat nur ' + first.availableShares + ' offene St\u00fcck. ' +
      'Bitte CSV oder offene Positionen pr\u00fcfen.'
    );
    return;
  }
  // Ein erster Ledger-Import darf keine alte Historie nochmals uebernehmen:
  // deren Rohzeilen fehlen, daher waere ein Mix aus Legacy und Replay falsch.
  const legacyUids = new Set(legacyTrades().map(t => t.uid));
  if (!hasImportLedger() && closed.some(t => legacyUids.has(t.uid))) {
    importError('Dieser CSV-Export enth\u00e4lt bereits historische Trades. Bitte f\u00fcr den ersten Ledger-Import nur neue Brokerzeilen verwenden.');
    return;
  }
  pendingOpenLots = openLots;
  pendingImportRows = importRows;
  pendingImportBaseOpenLots = importBaseOpenLots;

  const { marked, newCount, dupCount } = markDuplicates(closed, new Set(DATA.trades.map(t => t.uid)));
  pendingImport = marked;

  const tbody = $('import-tbody');
  tbody.innerHTML = '';
  pendingImport.slice(0, 40).forEach(t => {
    const cls = t.isDup ? 'dup' : '';
    const col = t.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    const tr = document.createElement('tr');
    tr.className = cls;
    tr.innerHTML = '<td>' + escapeHtml(t.date) + '</td>' +
      '<td style="font-size:.65rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(t.desc) + '</td>' +
      '<td class="r">' + t.shares + '</td>' +
      '<td class="r">' + fmtPlain(t.buy, 0) + '</td>' +
      '<td class="r">' + fmtPlain(t.sell, 0) + '</td>' +
      '<td class="r" style="color:' + col + '">' + fmtDE(t.pnl) + '</td>' +
      '<td>' + (t.isDup ? 'Vorhanden' : 'Neu') + '</td>';
    tbody.appendChild(tr);
  });
  if (pendingImport.length > 40) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" style="color:var(--muted);font-size:.65rem;padding:.3rem .5rem">\u2026 und ' + (pendingImport.length - 40) + ' weitere</td>';
    tbody.appendChild(tr);
  }

  $('import-preview').style.display = 'block';
  $('drop-zone').style.display = 'none';
  const sumEl = $('import-summary');
  sumEl.textContent = newCount + ' neue Trades' +
    (dupCount ? ', ' + dupCount + ' bereits vorhanden' : '') +
    (newImportRowCount > 0 && newCount === 0 ? ', ' + newImportRowCount + ' neue Brokerzeile(n) f\u00fcr offene Positionen' : '') + '.';
  sumEl.className = 'import-summary' + (newImportRowCount === 0 ? ' warn' : '');
  sumEl.style.display = 'block';
  if (newImportRowCount > 0) {
    const btn = $('import-confirm-btn');
    btn.style.display = 'inline-block';
    btn.textContent = newCount > 0
      ? newCount + ' Trade' + (newCount !== 1 ? 's' : '') + ' importieren'
      : newImportRowCount + ' Brokerzeile' + (newImportRowCount !== 1 ? 'n' : '') + ' importieren';
  }
}

async function confirmImport() {
  if (!pendingImportRows || !pendingImportBaseOpenLots) return;
  const importedTrades = pendingImport.map(t => {
    const o = Object.assign({}, t);
    delete o.isDup;
    return o;
  });
  DATA.importRows = pendingImportRows;
  DATA.importBaseOpenLots = pendingImportBaseOpenLots;
  DATA.trades = legacyTrades().concat(importedTrades);
  DATA.openLots = pendingOpenLots;
  await persist();
  closeImportModal();
  rebuildAll();
}

/* ============================================================
   RECOMPUTE OPEN LOTS (after manual delete/edit, full replay)
   ============================================================ */
function recomputeOpenLots() {
  // Replay all closed trades is not possible (we only store sells), so
  // open lots are managed by import. Manual deletes of imported sells would
  // theoretically free shares, but since we cannot reconstruct buy rows here,
  // we leave openLots as-is. Open lots are authoritative from the last import.
  // (Manual trades have no isin and don't affect open lots.)
}

/* ============================================================
   EXPORT CSV
   ============================================================ */
async function resetAllData() {
  if (!confirm('Wirklich ALLE Trades l\u00f6schen? Die Datei in Google Drive wird geleert (alles auf 0). Kann nicht r\u00fcckg\u00e4ngig gemacht werden.')) return;
  DATA = emptyData();
  await persist();
  rebuildAll();
  alert('Alle Daten gel\u00f6scht. Du kannst jetzt neu importieren.');
}

function openRestoreJson() {
  $('json-input').value = '';
  $('json-input').click();
}

async function handleJsonRestore(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    let parsed;
    try {
      parsed = JSON.parse(e.target.result);
    } catch (err) {
      alert('Datei ist kein g\u00fcltiges JSON.');
      return;
    }
    if (!parsed || !Array.isArray(parsed.trades)) {
      alert('Die Datei enth\u00e4lt kein g\u00fcltiges trades-Array.');
      return;
    }
    const n = parsed.trades.length;
    if (!confirm(n + ' Trades aus der Datei \u00fcbernehmen und in Google Drive speichern? Die aktuellen Daten werden ersetzt.')) return;
    DATA = {
      trades: parsed.trades,
      openLots: Array.isArray(parsed.openLots) ? parsed.openLots : [],
      capital: typeof parsed.capital === 'number' ? parsed.capital : 0,
      importRows: Array.isArray(parsed.importRows) ? parsed.importRows : [],
      importBaseOpenLots: Array.isArray(parsed.importBaseOpenLots) ? parsed.importBaseOpenLots : null
    };
    await persist();
    rebuildAll();
    alert(n + ' Trades erfolgreich wiederhergestellt und in Drive gespeichert.');
  };
  reader.readAsText(file);
}

function exportCSV() {
  const rows = ['UID;Datum;Zeit;ISIN;Produkt;Broker;Kauf;Verkauf;Steuer;P&L'];
  DATA.trades.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    rows.push([t.uid || '', t.date, t.time || '', t.isin || '', t.desc, t.broker || '', t.buy, t.sell, t.tax, t.pnl].join(';'));
  });
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trade-kalender-' + toLocalDateStr(new Date()) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   REBUILD
   ============================================================ */
function mobileTab(id) {
  showTab(id);
  document.querySelectorAll('#bottom-bar button[data-tab]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === id);
  });
  closeMobileActions();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileActions() {
  $('mobile-actions').classList.toggle('open');
}
function closeMobileActions() {
  $('mobile-actions').classList.remove('open');
}

async function setCapital() {
  const cur = DATA.capital || 0;
  const input = prompt('Einstand / Startkapital in Euro eingeben:', cur > 0 ? String(cur) : '');
  if (input === null) return;
  const val = parseFloat(String(input).replace(/\\./g, '').replace(',', '.')) || 0;
  if (val < 0) { alert('Bitte einen positiven Betrag eingeben.'); return; }
  DATA.capital = val;
  await persist();
  rebuildStats();
}

function rebuildAll() {
  rebuildStats();
  buildCalendar();
  buildWeekly();
  buildMonthly();
  buildOpenPositions();
  buildTimeStats();
}

/* ============================================================
   BOOT
   ============================================================ */
function bootApp() {
  // Versionsnummer im Header anzeigen
  const vEl = $('app-version');
  if (vEl) vEl.textContent = APP_VERSION;
  const lvEl = $('login-version');
  if (lvEl) lvEl.textContent = 'Version ' + APP_VERSION;
  // Wire up buttons
  $('btn-login').onclick = signIn;
  $('btn-logout').onclick = signOut;
  $('btn-add').onclick = openAddModal;
  $('btn-import').onclick = openImportModal;
  $('btn-export').onclick = exportCSV;
  $('btn-reset').onclick = resetAllData;
  const btnRestore = $('btn-restore');
  if (btnRestore) btnRestore.onclick = openRestoreJson;
  const jsonInput = $('json-input');
  if (jsonInput) jsonInput.onchange = function () { handleJsonRestore(this.files[0]); };
  const btnRestoreM = $('btn-restore-m');
  if (btnRestoreM) btnRestoreM.onclick = function () { closeMobileActions(); openRestoreJson(); };
  const capCard = $('s-capital-card');
  if (capCard) capCard.onclick = setCapital;
  const renditeCard = $('s-rendite-card');
  if (renditeCard) renditeCard.onclick = setCapital;

  // Register service worker with automatic update + reload
  if ('serviceWorker' in navigator) {
    let refreshing = false;
    // When a new SW takes control, reload the page once automatically
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // Check for updates on load
      reg.update().catch(() => {});
      // And check again every time the app regains focus
      window.addEventListener('focus', () => reg.update().catch(() => {}));
      // If an updated SW is found, let it activate immediately
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            // new version ready -> skipWaiting in SW triggers controllerchange -> auto reload
            nw.postMessage && nw.postMessage('skipWaiting');
          }
        });
      });
    }).catch(() => {});
  }
}

// ES-Module laufen "deferred" — d.h. DOMContentLoaded kann schon vorbei sein,
// wenn dieses Modul ausgeführt wird. Deshalb starten wir bootApp direkt,
// falls das DOM bereits geladen ist, sonst warten wir auf das Event.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}

// Called by the GIS script onload (see index.html)
// Da ES-Module verzögert laden, kann Googles Script früher fertig sein.
// Deshalb prüfen wir beim Modul-Start auch selbst, ob google schon da ist.
function gisLoaded() {
  initAuth();
}
window.gisLoaded = gisLoaded;
window.setTsMode = setTsMode;

// Falls das Google-Script schon geladen war, bevor dieses Modul lief:
if (window.google && window.google.accounts && window.google.accounts.oauth2) {
  initAuth();
}

// ============================================================
// HTML-Inline-Handler global verfügbar machen
// ============================================================
// Die index.html ruft Funktionen direkt per onclick="..." auf.
// In einem ES-Modul sind Funktionen NICHT automatisch global,
// daher hängen wir die benötigten hier ans window-Objekt.
// (Später können diese durch addEventListener im JS ersetzt werden.)
Object.assign(window, {
  showTab, mobileTab, toggleMobileActions, closeMobileActions,
  openAddModalForDate, closeAddModal, saveTrade, updatePnlPreview,
  closeEditModal, saveEdit, updateEditPreview,
  closeDetail,
  closeImportModal, confirmImport, handleFileSelect,
  handleDragOver, handleDragLeave, handleDrop,
  closeClosePosModal, confirmClosePos, setCloseTotalLoss, updateClosePreview, onCloseTaxInput
});
