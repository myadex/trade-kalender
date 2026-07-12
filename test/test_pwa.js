'use strict';
const fs = require('fs');
const { JSDOM } = require('jsdom');
const acorn = require('acorn');
const { execFileSync } = require('child_process');

const DIR = __dirname + '/..';
let pass = 0, fail = 0;
const fails = [];

function check(name, cond) {
  if (cond) { pass++; console.log('  \u2705 ' + name); }
  else { fail++; fails.push(name); console.log('  \u274c ' + name); }
}

console.log('\n=== 1. SYNTAX ===');
const fsp = require('fs');
// Alle JS-Module aus js/ einlesen und zu einem String zusammenfügen
// (für die textbasierten Checks wie "enthält Funktion X")
const jsDir = DIR + '/js';
const moduleFiles = fsp.readdirSync(jsDir).filter(f => f.endsWith('.js'));
let appJs = '';
moduleFiles.forEach(f => {
  const code = fsp.readFileSync(jsDir + '/' + f, 'utf8');
  appJs += '\n' + code;
  try { acorn.parse(code, { ecmaVersion: 2020, sourceType: 'module' }); check('js/' + f + ' parses', true); }
  catch (e) { check('js/' + f + ' parses (' + e.message + ')', false); }
});
// Der Service Worker wird aus index.html mit './sw.js' registriert. Er muss
// deshalb im Projekt-Root liegen: Unter js/ haette er nur den Scope /js/ und
// koennte weder die App-Seite noch die PWA-Root-Route kontrollieren.
const swPath = DIR + '/sw.js';
const hasRootServiceWorker = fs.existsSync(swPath);
check('Service Worker liegt im Projekt-Root', hasRootServiceWorker);
const swJs = hasRootServiceWorker ? fs.readFileSync(swPath, 'utf8') : '';
const html = fs.readFileSync(DIR + '/index.html', 'utf8');
if (hasRootServiceWorker) {
  try { acorn.parse(swJs, { ecmaVersion: 2020 }); check('sw.js parses', true); }
  catch (e) { check('sw.js parses (' + e.message + ')', false); }
}

console.log('\n=== 1b. IMPORT/EXPORT-KONSISTENZ (Modul-Vertraege) ===');
// Prueft per AST: Jeder `import { X } from './mod.js'` muss in mod.js
// ein `export` fuer X haben. Faengt den "does not provide an export"-Fehler
// VOR dem Deployment. Zusaetzlich: HTML-onload-Callbacks muessen auf window stehen.
(function () {
  const path = require('path');
  const moduleFiles = fs.readdirSync(path.join(DIR, 'js')).filter(f => f.endsWith('.js'));
  const exportsByFile = {};
  const importsByFile = {};
  for (const fn of moduleFiles) {
    const code = fs.readFileSync(path.join(DIR, 'js', fn), 'utf8');
    let ast;
    try {
      ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module' });
    } catch (e) { continue; }
    const exp = new Set();
    const imp = [];
    for (const node of ast.body) {
      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          if (node.declaration.type === 'FunctionDeclaration') exp.add(node.declaration.id.name);
          if (node.declaration.type === 'VariableDeclaration') {
            for (const d of node.declaration.declarations) {
              if (d.id.type === 'Identifier') exp.add(d.id.name);
            }
          }
        }
        for (const s of (node.specifiers || [])) exp.add(s.exported.name);
      }
      if (node.type === 'ImportDeclaration') {
        const src = node.source.value;
        if (src.startsWith('./')) {
          const names = node.specifiers
            .filter(s => s.type === 'ImportSpecifier')
            .map(s => s.imported.name);
          imp.push({ from: src.replace('./', ''), names });
        }
      }
    }
    exportsByFile[fn] = exp;
    importsByFile[fn] = imp;
  }
  let importErrors = [];
  for (const fn of moduleFiles) {
    for (const { from, names } of (importsByFile[fn] || [])) {
      const avail = exportsByFile[from];
      if (!avail) { importErrors.push(fn + ": Modul '" + from + "' fehlt!"); continue; }
      for (const n of names) {
        if (!avail.has(n)) importErrors.push(fn + ": '" + n + "' aus " + from + ' nicht exportiert');
      }
    }
  }
  check('alle Modul-Imports haben passende Exports', importErrors.length === 0);
  if (importErrors.length) importErrors.forEach(e => console.log('     -> ' + e));

  // HTML-onload-Callbacks (z.B. gisLoaded) muessen via window.X exponiert sein
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const onloadCallbacks = [...html.matchAll(/onload="(\w+)\(\)"/g)].map(m => m[1]);
  for (const cb of onloadCallbacks) {
    check("HTML-onload-Callback '" + cb + "' auf window exponiert",
      appJs.includes('window.' + cb + ' = ') || appJs.includes(cb + ':') && appJs.includes('Object.assign(window'));
  }
})();

console.log('\n=== 2. ID REFERENCES ===');
const ids = new Set(); let m;
const r1 = /getElementById\(['"]([^'"]+)['"]\)/g; while ((m = r1.exec(appJs))) ids.add(m[1]);
const r2 = /\$\(['"]([^'"]+)['"]\)/g; while ((m = r2.exec(appJs))) ids.add(m[1]);
const missingIds = [...ids].filter(id => !html.includes('id="' + id + '"'));
check('all ' + ids.size + ' getElementById IDs exist in HTML', missingIds.length === 0);
if (missingIds.length) console.log('     missing: ' + missingIds.join(', '));

console.log('\n=== 2b. DATENSCHUTZ ===');
const gitignore = fs.readFileSync(DIR + '/.gitignore', 'utf8');
check('Laufzeit-Datensnapshot ist in .gitignore', gitignore.includes('trade-kalender.json'));
let runtimeDataTracked = false;
try {
  execFileSync('git', ['ls-files', '--error-unmatch', 'trade-kalender.json'], { cwd: DIR, stdio: 'ignore' });
  runtimeDataTracked = true;
} catch (e) {}
check('Laufzeit-Datensnapshot ist nicht im Git-Index', !runtimeDataTracked);

console.log('\n=== 3. EVENT HANDLERS ===');
const handlers = new Set();
const r3 = /on(?:click|input|change)="(\w+)\(/g; while ((m = r3.exec(html))) handlers.add(m[1]);
const missingFns = [...handlers].filter(fn => fn !== 'if' && !appJs.includes('function ' + fn + '('));
check('all ' + handlers.size + ' inline handlers defined', missingFns.length === 0);
if (missingFns.length) console.log('     missing: ' + missingFns.join(', '));

console.log('\n=== 3b. MODULE: INLINE-HANDLER AUF WINDOW ===');
// In ES-Modulen sind Funktionen nicht global. Jede per onclick/oninput/ondrop
// im HTML aufgerufene Funktion MUSS ans window gehängt sein, sonst bricht die App.
{
  const inlineFns = new Set();
  let mm;
  const reH = /on(?:click|input|change|drop|dragover|dragleave)="(\w+)\(/g;
  while ((mm = reH.exec(html))) if (mm[1] !== 'if') inlineFns.add(mm[1]);
  // window-Exposition finden: Object.assign(window, { ... }) + window.x =
  const exposed = new Set();
  const assignMatch = appJs.match(/Object\.assign\(window,\s*\{([\s\S]*?)\}\)/);
  if (assignMatch) {
    assignMatch[1].split(',').forEach(s => {
      const name = s.trim().split(/[:\s]/)[0];
      if (name) exposed.add(name);
    });
  }
  let wm;
  const reW = /window\.(\w+)\s*=/g;
  while ((wm = reW.exec(appJs))) exposed.add(wm[1]);
  const notExposed = [...inlineFns].filter(fn => !exposed.has(fn));
  check('alle ' + inlineFns.size + ' Inline-Handler ans window geh\u00e4ngt', notExposed.length === 0);
  // ES-Module laufen deferred -> Boot darf NICHT nur an DOMContentLoaded hängen,
  // sonst läuft der Startcode nie (Event ist beim Modul-Start oft schon vorbei).
  check('Boot behandelt bereits geladenes DOM (readyState-Check)',
    appJs.includes("document.readyState === 'loading'") && appJs.includes('bootApp'));
  if (notExposed.length) console.log('     nicht exponiert: ' + notExposed.join(', '));
}

console.log('\n=== 4. CSS ORDERING (media query must win) ===');
const mqPos = html.indexOf('@media (max-width: 720px)');
check('media query present', mqPos > -1);
// any plain (non-media) rule for #bottom-bar / #mobile-actions after the MQ would override it
const styleEnd = html.indexOf('</style>');
const afterMq = html.slice(mqPos, styleEnd);
// find end of media query block by brace counting
let depth = 0, i = afterMq.indexOf('{'), endMq = -1;
for (; i < afterMq.length; i++) {
  if (afterMq[i] === '{') depth++;
  else if (afterMq[i] === '}') { depth--; if (depth === 0) { endMq = i; break; } }
}
const trailing = afterMq.slice(endMq + 1).trim();
check('no CSS rules after media query block', trailing.length === 0);
check('desktop #bottom-bar default before media query', html.indexOf('#bottom-bar { display: none; }') < mqPos);

console.log('\n=== 5. NO KNOWN BUGS ===');
check('no Math.abs(tax) in P&L math', !appJs.includes('- Math.abs(tax)') && !appJs.includes('-Math.abs(tax)'));
check('FIFO uses buy-before-sell tiebreak', appJs.includes("(a.type === 'Buy' ? '0' : '1')"));
check('tax stored with sign (not abs) in import', appJs.includes('tax: +tax.toFixed(2), pnl })'));
check('Datum: kein toISOString (Zeitzonen-Bug vermieden)', !appJs.includes('toISOString().slice(0, 10)'));
check('Datum: toLocalDateStr-Helfer vorhanden', appJs.includes('export function toLocalDateStr') || appJs.includes('function toLocalDateStr'));
check('Datum: fifoMatch nutzt normalizeXlsxDate', appJs.includes('normalizeXlsxDate(dateRaw)'));
check('Datum: normalizeXlsxDate nutzt UTC-Komponenten', appJs.includes('getUTCFullYear') && appJs.includes('getUTCDate'));
check('storage.js: Drive-Funktionen ausgelagert', appJs.includes('export async function findDataFile') && appJs.includes('export async function createData'));
check('app.js nutzt storage-Modul', appJs.includes("from './storage.js'"));
check('storage.js: zustandslos (accessToken als Parameter)', appJs.includes('export async function driveFetch(accessToken'));
check('fifoMatch in fifo.js vorhanden', appJs.includes('export function fifoMatch('));
check('parseImport nutzt den zentralen Import-Ledger (keine FIFO-Duplizierung)', appJs.includes('replayImportLedger(importRows, importBaseOpenLots)'));
check('Knockout-Filter optional (default aus)', appJs.includes('applyKnockoutFilter = false'));
check('close-position functions present', appJs.includes('function confirmClosePos(') && appJs.includes('function openClosePosModal('));
check('TAX_RATE constant present', appJs.includes('const TAX_RATE = 0.26375'));
check('auto tax refund on loss close', appJs.includes('grossPnl * TAX_RATE'));
check('manual tax override supported', appJs.includes('dataset.touched'));
check('JSON restore function present', appJs.includes('function handleJsonRestore('));
check('restore button in HTML', html.includes('id="btn-restore"'));
check('json file input in HTML', html.includes('id="json-input"'));

console.log('\n=== 5b. EINSTAND / RENDITE ===');
check('DATA has capital field', appJs.includes('capital:'));
check('setCapital function defined', appJs.includes('function setCapital('));
check('rendite computed from capital', appJs.includes('(totalPnl / cap) * 100'));
check('capital card in HTML', html.includes('id="s-capital"'));
check('rendite card in HTML', html.includes('id="s-rendite"'));
check('all DATA inits include capital', (appJs.match(/DATA = \{ trades: \[\], openLots: \[\]/g) || []).every ? !appJs.match(/DATA = \{ trades: \[\], openLots: \[\] \}/) : true);

console.log('\n=== 6. CALCULATION LOGIC vs GOLDEN ===');
// Load app.js core funcs into a sandbox and replay the golden dataset through the same
// pnl/tax math the app uses. We mimic confirmImport's per-trade math.
const golden = JSON.parse(fs.readFileSync(__dirname + '/golden.json', 'utf8'));
// Reconstruct FIFO in JS exactly as parseXlsx does, fed from test2-derived rows.
const goldRows = JSON.parse(fs.readFileSync(__dirname + '/gold_rows.json', 'utf8'));
goldRows.sort((a, b) => {
  const ta = a.date + a.time + (a.type === 'Buy' ? '0' : '1');
  const tb = b.date + b.time + (b.type === 'Buy' ? '0' : '1');
  return ta.localeCompare(tb);
});
const pools = {}; let pnlSum = 0, taxSum = 0, n = 0;
for (const row of goldRows) {
  const isin = row.isin, shares = row.shares || 0, amount = row.amount || 0, tax = row.tax || 0;
  if (row.type === 'Buy' && shares > 0) {
    (pools[isin] = pools[isin] || []).push({ shares, amount: Math.abs(amount) });
  } else if (row.type === 'Sell' && shares > 0) {
    const pool = pools[isin] || []; let rem = shares, cost = 0;
    while (rem > 0.001 && pool.length) {
      const b = pool[0], take = Math.min(b.shares, rem), prop = take / b.shares;
      cost += prop * b.amount; b.amount *= (1 - prop); b.shares -= take; rem -= take;
      if (b.shares < 0.001) pool.shift();
    }
    const sellRev = Math.abs(amount);
    const pnl = +(sellRev - cost - tax).toFixed(2);  // tax WITH sign
    pnlSum += pnl; taxSum += tax; n++;
  }
}
pnlSum = +pnlSum.toFixed(2); taxSum = +taxSum.toFixed(2);
check('trade count = ' + golden.trades + ' (got ' + n + ')', n === golden.trades);
check('P&L = ' + golden.pnl + ' (got ' + pnlSum + ')', Math.abs(pnlSum - golden.pnl) < 0.5);
check('tax = ' + golden.tax + ' (got ' + taxSum + ')', Math.abs(taxSum - golden.tax) < 0.5);

// Zusätzlich: die ECHTE fifoMatch aus dem Modul gegen die Goldwerte testen
// (nicht nur die nachgebaute Logik oben). Läuft asynchron via dynamic import.
const realFifoCheck = (async () => {
  try {
    const mod = await import('file://' + DIR + '/js/fifo.js');
    const { closed } = mod.fifoMatch(goldRows, [], true);
    const rPnl = +closed.reduce((s, t) => s + t.pnl, 0).toFixed(2);
    const rTax = +closed.reduce((s, t) => s + t.tax, 0).toFixed(2);
    check('ECHTE fifoMatch: Trades = ' + golden.trades, closed.length === golden.trades);
    check('ECHTE fifoMatch: P&L = ' + golden.pnl, Math.abs(rPnl - golden.pnl) < 0.5);
    check('ECHTE fifoMatch: Steuer = ' + golden.tax, Math.abs(rTax - golden.tax) < 0.5);
    // views.js: Aggregation muss die Gesamtsumme erhalten
    const vmod = await import('file://' + DIR + '/js/views.js');
    const fmod = await import('file://' + DIR + '/js/fifo.js');
    const sampleTrades = [
      { date: '2026-06-01', pnl: 100, sell: 500, tax: 35, n: 1 },
      { date: '2026-06-02', pnl: -50, sell: 200, tax: -13, n: 1 },
      { date: '2026-06-08', pnl: 200, sell: 800, tax: 70, n: 1 }
    ];
    const dmv = fmod.dayMap(sampleTrades);
    const wsum = +vmod.aggregateWeeks(dmv).reduce((s, w) => s + w.pnl, 0).toFixed(2);
    const msum = +vmod.aggregateMonths(dmv).reduce((s, m) => s + m.pnl, 0).toFixed(2);
    const stats = vmod.computeStats(dmv, 1000);
    check('views: Wochen-Summe = 250', wsum === 250);
    check('views: Monats-Summe = 250', msum === 250);
    check('views: computeStats Wins/Losses (2/1)', stats.wins === 2 && stats.losses === 1);
    check('views: Rendite bei 1000 Einstand = 25%', Math.abs(stats.rendite - 25) < 0.01);
    // import.js: Parsing + Validierung
    const imod = await import('file://' + DIR + '/js/import.js');
    const csvOk = 'date;time;status;description;type;isin;shares;price;amount;fee;tax;currency\n' +
      '2026-06-29;10:00:00;Executed;"DAX";Buy;DE000X;1.209;16,52;-19.972,68;0,00;0,00;EUR\n' +
      '2026-06-29;11:00:00;Executed;"DAX";Sell;DE000X;1.209;16,89;20.420,01;0,00;117,98;EUR';
    const csvRes = imod.parseScalableCsv(csvOk);
    check('import: CSV gueltige Daten -> 2 rows', csvRes.rows && csvRes.rows.length === 2);
    check('import: CSV deutsche Zahl amount', csvRes.rows && csvRes.rows[0].amount === -19972.68);
    check('import: CSV shares Tausenderpunkt', csvRes.rows && csvRes.rows[0].shares === 1209);
    check('import: CSV negative Steuer erhalten', imod.parseGermanNumber('-482,35') === -482.35);
    check('import: CSV Datum bleibt String', csvRes.rows && csvRes.rows[0].date === '2026-06-29');
    check('import: CSV leer -> error', !!imod.parseScalableCsv('').error);
    check('import: CSV fehlende Spalten -> error', !!imod.parseScalableCsv('foo;bar\n1;2').error);
    const md = imod.markDuplicates([{ uid: 'a' }, { uid: 'b' }], new Set(['b']));
    check('import: markDuplicates (1 neu, 1 dup)', md.newCount === 1 && md.dupCount === 1);
    const ledgerFnsReady =
      typeof imod.withSourceRowIds === 'function' &&
      typeof imod.mergeImportRows === 'function' &&
      typeof fmod.replayImportLedger === 'function';
    check('Import-Ledger: pure Funktionen exportiert', ledgerFnsReady);
    if (ledgerFnsReady) {
      const ledgerRows = imod.withSourceRowIds([
        { type: 'Buy', status: 'Executed', isin: 'LEDGER', shares: 10, amount: -1000, date: '2026-07-01', time: '09:00:00', description: 'DAX Call', tax: 0 },
        { type: 'Sell', status: 'Executed', isin: 'LEDGER', shares: 10, amount: 1200, date: '2026-07-01', time: '10:00:00', description: 'DAX Call', tax: 50 }
      ]);
      const mergedRows = imod.mergeImportRows([], [ledgerRows[0], ledgerRows[0], ledgerRows[1]]);
      check('Import-Ledger: gleiche Rohzeile wird nur einmal gespeichert', mergedRows.length === 2);
      const ledger = fmod.replayImportLedger(ledgerRows, []);
      check('Import-Ledger: Replay markiert abgeleiteten Trade und Quelle',
        ledger.errors.length === 0 && ledger.trades.length === 1 &&
        ledger.trades[0].source === 'import' && ledger.trades[0].sourceRowId === ledgerRows[1].sourceRowId);
      const afterDelete = fmod.replayImportLedger(ledgerRows.filter(r => r.type !== 'Sell'), []);
      check('Import-Ledger: geloeschter Verkauf stellt offenes Lot wieder her',
        afterDelete.errors.length === 0 && afterDelete.trades.length === 0 &&
        afterDelete.openLots.length === 1 && afterDelete.openLots[0].shares === 10);
    } else {
      check('Import-Ledger: gleiche Rohzeile wird nur einmal gespeichert', false);
      check('Import-Ledger: Replay markiert abgeleiteten Trade und Quelle', false);
      check('Import-Ledger: geloeschter Verkauf stellt offenes Lot wieder her', false);
    }
    const hmod = await import('file://' + DIR + '/js/helpers.js');
    check('helpers: escapeHtml neutralisiert HTML aus Importdaten',
      typeof hmod.escapeHtml === 'function' &&
      hmod.escapeHtml('<img src=x onerror="alert(1)">&\'') === '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
    const sjsDate = new Date(Date.UTC(2026, 5, 29));
    check('helpers: normalizeXlsxDate SheetJS-Date = 2026-06-29', hmod.normalizeXlsxDate(sjsDate) === '2026-06-29');
    check('helpers: normalizeXlsxDate deutsch 29.06.2026', hmod.normalizeXlsxDate('29.06.2026') === '2026-06-29');
    check('helpers: normalizeXlsxDate US 06/29/26', hmod.normalizeXlsxDate('06/29/26') === '2026-06-29');
    const smod = await import('file://' + DIR + '/js/storage.js');
    const originalFetch = global.fetch;
    try {
      let request = null;
      global.fetch = async (url, opts) => {
        request = { url, opts };
        return new Response('{}', { status: 200 });
      };
      await smod.driveFetch('test-token', 'https://example.test/data', { headers: { 'X-Test': 'ok' } });
      check('storage: driveFetch sendet Bearer-Token und bestehende Header',
        request && request.opts.headers.Authorization === 'Bearer test-token' && request.opts.headers['X-Test'] === 'ok');

      global.fetch = async () => new Response(JSON.stringify({ error: { message: 'Keine Berechtigung' } }), { status: 403 });
      let driveError = '';
      try { await smod.driveFetch('test-token', 'https://example.test/data'); }
      catch (e) { driveError = e.message; }
      check('storage: Drive-403 wird mit Servermeldung geworfen', driveError.includes('403') && driveError.includes('Keine Berechtigung'));

      global.fetch = async () => new Response('{kaputt', { status: 200 });
      let corruptDataError = '';
      try { await smod.downloadData('test-token', 'file-id'); }
      catch (e) { corruptDataError = e.message; }
      check('storage: kaputte Drive-JSON wird nicht als leere Daten akzeptiert', corruptDataError.includes('ung\u00fcltig'));

      const enqueue = smod.createWriteQueue();
      const order = [];
      const first = enqueue(async () => {
        order.push('first-start');
        await Promise.resolve();
        order.push('first-end');
      });
      const second = enqueue(async () => { order.push('second'); });
      await Promise.all([first, second]);
      check('storage: Schreibqueue haelt die Reihenfolge ein', order.join('|') === 'first-start|first-end|second');
    } finally {
      global.fetch = originalFetch;
    }
    const tst = vmod.computeTimeStats([
      { pnl: 100, time: '09:15:00' },   // Xetra-Eroeffnung
      { pnl: -50, time: '13:30:00' },   // Mittagsflaute
      { pnl: 200, time: '15:45:00' },   // US-Eroeffnung
      { pnl: 80 }                        // ohne Zeit
    ]);
    check('timeStats: Xetra-Block korrekt', tst.blocks.find(b => b.key === 'open').n === 1 && tst.blocks.find(b => b.key === 'open').pnl === 100);
    check('timeStats: Mittagsflaute korrekt', tst.blocks.find(b => b.key === 'lunch').pnl === -50);
    check('timeStats: noTime gezaehlt', tst.noTime === 1);
    check('timeStats: Winrate US-Block 100%', tst.blocks.find(b => b.key === 'us').winrate === 100);
    check('timeStats: timeToMinutes', vmod.timeToMinutes('17:26:48') === 1046 && vmod.timeToMinutes('kaputt') === null);
    check('direction: Short/Put/Long/Call/neutral', vmod.tradeDirection('DAX Short 26.680 Turbo') === 'short' && vmod.tradeDirection('DAX Put OS') === 'short' && vmod.tradeDirection('DAX Long Turbo') === 'long' && vmod.tradeDirection('Call auf DAX') === 'long' && vmod.tradeDirection('ServiceNow') === 'neutral');
    const dst = vmod.computeTimeStats([
      { pnl: 100, time: '09:15:00', desc: 'DAX Long Turbo' },
      { pnl: -50, time: '09:30:00', desc: 'DAX Short Turbo' },
      { pnl: 30, time: '09:45:00', desc: 'ServiceNow' }
    ]);
    const ob = dst.blocks.find(b => b.key === 'open');
    check('timeStats: Long/Short getrennt gezaehlt', ob.long.n === 1 && ob.short.n === 1 && ob.n === 3);
    check('timeStats: Long-P&L korrekt', ob.long.pnl === 100 && ob.short.pnl === -50);
    check('timeStats: Long-Winrate 100/Short 0', ob.long.winrate === 100 && ob.short.winrate === 0);
    // buyTime-Modus + Overnight
    const bst = vmod.computeTimeStats([
      { pnl: 100, time: '15:45:00', buyTime: '09:15:00', buyDate: '2026-06-29', date: '2026-06-29', desc: 'DAX Long' },
      { pnl: -50, time: '08:30:00', buyTime: '17:00:00', buyDate: '2026-06-28', date: '2026-06-29', desc: 'DAX Short' }
    ], 'buy');
    check('timeStats buy-Modus: nach Einstiegszeit einsortiert', bst.blocks.find(b => b.key === 'open').n === 1 && bst.blocks.find(b => b.key === 'us').pnl === -50);
    check('timeStats: Overnight erkannt (buyDate != date)', bst.overnight.n === 1 && bst.overnight.pnl === -50);
    const sst = vmod.computeTimeStats([{ pnl: 100, time: '15:45:00', buyTime: '09:15:00', buyDate: '2026-06-29', date: '2026-06-29', desc: 'x' }], 'sell');
    check('timeStats sell-Modus: nach Ausstiegszeit', sst.blocks.find(b => b.key === 'us').n === 1);
    // fifo liefert buyDate/buyTime
    const fifoRows = [
      { type: 'Buy', status: 'Executed', isin: 'X', shares: 10, amount: -1000, date: '2026-06-29', time: '09:15:00' },
      { type: 'Sell', status: 'Executed', isin: 'X', shares: 10, amount: 1200, date: '2026-06-30', time: '10:00:00', tax: 50 }
    ];
    const fr = fmod.fifoMatch(fifoRows, [], false);
    check('fifo: buyDate/buyTime im Trade', fr.closed[0].buyDate === '2026-06-29' && fr.closed[0].buyTime === '09:15:00');
    const oversell = fmod.fifoMatch([
      { type: 'Buy', status: 'Executed', isin: 'OVER', shares: 5, amount: -500, date: '2026-06-29', time: '09:00:00' },
      { type: 'Sell', status: 'Executed', isin: 'OVER', shares: 6, amount: 600, date: '2026-06-29', time: '10:00:00', tax: 20 }
    ], [], false);
    check('fifo: Ueberverkauf wird als Fehler gemeldet',
      Array.isArray(oversell.errors) && oversell.errors.length === 1 &&
      oversell.errors[0].isin === 'OVER' && oversell.errors[0].unmatchedShares === 1);
    check('fifo: Ueberverkauf verbraucht keine offenen Lots',
      oversell.closed.length === 0 && oversell.openLots.length === 1 && oversell.openLots[0].shares === 5);
    // computeInsights: Overnight-Kategorien + Befunde
    const insTrades = [];
    for (let i = 0; i < 10; i++) insTrades.push({ pnl: -500, time: '09:00:00', buyTime: '15:30:00', buyDate: '2026-06-01', date: '2026-06-02', desc: 'DAX Long' });
    for (let i = 0; i < 10; i++) insTrades.push({ pnl: 400, time: '08:30:00', buyTime: '21:15:00', buyDate: '2026-06-01', date: '2026-06-02', desc: 'DAX Short' });
    const ins = vmod.computeInsights(insTrades);
    check('insights: stuck-Kategorie (11-19h) korrekt', ins.overnight.stuck.n === 10 && ins.overnight.stuck.pnl === -5000);
    check('insights: planned-Kategorie (ab 19h) korrekt', ins.overnight.planned.n === 10 && ins.overnight.planned.pnl === 4000);
    check('insights: overnight-stuck-Befund ausgeloest', ins.findings.some(f => f.id === 'overnight-stuck'));
    check('insights: Gesamt = stuck+planned', ins.overnight.total.n === 20);
    // diagnoseBucket: Ausreisser / Overnight / systematisch
    const dOut = vmod.diagnoseBucket([
      { pnl: -5000, desc: 'DAX Short', buyDate: '2026-06-01', date: '2026-06-03' },
      { pnl: -100, desc: 'DAX Long', buyDate: '2026-06-03', date: '2026-06-03' },
      { pnl: 200, desc: 'DAX Long', buyDate: '2026-06-03', date: '2026-06-03' }
    ]);
    check('diagnose: Ausreisser erkannt (>=70% Top-2)', dOut.tags.includes('outlier'));
    check('diagnose: Overnight-Anteil erkannt', dOut.tags.includes('overnight') && dOut.overnightCount === 1);
    check('diagnose: Short-Schieflage erkannt', dOut.dirSkew === 'short');
    const dSys = vmod.diagnoseBucket([-80,-90,-85,-95,-100,-88].map(p => ({ pnl: p, desc: 'DAX Long', buyDate: '2026-06-03', date: '2026-06-03' })));
    check('diagnose: systematisch erkannt (viele gleiche Verluste)', dSys.tags.includes('systematic'));
    check('diagnose: null ohne Verluste', vmod.diagnoseBucket([{ pnl: 50, desc: 'x' }]) === null);
    // Haltedauer + Monats-Disziplin
    check('holdMinutes: intraday korrekt', vmod.holdMinutes({ buyDate: '2026-06-29', buyTime: '09:00:00', date: '2026-06-29', time: '10:30:00', pnl: 1 }) === 90);
    check('holdMinutes: overnight korrekt', vmod.holdMinutes({ buyDate: '2026-06-28', buyTime: '22:00:00', date: '2026-06-29', time: '08:00:00', pnl: 1 }) === 600);
    check('holdMinutes: null ohne buyTime', vmod.holdMinutes({ date: '2026-06-29', time: '10:00:00', pnl: 1 }) === null);
    const hs = vmod.computeHoldStats([
      { buyDate: '2026-06-29', buyTime: '09:00:00', date: '2026-06-29', time: '09:30:00', pnl: 100 },
      { buyDate: '2026-06-29', buyTime: '09:00:00', date: '2026-06-29', time: '11:00:00', pnl: -50 }
    ]);
    check('computeHoldStats: Mediane + Ratio', hs.winMedian === 30 && hs.lossMedian === 120 && hs.ratio === 4);
    const mdisc = vmod.computeMonthlyDiscipline([
      { date: '2026-06-05', pnl: 300, buyDate: '2026-06-05', buyTime: '09:00:00', time: '10:00:00' },
      { date: '2026-06-10', pnl: -1500, buyDate: '2026-06-09', buyTime: '15:00:00', time: '09:00:00' },
      { date: '2026-07-01', pnl: 100, buyDate: '2026-07-01', buyTime: '09:00:00', time: '09:20:00' }
    ]);
    check('monthlyDiscipline: 2 Monate sortiert', mdisc.length === 2 && mdisc[0].month === '2026-06');
    check('monthlyDiscipline: Grossverlust gezaehlt', mdisc[0].bigLossN === 1 && mdisc[0].bigLossSum === -1500);
    check('monthlyDiscipline: Overnight-P&L', mdisc[0].overnightPnl === -1500 && mdisc[0].overnightN === 1);
  } catch (e) {
    check('ECHTE Module importierbar (' + e.message + ')', false);
  }
})();

console.log('\n=== 6b. FEATURE CALCULATION LOGIC ===');
(function () {
  const TAX_RATE = 0.26375;
  function closePnl(cost, sell) {
    const gross = sell - cost;
    const tax = +(gross * TAX_RATE).toFixed(2);
    const pnl = +(sell - cost - tax).toFixed(2);
    return { tax, pnl };
  }
  const totalLoss = closePnl(1500, 0);
  check('Totalverlust 1500\u20ac: Erstattung = -395.63', totalLoss.tax === -395.63);
  check('Totalverlust 1500\u20ac: netto P&L = -1104.37', totalLoss.pnl === -1104.37);
  const residual = closePnl(1500, 50);
  check('Restwert 50\u20ac: netto P&L = -1067.56', residual.pnl === -1067.56);
  const winClose = closePnl(1000, 2000);
  check('Gewinn-Close 1000->2000: Steuer = 263.75', winClose.tax === 263.75);
  check('Gewinn-Close 1000->2000: netto P&L = 736.25', winClose.pnl === 736.25);

  function manualPnl(buy, sell, tax) { return +(sell - buy - tax).toFixed(2); }
  check('Manueller Gewinn: 5000-4000-264 = 736', manualPnl(4000, 5000, 264) === 736);
  check('Manueller Verlust m. Erstattung: 2500-3000-(-80) = -420', manualPnl(3000, 2500, -80) === -420);

  const sample = [{ tax: 131.88 }, { tax: -131.88 }];
  const totalTax = sample.reduce((s, t) => s + t.tax, 0);
  check('Gemischte Steuer summiert mit Vorzeichen = 0', Math.abs(totalTax) < 0.01);
})();

console.log('\n=== 6c. IMPORT ROBUSTHEIT ===');
check('UI escaped Texte aus CSV und JSON vor innerHTML',
  appJs.includes('escapeHtml(p.desc)') &&
  appJs.includes('escapeHtml(p.isin)') &&
  appJs.includes('escapeHtml(t.desc)') &&
  appJs.includes('escapeHtml(t.date)'));
check('Import blockiert FIFO-Ueberverkaeufe vor dem Speichern',
  appJs.includes('const { trades: closed, openLots, errors } = replayImportLedger') &&
  appJs.includes('if (errors.length > 0)'));
check('App persistiert Import-Ledger getrennt von Legacy-Trades',
  appJs.includes('importRows') &&
  appJs.includes('importBaseOpenLots') &&
  appJs.includes('replayImportLedger'));
check('Import-Ledger speichert auch reine Buy-Zeilen ohne Verkauf',
  appJs.includes('const newImportRowCount =') &&
  appJs.includes('if (newImportRowCount > 0)'));
check('Ledger erfasst manuelles Schliessen als Rohverkauf',
  appJs.includes('if (hasImportLedger())') &&
  appJs.includes("type: 'Sell', status: 'Executed'") &&
  appJs.includes('mergeImportRows(DATA.importRows'));
check('Ledger blockiert Loeschen offener Positionen ohne Rohereignis',
  /function deleteOpenPosition[\s\S]{0,300}if \(hasImportLedger\(\)\)/.test(appJs));
check('App serialisiert Drive-Speichervorgaenge mit Snapshot',
  appJs.includes('const enqueuePersist = createWriteQueue()') &&
  appJs.includes('const snapshot = JSON.parse(JSON.stringify(DATA))'));
check('import.js: parseScalableCsv vorhanden', appJs.includes('export function parseScalableCsv'));
check('import.js: deutsche Zahlen-Parser', appJs.includes('export function parseGermanNumber'));
check('import.js: Pflichtspalten-Pruefung', appJs.includes("const REQUIRED_COLUMNS = ['type', 'status', 'isin'"));
check('importError-Funktion vorhanden', appJs.includes('function importError('));
check('leere Datei abgefangen', appJs.includes('Keine Datenzeilen'));
check('fehlende Spalten gemeldet', appJs.includes('Spalten fehlen im Export'));
check('Dateityp-Check (.csv)', appJs.includes('.csv$/i.test'));
check('deleteOpenPosition vorhanden', appJs.includes('async function deleteOpenPosition'));
check('deleteOpenPosition: Sicherheitsabfrage', appJs.includes("confirm('Offene Position l"));
check('deleteOpenPosition: filtert nur Ziel-ISIN', appJs.includes('DATA.openLots.filter(l => l.isin !== isin)'));
check('deleteOpenPosition: speichert nach Loeschen', /deleteOpenPosition[\s\S]{0,900}await persist\(\)/.test(appJs));
check('Loeschen-Button an Positions-Karte', appJs.includes('btn-del-pos') && appJs.includes('deleteOpenPosition(p.isin)'));
check('fifo: Verkaufszeit wird gespeichert', appJs.includes("time: String(row.time || '')"));
check('Export-CSV enthaelt Zeit-Spalte', appJs.includes('UID;Datum;Zeit;ISIN') && appJs.includes("t.time || ''"));
check('Long/Short-Zeile in Phasen-Karte', appJs.includes('ts-dir-row') && appJs.includes("dirLine(b.long, 'Long')"));
check('Long/Short-Zeile im Stunden-Profil', appJs.includes('ts-hour-dir') && appJs.includes("dirPart(b.long, 'Long')"));
check('Einstieg/Ausstieg-Umschalter vorhanden', html.includes('ts-mode-buy') && appJs.includes('function setTsMode'));
check('Overnight-Anzeige vorhanden', html.includes('ts-overnight') && appJs.includes('Nacht gehalten'));
check('Erkenntnisse-Box vorhanden', html.includes('id="ts-insights"') && appJs.includes('function buildInsights'));
check('Overnight-Analyse-Tabelle vorhanden', html.includes('id="ts-on-detail"') && appJs.includes('ts-on-table'));
check('buildInsights wird aufgerufen', appJs.includes('buildInsights();'));
check('Stunden-Diagnose gerendert bei roten Stunden', appJs.includes('ts-hour-diag') && appJs.includes('function diagText'));
check('Disziplin-Trend-Tabelle vorhanden', html.includes('id="ts-discipline"') && appJs.includes('function buildDiscipline'));
check('FOMO-Befund-Text vorhanden', appJs.includes('FOMO-Check'));
check('CSS fuer Stunden-Richtungszeile', html.includes('.ts-hour-dir{'));
check('Statistik-Tab in Tab-Order', appJs.includes("'open', 'timestats'"));
check('buildTimeStats vorhanden + in rebuildAll', appJs.includes('function buildTimeStats') && /rebuildAll[\s\S]{0,400}buildTimeStats\(\)/.test(appJs) || appJs.includes('buildTimeStats();'));
check('HTML: Statistik-Section vorhanden', html.includes('id="tab-timestats"') && html.includes('ts-blocks'));

console.log('\n=== 6d. VERSION ===');
{
  const cfgMatch = appJs.match(/APP_VERSION\s*=\s*'([^']+)'/);
  const swMatch = swJs.match(/CACHE\s*=\s*'trade-kalender-(v\d+)'/);
  const cfgVer = cfgMatch ? cfgMatch[1] : null;
  const swVer = swMatch ? swMatch[1] : null;
  check('APP_VERSION in config.js gesetzt', !!cfgVer);
  check('SW Cache-Version gesetzt', !!swVer);
  check('APP_VERSION (' + cfgVer + ') == SW-Version (' + swVer + ')', cfgVer === swVer);
  check('Version wird im Header angezeigt', html.includes('id="app-version"') && appJs.includes("$('app-version')"));
  check('Version wird im Login angezeigt', html.includes('id="login-version"'));
}

console.log('\n=== 7. DOM BEHAVIOR (jsdom) ===');
try {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const doc = dom.window.document;
  check('login screen present', !!doc.getElementById('login-screen'));
  check('app-main present', !!doc.getElementById('app-main'));
  check('bottom-bar present', !!doc.getElementById('bottom-bar'));
  check('all 5 nav tabs present', doc.querySelectorAll('.nav-tab').length === 5);
  check('all 5 bottom-bar tabs present', doc.querySelectorAll('#bottom-bar button[data-tab]').length === 5);
  // HTML-Struktur-Integritaet: faengt kaputte Einfuegungen (zerschnittener
  // DOCTYPE, Sections ausserhalb des App-Containers) VOR dem Deployment.
  check('HTML beginnt mit <!DOCTYPE html>', html.trimStart().toLowerCase().startsWith('<!doctype html>'));
  const tOpen = doc.getElementById('tab-open');
  const tStats = doc.getElementById('tab-timestats');
  check('tab-timestats existiert im DOM', !!tStats);
  check('tab-timestats ist Geschwister von tab-open (gleicher Parent)', !!tOpen && !!tStats && tStats.parentElement === tOpen.parentElement);
  const allSections = [...doc.querySelectorAll('.section')];
  const firstParent = allSections[0] && allSections[0].parentElement;
  check('alle .section-Tabs im selben Container', allSections.length >= 5 && allSections.every(s => s.parentElement === firstParent));
  check('kein Streutext vor <html> (kaputter Einbau)', !doc.body.textContent.includes('html>'));
  check('calendar container present', !!doc.getElementById('cal-container'));
  check('Monats-Kalender: Navigation (calMonth state)', appJs.includes('let calMonth') && appJs.includes('let calYear'));
  check('Monats-Kalender: nur Handelstage Mo-Fr', appJs.includes("['Mo', 'Di', 'Mi', 'Do', 'Fr']"));
  check('Monats-Kalender: Sa/So uebersprungen', appJs.includes('if (dow > 4) continue'));
  check('Monats-Kalender: Datumszahl + Betrag', appJs.includes("String(day).padStart(2, '0') + '.'"));
  check('add modal present', !!doc.getElementById('add-overlay'));
  check('edit modal present', !!doc.getElementById('edit-overlay'));
  check('import modal present', !!doc.getElementById('import-overlay'));
  check('close-position modal present', !!doc.getElementById('close-pos-overlay'));
  check('capital card present', !!doc.getElementById('s-capital'));
  check('rendite card present', !!doc.getElementById('s-rendite'));
} catch (e) {
  check('jsdom load (' + e.message + ')', false);
}

realFifoCheck.then(() => {
  console.log('\n========================================');
  console.log('  ' + pass + ' passed, ' + fail + ' failed');
  console.log('========================================');
  if (fail > 0) { console.log('FAILED: ' + fails.join(' | ')); process.exit(1); }
  console.log('ALL GREEN \u2014 safe to deliver');
});
