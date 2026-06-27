'use strict';

/* ============================================================
   CONFIG
   ============================================================ */
const CLIENT_ID = '654655385029-oscipiaf48u4pnrh6t1ahnfgua1mjp43.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DATA_FILENAME = 'trade-kalender.json';
const KNOCKOUT_THRESHOLD = 1000;

/* ============================================================
   STATE
   ============================================================ */
let tokenClient = null;
let accessToken = null;
let driveFileId = null;          // id of trade-kalender.json in Drive
let DATA = { trades: [], openLots: [] };
let pendingImport = [];
let pendingOpenLots = [];
let currentDetailDate = null;

/* ============================================================
   HELPERS
   ============================================================ */
const $ = id => document.getElementById(id);

const fmtDE = (v, d = 2) => {
  const abs = Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  return (v < 0 ? '-' : '+') + abs + ' \u20ac';
};
const fmtPlain = (v, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtK = v => {
  const s = v < 0 ? '-' : '+';
  const a = Math.abs(v);
  return s + (a >= 1000 ? (a / 1000).toFixed(1) + 'k' : a.toFixed(0));
};

function setStatus(msg, isError) {
  const el = $('status-bar');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--red)' : 'var(--muted)';
  el.style.display = msg ? 'block' : 'none';
}

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
  DATA = { trades: [], openLots: [] };
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
async function driveFetch(url, opts = {}) {
  opts.headers = Object.assign({}, opts.headers, { Authorization: 'Bearer ' + accessToken });
  const r = await fetch(url, opts);
  if (r.status === 401) {
    throw new Error('Sitzung abgelaufen \u2014 bitte neu anmelden.');
  }
  return r;
}

async function findDataFile() {
  const q = encodeURIComponent("name='" + DATA_FILENAME + "' and trashed=false");
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + q + '&spaces=drive&fields=files(id,name)';
  const r = await driveFetch(url);
  const j = await r.json();
  if (j.files && j.files.length > 0) return j.files[0].id;
  return null;
}

async function loadFromDrive() {
  driveFileId = await findDataFile();
  if (!driveFileId) {
    // No file yet — create empty
    DATA = { trades: [], openLots: [] };
    await saveToDrive(true);
    return;
  }
  const r = await driveFetch('https://www.googleapis.com/drive/v3/files/' + driveFileId + '?alt=media');
  const text = await r.text();
  try {
    const parsed = JSON.parse(text);
    DATA = {
      trades: Array.isArray(parsed.trades) ? parsed.trades : [],
      openLots: Array.isArray(parsed.openLots) ? parsed.openLots : []
    };
  } catch (e) {
    DATA = { trades: [], openLots: [] };
  }
}

async function saveToDrive(isCreate) {
  const content = JSON.stringify(DATA, null, 2);
  const metadata = { name: DATA_FILENAME, mimeType: 'application/json' };

  if (!driveFileId || isCreate) {
    // multipart create
    const boundary = 'tk_boundary_' + Date.now();
    const body =
      '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: application/json\r\n\r\n' +
      content + '\r\n' +
      '--' + boundary + '--';
    const r = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
      body
    });
    const j = await r.json();
    driveFileId = j.id;
  } else {
    // update media
    await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + driveFileId + '?uploadType=media', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content
    });
  }
}

async function persist() {
  setStatus('Speichere in Google Drive \u2026');
  try {
    await saveToDrive(false);
    setStatus('');
  } catch (e) {
    setStatus('Speichern fehlgeschlagen: ' + e.message, true);
  }
}

/* ============================================================
   DERIVED VIEWS
   ============================================================ */
function tradesByDate(date) { return DATA.trades.filter(t => t.date === date); }

function dayMap() {
  const m = {};
  DATA.trades.forEach(t => {
    if (!m[t.date]) m[t.date] = { pnl: 0, rev: 0, tax: 0, n: 0 };
    m[t.date].pnl += t.pnl;
    m[t.date].rev += t.sell;
    m[t.date].tax += t.tax;
    m[t.date].n += 1;
  });
  return m;
}

function deriveOpenPositions() {
  const byIsin = {};
  DATA.openLots.forEach(lot => {
    if (!byIsin[lot.isin]) byIsin[lot.isin] = [];
    byIsin[lot.isin].push(lot);
  });
  const positions = [];
  Object.entries(byIsin).forEach(([isin, lots]) => {
    const totalShares = lots.reduce((s, l) => s + l.shares, 0);
    const totalCost = lots.reduce((s, l) => s + l.amount, 0);
    const avgPrice = totalShares > 0 ? totalCost / totalShares : 0;
    const desc = lots[0].desc;
    const dir = desc.includes('Short') ? 'Short' : desc.includes('Call') ? 'Call' : desc.includes('Put') ? 'Put' : 'Long';
    positions.push({
      isin, desc, dir,
      shares: Math.round(totalShares * 1000) / 1000,
      cost: Math.round(totalCost * 100) / 100,
      avgPrice: Math.round(avgPrice * 10000) / 10000,
      since: lots[0].date,
      lots: lots.length
    });
  });
  positions.sort((a, b) => b.cost - a.cost);
  return positions;
}

/* ============================================================
   TABS
   ============================================================ */
function showTab(id) {
  const order = ['calendar', 'weekly', 'monthly', 'open'];
  document.querySelectorAll('.nav-tab').forEach((t, i) => t.classList.toggle('active', order[i] === id));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + id));
}

/* ============================================================
   STATS
   ============================================================ */
function rebuildStats() {
  const dm = dayMap();
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

  $('hdr-pnl').textContent = fmtDE(totalPnl);
  $('hdr-pnl').className = 'total-pnl ' + (totalPnl >= 0 ? 'pos' : 'neg');
  $('s-winrate').textContent = ((wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1).replace('.', ',') : '0,0') + ' %';
  $('s-wins').textContent = wins;
  $('s-losses').textContent = losses;
  $('s-trades').textContent = totalTrades;
  $('s-avgday').textContent = fmtK(avgDay);
  $('s-avgtrade').textContent = fmtK(avgTrade);
  $('s-streak').textContent = maxStreak;
  $('s-tax').textContent = fmtPlain(Math.abs(totalTax)) + ' \u20ac';
}

/* ============================================================
   CALENDAR (GitHub-style heatmap, full year)
   ============================================================ */
function buildCalendar() {
  const dm = dayMap();
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const CELL = isMobile ? 16 : 12;
  const GAP = 2;
  const container = $('cal-container');
  container.innerHTML = '';

  const allDates = Object.keys(dm);
  const curYear = new Date().getFullYear();
  const minYear = allDates.length > 0 ? Math.min(...allDates.map(d => parseInt(d))) : curYear;
  const years = [];
  for (let y = minYear; y <= curYear; y++) years.push(y);

  const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const MON = ['Jan', 'Feb', 'M\u00e4r', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

  function dayColor(pnl, maxAbs) {
    if (!pnl || pnl === 0) return null;
    const t = Math.min(Math.abs(pnl) / maxAbs, 1);
    if (pnl > 0) {
      const r = Math.round(232 - (232 - 21) * t);
      const g = Math.round(245 - (245 - 122) * t);
      const b = Math.round(238 - (238 - 74) * t);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    } else {
      const r = Math.round(253 - (253 - 185) * t);
      const g = Math.round(236 - (236 - 28) * t);
      const b = Math.round(234 - (234 - 28) * t);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
  }

  if (years.length === 0 || DATA.trades.length === 0) {
    container.innerHTML = '<div style="color:var(--muted);font-size:.85rem;padding:2rem 0;text-align:center">Noch keine Trades. Importiere deine XLSX oder f\u00fcge einen Trade hinzu.</div>';
    return;
  }

  years.forEach(year => {
    const jan1 = new Date(year, 0, 1);
    const startOffset = (jan1.getDay() + 6) % 7;
    const gridStart = new Date(jan1); gridStart.setDate(jan1.getDate() - startOffset);
    const dec31 = new Date(year, 11, 31);
    const endOffset = (7 - ((dec31.getDay() + 6) % 7 + 1)) % 7;
    const gridEnd = new Date(dec31); gridEnd.setDate(dec31.getDate() + endOffset);
    const totalDays = Math.round((gridEnd - gridStart) / 86400000) + 1;
    const totalWeeks = totalDays / 7;

    const yearKeys = Object.keys(dm).filter(k => k.startsWith(year + '-'));
    const maxAbs = yearKeys.length > 0 ? Math.max(...yearKeys.map(k => Math.abs(dm[k].pnl))) : 1;

    const grid = [];
    for (let w = 0; w < totalWeeks; w++) grid.push(Array(7).fill(null));
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
      const week = Math.floor(i / 7);
      const dow = i % 7;
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      grid[week][dow] = { key, day: d.getDate(), isCur: d.getFullYear() === year, data: dm[key] || null };
    }

    const monthCols = {};
    for (let mo = 0; mo < 12; mo++) {
      const first = new Date(year, mo, 1);
      const off = Math.round((first - gridStart) / 86400000);
      monthCols[mo] = Math.floor(off / 7);
    }

    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:2rem';

    const yLabel = document.createElement('div');
    yLabel.style.cssText = "font-family:'Bebas Neue',sans-serif;font-size:1.8rem;letter-spacing:.06em;color:var(--ink);margin-bottom:.5rem;";
    yLabel.textContent = year;
    section.appendChild(yLabel);

    const yTrades = DATA.trades.filter(t => t.date.startsWith(year + '-'));
    const yPnl = yTrades.reduce((s, t) => s + t.pnl, 0);
    const yTax = yTrades.reduce((s, t) => s + t.tax, 0);
    const yWins = yearKeys.filter(k => dm[k].pnl > 0).length;
    const yLosses = yearKeys.filter(k => dm[k].pnl < 0).length;
    if (yTrades.length > 0) {
      const sr = document.createElement('div');
      sr.style.cssText = 'display:flex;gap:1.5rem;margin-bottom:.75rem;font-family:"DM Mono",monospace;font-size:.65rem;color:var(--muted);flex-wrap:wrap;';
      const c = yPnl >= 0 ? 'var(--green)' : 'var(--red)';
      sr.innerHTML =
        '<span>P&L: <strong style="color:' + c + '">' + fmtDE(yPnl) + '</strong></span>' +
        '<span>' + yTrades.length + ' Trades</span>' +
        '<span>' + yWins + 'W / ' + yLosses + 'L</span>' +
        '<span>Steuer: ' + fmtPlain(Math.abs(yTax)) + ' \u20ac</span>';
      section.appendChild(sr);
    }

    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;gap:0;overflow-x:auto;padding-bottom:4px;';

    const dowCol = document.createElement('div');
    dowCol.style.cssText = 'display:flex;flex-direction:column;gap:2px;margin-right:4px;padding-top:18px;flex-shrink:0;';
    DOW.forEach((lbl, i) => {
      const el = document.createElement('div');
      el.style.cssText = 'font-family:"DM Mono",monospace;font-size:'+(isMobile?'10':'9')+'px;color:var(--muted);height:'+CELL+'px;line-height:'+CELL+'px;text-align:right;width:18px;';
      el.textContent = (i % 2 === 0) ? lbl : '';
      dowCol.appendChild(el);
    });
    wrap.appendChild(dowCol);

    const area = document.createElement('div');
    area.style.cssText = 'display:flex;flex-direction:column;';

    const monthRow = document.createElement('div');
    monthRow.style.cssText = 'display:flex;gap:2px;height:18px;margin-bottom:2px;';
    for (let w = 0; w < totalWeeks; w++) {
      const cell = document.createElement('div');
      cell.style.cssText = 'width:'+CELL+'px;flex-shrink:0;font-family:"DM Mono",monospace;font-size:'+(isMobile?'10':'9')+'px;color:var(--muted);white-space:nowrap;overflow:visible;';
      const me = Object.entries(monthCols).find(([mo, col]) => parseInt(col) === w);
      if (me) cell.textContent = MON[parseInt(me[0])];
      monthRow.appendChild(cell);
    }
    area.appendChild(monthRow);

    const cellsRow = document.createElement('div');
    cellsRow.style.cssText = 'display:flex;gap:2px;';
    for (let w = 0; w < totalWeeks; w++) {
      const col = document.createElement('div');
      col.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
      for (let d = 0; d < 7; d++) {
        const cell = document.createElement('div');
        const entry = grid[w][d];
        cell.style.cssText = 'width:'+CELL+'px;height:'+CELL+'px;border-radius:2px;flex-shrink:0;';
        if (!entry || !entry.isCur) {
          cell.style.background = 'transparent';
        } else if (!entry.data) {
          cell.style.background = (d >= 5) ? 'rgba(224,219,212,0.4)' : 'var(--border)';
          cell.style.cursor = 'pointer';
          cell.title = entry.key;
          (function (k) { cell.onclick = () => openDetailNew(k); })(entry.key);
        } else {
          cell.style.background = dayColor(entry.data.pnl, maxAbs) || 'var(--border)';
          cell.style.cursor = 'pointer';
          const sign = entry.data.pnl >= 0 ? '+' : '';
          cell.title = entry.key + ': ' + sign + fmtPlain(entry.data.pnl) + ' \u20ac (' + entry.data.n + ' Trades)';
          (function (k) { cell.onclick = () => showDetail(k); })(entry.key);
        }
        col.appendChild(cell);
      }
      cellsRow.appendChild(col);
    }
    area.appendChild(cellsRow);
    wrap.appendChild(area);
    section.appendChild(wrap);

    if (year === years[0]) {
      const legend = document.createElement('div');
      legend.style.cssText = 'display:flex;align-items:center;gap:.4rem;margin-top:.5rem;font-family:"DM Mono",monospace;font-size:.58rem;color:var(--muted);flex-wrap:wrap;';
      legend.innerHTML = '<span>Verlust</span>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgb(253,203,200)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgb(219,84,56)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgb(185,28,28)"></div>' +
        '<span style="margin:0 .3rem">\u00b7</span>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgb(209,240,220)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgb(74,198,123)"></div>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:rgb(21,122,74)"></div>' +
        '<span>Gewinn</span>' +
        '<div style="width:10px;height:10px;border-radius:2px;background:var(--border);margin-left:.5rem"></div>' +
        '<span>kein Trade</span>';
      section.appendChild(legend);
    }
    container.appendChild(section);
  });
}

/* ============================================================
   WEEKLY
   ============================================================ */
function buildWeekly() {
  const dm = dayMap();
  const weeks = {};
  Object.entries(dm).forEach(([k, v]) => {
    const date = new Date(k);
    const mon = new Date(date);
    mon.setDate(date.getDate() - ((date.getDay() === 0 ? 6 : date.getDay() - 1)));
    const wk = mon.toISOString().slice(0, 10);
    if (!weeks[wk]) weeks[wk] = { pnl: 0, rev: 0, n: 0 };
    weeks[wk].pnl += v.pnl; weeks[wk].rev += v.rev; weeks[wk].n += v.n;
  });
  const sorted = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]));
  const maxAbs = Math.max(...sorted.map(w => Math.abs(w[1].pnl)), 1);
  const tbody = $('weekly-tbody');
  tbody.innerHTML = '';
  if (sorted.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);padding:1rem">Keine Daten.</td></tr>'; return; }
  sorted.forEach(([wk, v]) => {
    const end = new Date(wk); end.setDate(end.getDate() + 4);
    const lbl = wk.slice(8) + '.' + wk.slice(5, 7) + '.\u2013' + String(end.getDate()).padStart(2, '0') + '.' + String(end.getMonth() + 1).padStart(2, '0') + '.';
    const pct = Math.round((Math.abs(v.pnl) / maxAbs) * 100);
    const cls = v.pnl >= 0 ? 'pos' : 'neg';
    tbody.innerHTML += '<tr><td>' + lbl + '</td><td class="r ' + cls + '">' + fmtDE(v.pnl) + '</td><td class="r">' + fmtPlain(v.rev, 0) + ' \u20ac</td><td class="r">' + v.n + '</td><td><div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div></td></tr>';
  });
}

/* ============================================================
   MONTHLY
   ============================================================ */
function buildMonthly() {
  const dm = dayMap();
  const months = {};
  Object.entries(dm).forEach(([k, v]) => {
    const mo = k.slice(0, 7);
    if (!months[mo]) months[mo] = { pnl: 0, rev: 0, n: 0 };
    months[mo].pnl += v.pnl; months[mo].rev += v.rev; months[mo].n += v.n;
  });
  const sorted = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
  const maxAbs = Math.max(...sorted.map(m => Math.abs(m[1].pnl)), 1);
  const MON = { '01': 'Jan', '02': 'Feb', '03': 'M\u00e4r', '04': 'Apr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Dez' };
  const barsWrap = $('monthly-bars-wrap');
  if (sorted.length === 0) { barsWrap.innerHTML = ''; $('monthly-tbody').innerHTML = '<tr><td colspan="4" style="color:var(--muted);padding:1rem">Keine Daten.</td></tr>'; return; }
  let bars = '<div class="monthly-bars">';
  sorted.forEach(([mo, v]) => {
    const pct = Math.max(Math.round((Math.abs(v.pnl) / maxAbs) * 100), 2);
    const cls = v.pnl >= 0 ? 'pos' : 'neg';
    bars += '<div class="month-bar-col"><div class="month-bar ' + cls + '" style="height:' + pct + '%" title="' + fmtDE(v.pnl) + '"></div><div class="month-bar-lbl">' + MON[mo.slice(5)] + '</div><div class="month-bar-val ' + cls + '">' + fmtK(v.pnl) + '</div></div>';
  });
  barsWrap.innerHTML = bars + '</div>';
  const tbody = $('monthly-tbody');
  tbody.innerHTML = '';
  sorted.forEach(([mo, v]) => {
    const cls = v.pnl >= 0 ? 'pos' : 'neg';
    tbody.innerHTML += '<tr><td>' + MON[mo.slice(5)] + ' ' + mo.slice(0, 4) + '</td><td class="r ' + cls + '">' + fmtDE(v.pnl) + '</td><td class="r">' + fmtPlain(v.rev, 0) + ' \u20ac</td><td class="r">' + v.n + '</td></tr>';
  });
}

/* ============================================================
   OPEN POSITIONS
   ============================================================ */
function buildOpenPositions() {
  const wrap = $('open-pos-wrap');
  wrap.innerHTML = '';
  const positions = deriveOpenPositions();
  if (positions.length === 0) {
    wrap.innerHTML = '<div style="color:var(--muted);font-size:.82rem;padding:1rem 0">Keine offenen Positionen.</div>';
    return;
  }
  positions.forEach(p => {
    wrap.innerHTML += '<div class="open-pos-card">' +
      '<div><div class="op-name">' + p.desc + '</div>' +
      '<div class="op-isin">' + p.isin + '</div>' +
      '<div class="op-badge">' + p.dir + ' \u00b7 offen seit ' + p.since + '</div></div>' +
      '<div class="op-nums">' +
      '<div><div class="op-num-lbl">St\u00fcck</div><div class="op-num-val">' + p.shares.toLocaleString('de-DE') + '</div></div>' +
      '<div><div class="op-num-lbl">\u00d8 Preis</div><div class="op-num-val">' + fmtPlain(p.avgPrice, 4) + '</div></div>' +
      '<div><div class="op-num-lbl">Lots</div><div class="op-num-val">' + p.lots + '</div></div>' +
      '<div><div class="op-num-lbl">Einstand</div><div class="op-num-val">' + fmtPlain(p.cost, 0) + ' \u20ac</div></div>' +
      '</div></div>';
  });
}

/* ============================================================
   DAY DETAIL PANEL
   ============================================================ */
function showDetail(key) {
  currentDetailDate = key;
  const trades = tradesByDate(key);
  const dm = dayMap();
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
      '<div class="trade-desc">' + t.desc + ' <span class="broker-tag ' + bc + '">' + bl + '</span></div>' +
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
  DATA.trades = DATA.trades.filter(t => t.uid !== uid);
  recomputeOpenLots();
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
  if (!$('f-date').value) $('f-date').value = new Date().toISOString().slice(0, 10);
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
   XLSX IMPORT (FIFO, Buy-before-Sell tiebreak, UID dedup)
   ============================================================ */
function openImportModal() {
  pendingImport = []; pendingOpenLots = [];
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
function handleFileSelect(file) { if (!file) return; const r = new FileReader(); r.onload = e => parseXlsx(e.target.result); r.readAsArrayBuffer(file); }

function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const filtered = rows.filter(r => (r.type === 'Buy' || r.type === 'Sell') && r.status === 'Executed');
  filtered.sort((a, b) => {
    const da = typeof a.date === 'object' ? a.date.toISOString() : String(a.date);
    const db = typeof b.date === 'object' ? b.date.toISOString() : String(b.date);
    const ta = da + String(a.time) + (a.type === 'Buy' ? '0' : '1');
    const tb = db + String(b.time) + (b.type === 'Buy' ? '0' : '1');
    return ta.localeCompare(tb);
  });

  const isinBuyCost = {};
  filtered.filter(r => r.type === 'Buy').forEach(r => {
    const isin = r.isin; const amt = Math.abs(parseFloat(r.amount) || 0);
    isinBuyCost[isin] = (isinBuyCost[isin] || 0) + amt;
  });

  // Start FIFO pools from existing open lots (so partial closes work across imports)
  const buyPools = {};
  DATA.openLots.forEach(lot => {
    if (!buyPools[lot.isin]) buyPools[lot.isin] = [];
    buyPools[lot.isin].push({ shares: lot.shares, amount: lot.amount, date: lot.date, desc: lot.desc, isin: lot.isin });
  });

  const closed = [];
  filtered.forEach(row => {
    const isin = row.isin;
    const shares = parseFloat(row.shares) || 0;
    const amount = parseFloat(row.amount) || 0;
    const tax = parseFloat(row.tax) || 0;
    const dateRaw = row.date;
    const dateStr = typeof dateRaw === 'object' ? dateRaw.toISOString().slice(0, 10) : String(dateRaw).slice(0, 10);
    if (row.type === 'Buy' && shares > 0) {
      if (!buyPools[isin]) buyPools[isin] = [];
      buyPools[isin].push({ shares, amount: Math.abs(amount), date: dateStr, desc: row.description, isin });
    } else if (row.type === 'Sell' && shares > 0) {
      const pool = buyPools[isin] || [];
      let remaining = shares, cost = 0;
      while (remaining > 0.001 && pool.length > 0) {
        const b = pool[0];
        const take = Math.min(b.shares, remaining);
        const prop = take / b.shares;
        cost += prop * b.amount;
        b.amount *= (1 - prop);
        b.shares -= take;
        remaining -= take;
        if (b.shares < 0.001) pool.shift();
      }
      const sellRev = Math.abs(amount);
      const pnl = +(sellRev - cost - tax).toFixed(2);
      const uid = isin + '_' + dateStr + '_' + sellRev.toFixed(2) + '_' + shares.toFixed(3);
      closed.push({ uid, date: dateStr, isin, desc: row.description, broker: 'scalable', shares, buy: +cost.toFixed(2), sell: +sellRev.toFixed(2), tax: +tax.toFixed(2), pnl });
    }
  });

  const newOpenLots = [];
  Object.values(buyPools).forEach(pool => pool.forEach(lot => {
    if (lot.shares > 0.001 && (isinBuyCost[lot.isin] || 0) >= KNOCKOUT_THRESHOLD) newOpenLots.push(lot);
  }));
  pendingOpenLots = newOpenLots;

  const existingUids = new Set(DATA.trades.map(t => t.uid));
  let newCount = 0, dupCount = 0;
  pendingImport = closed.map(t => {
    const isDup = existingUids.has(t.uid);
    if (isDup) dupCount++; else newCount++;
    return Object.assign({}, t, { isDup });
  });

  const tbody = $('import-tbody');
  tbody.innerHTML = '';
  pendingImport.slice(0, 40).forEach(t => {
    const cls = t.isDup ? 'dup' : '';
    const col = t.pnl >= 0 ? 'var(--green)' : 'var(--red)';
    const tr = document.createElement('tr');
    tr.className = cls;
    tr.innerHTML = '<td>' + t.date + '</td>' +
      '<td style="font-size:.65rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + t.desc + '</td>' +
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
  sumEl.textContent = newCount + ' neue Trades' + (dupCount ? ', ' + dupCount + ' bereits vorhanden (werden \u00fcbersprungen)' : '') + '.';
  sumEl.className = 'import-summary' + (newCount === 0 ? ' warn' : '');
  sumEl.style.display = 'block';
  if (newCount > 0) {
    const btn = $('import-confirm-btn');
    btn.style.display = 'inline-block';
    btn.textContent = newCount + ' Trade' + (newCount !== 1 ? 's' : '') + ' importieren';
  }
}

async function confirmImport() {
  pendingImport.filter(t => !t.isDup).forEach(t => {
    const o = Object.assign({}, t);
    delete o.isDup;
    DATA.trades.push(o);
  });
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
  DATA = { trades: [], openLots: [] };
  await persist();
  rebuildAll();
  alert('Alle Daten gel\u00f6scht. Du kannst jetzt neu importieren.');
}

function exportCSV() {
  const rows = ['UID;Datum;ISIN;Produkt;Broker;Kauf;Verkauf;Steuer;P&L'];
  DATA.trades.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    rows.push([t.uid || '', t.date, t.isin || '', t.desc, t.broker || '', t.buy, t.sell, t.tax, t.pnl].join(';'));
  });
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'trade-kalender-' + new Date().toISOString().slice(0, 10) + '.csv';
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

function rebuildAll() {
  rebuildStats();
  buildCalendar();
  buildWeekly();
  buildMonthly();
  buildOpenPositions();
}

/* ============================================================
   BOOT
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  // Wire up buttons
  $('btn-login').onclick = signIn;
  $('btn-logout').onclick = signOut;
  $('btn-add').onclick = openAddModal;
  $('btn-import').onclick = openImportModal;
  $('btn-export').onclick = exportCSV;
  $('btn-reset').onclick = resetAllData;

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});

// Called by the GIS script onload (see index.html)
function gisLoaded() {
  initAuth();
}
window.gisLoaded = gisLoaded;
