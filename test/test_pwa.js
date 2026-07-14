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
const appControllerJs = fs.readFileSync(DIR + '/js/app.js', 'utf8');
const navigationPath = DIR + '/js/navigation.js';
const navigationJs = fs.existsSync(navigationPath)
  ? fs.readFileSync(navigationPath, 'utf8')
  : '';
check('UI-Controller: Navigation liegt in einem eigenen Modul',
  fs.existsSync(navigationPath) && appControllerJs.includes("from './navigation.js'") &&
  !appControllerJs.includes('function showTab(') &&
  !appControllerJs.includes('function setStatsView(') &&
  !appControllerJs.includes('function mobileTab('));
const tradeDialogsPath = DIR + '/js/trade-dialogs.js';
check('UI-Controller: Trade-Formulare liegen in einem eigenen Dialogmodul',
  fs.existsSync(tradeDialogsPath) && appControllerJs.includes("from './trade-dialogs.js'") &&
  !appControllerJs.includes('function updatePnlPreview(') &&
  !appControllerJs.includes('function updateEditPreview(') &&
  !appControllerJs.includes("$('f-desc').value = ''"));
const tradeSearchPath = DIR + '/js/trade-search.js';
const tradeSearchJs = fs.existsSync(tradeSearchPath)
  ? fs.readFileSync(tradeSearchPath, 'utf8')
  : '';
check('UI-Controller: Trade-Suche liegt in einem eigenen Render-Modul',
  fs.existsSync(tradeSearchPath) && appControllerJs.includes("from './trade-search.js'") &&
  !appControllerJs.includes('function tradeSearchFilters(') &&
  !appControllerJs.includes("row.className = 'search-result-row'"));
const positionDialogPath = DIR + '/js/position-dialog.js';
check('UI-Controller: Positionsdialog liegt in einem eigenen UI-Modul',
  fs.existsSync(positionDialogPath) && appControllerJs.includes("from './position-dialog.js'") &&
  !appControllerJs.includes('function updateClosePreview(') &&
  !appControllerJs.includes("$('cp-name').textContent"));
const importDialogsPath = DIR + '/js/import-dialogs.js';
check('UI-Controller: Importdialoge liegen in einem eigenen UI-Modul',
  fs.existsSync(importDialogsPath) && appControllerJs.includes("from './import-dialogs.js'") &&
  !appControllerJs.includes('function renderImportReport(') &&
  !appControllerJs.includes("$('import-tbody')"));
// Der Service Worker wird aus index.html mit './sw.js' registriert. Er muss
// deshalb im Projekt-Root liegen: Unter js/ haette er nur den Scope /js/ und
// koennte weder die App-Seite noch die PWA-Root-Route kontrollieren.
const swPath = DIR + '/sw.js';
const hasRootServiceWorker = fs.existsSync(swPath);
check('Service Worker liegt im Projekt-Root', hasRootServiceWorker);
const swJs = hasRootServiceWorker ? fs.readFileSync(swPath, 'utf8') : '';
const html = fs.readFileSync(DIR + '/index.html', 'utf8');
const backlogPath = DIR + '/BACKLOG.md';
const backlog = fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, 'utf8') : '';
check('Projekt-Backlog mit offenen Punkten vorhanden',
  backlog.includes('# App-Backlog') && backlog.includes('## Prioritaet 1'));
check('Verworfener CSV-Komplettneuaufbau ist nicht mehr ausfuehrbar',
  backlog.includes('### Legacy-Daten vollstaendig neu aufbauen') &&
  backlog.includes('**Status:** Verworfen') &&
  !fs.existsSync(DIR + '/js/migration.js') &&
  !html.includes('id="import-rebuild-mode"') &&
  !appJs.includes('buildFullRebuild'));
if (hasRootServiceWorker) {
try { acorn.parse(swJs, { ecmaVersion: 2020 }); check('sw.js parses', true); }
catch (e) { check('sw.js parses (' + e.message + ')', false); }
const offlineAssets = [
  './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './js/app.js', './js/config.js', './js/fifo.js', './js/helpers.js',
  './js/import-dialogs.js', './js/import.js', './js/navigation.js',
  './js/position-dialog.js', './js/storage.js',
  './js/trade-dialogs.js', './js/trade-search.js', './js/views.js'
];
check('PWA: alle lokalen App-Assets werden vorgeladen', offlineAssets.every(asset => swJs.includes("'" + asset + "'")));
check('PWA: Navigation hat einen Offline-Fallback auf index.html',
  swJs.includes("e.request.mode === 'navigate'") && swJs.includes("caches.match('./index.html')"));
check('PWA: Google Auth und Drive werden nie gecacht',
  swJs.includes("url.includes('googleapis.com')") && swJs.includes("url.includes('accounts.google.com')"));
}

console.log('\n=== 1a. STANDARD-TESTLAUF UND CI ===');
const packagePath = DIR + '/package.json';
const lockPath = DIR + '/package-lock.json';
const workflowPath = DIR + '/.github/workflows/test.yml';
const packageJson = fs.existsSync(packagePath)
  ? JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  : {};
const workflow = fs.existsSync(workflowPath)
  ? fs.readFileSync(workflowPath, 'utf8')
  : '';
check('Entwicklung: npm test ist der zentrale Testeinstieg',
  packageJson.scripts && packageJson.scripts.test === 'node test/test_pwa.js');
check('CI: reproduzierbare Installation ist durch Lockfile und npm ci festgelegt',
  fs.existsSync(lockPath) && /^\s+run: npm ci\s*$/m.test(workflow));
check('CI: Tests laufen bei Push und Pull Request',
  /^\s{2}push:\s*$/m.test(workflow) && /^\s{2}pull_request:\s*$/m.test(workflow) &&
  /^\s+run: npm test\s*$/m.test(workflow));
check('CI: Workflow besitzt nur lesenden Repository-Zugriff',
  /^permissions:\s*\r?\n\s{2}contents: read\s*$/m.test(workflow));
check('CI: Node-Version und npm-Cache sind explizit festgelegt',
  /node-version:\s*['"]?24['"]?/.test(workflow) && /^\s+cache: npm\s*$/m.test(workflow));

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
          if (node.declaration.type === 'ClassDeclaration') exp.add(node.declaration.id.name);
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

  // Das Google-Script ist async und kann vor dem ES-Modul fertig sein. Der
  // HTML-Callback muss deshalb auch mit einem noch leeren window funktionieren;
  // eine spaetere Modulpruefung uebernimmt danach die Initialisierung.
  const gisTag = html.match(/<script[^>]+accounts\.google\.com\/gsi\/client[^>]*>/);
  const gisOnload = gisTag && gisTag[0].match(/onload="([^"]+)"/);
  let earlyGisCallbackSafe = false;
  if (gisOnload) {
    try {
      require('vm').runInNewContext(gisOnload[1], { window: {} });
      earlyGisCallbackSafe = true;
    } catch (_) {}
  }
  check('Google-Callback bleibt sicher, wenn das async Script vor dem ES-Modul laedt',
    earlyGisCallbackSafe);
  check('Google-Auth wird nach fruehem Script-Load beim Modulstart nachgeholt',
    appJs.includes('if (window.google && window.google.accounts && window.google.accounts.oauth2)') &&
    appJs.indexOf('window.gisLoaded = gisLoaded') <
      appJs.indexOf('if (window.google && window.google.accounts && window.google.accounts.oauth2)'));
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
check('DATA und JSON-Restore unterstuetzen entfernte offene Positionen',
  appJs.includes('hiddenOpenPositions: []') &&
  appJs.includes('Array.isArray(parsed.hiddenOpenPositions)'));

console.log('\n=== 6. CALCULATION LOGIC vs GOLDEN ===');
// Load app.js core funcs into a sandbox and replay the golden dataset through the same
// pnl/tax math the app uses. We mimic confirmImport's per-trade math.
const golden = JSON.parse(fs.readFileSync(__dirname + '/golden.json', 'utf8'));
// Reconstruct FIFO in JS exactly as parseXlsx does, fed from test2-derived rows.
const goldRows = JSON.parse(fs.readFileSync(__dirname + '/gold_rows.json', 'utf8'));
// Die Referenzdaten liegen im öffentlichen Repository. Eindeutige Marker und
// Zukunftsdaten verhindern, dass erneut ein persönlicher Broker-Export als
// bequeme Test-Fixture eingecheckt wird.
check('Golden-Fixture enthaelt nur synthetische ISINs',
  goldRows.length > 0 && goldRows.every(row => String(row.isin || '').startsWith('SYNTH-')));
check('Golden-Fixture enthaelt nur synthetische Beschreibungen',
  goldRows.every(row => String(row.description || '').startsWith('Synthetisch:')));
check('Golden-Fixture enthaelt nur synthetische Zukunftsdaten',
  goldRows.every(row => String(row.date || '').startsWith('2099-')));
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
    const { closed, openLots } = mod.fifoMatch(goldRows, [], true);
    const rPnl = +closed.reduce((s, t) => s + t.pnl, 0).toFixed(2);
    const rTax = +closed.reduce((s, t) => s + t.tax, 0).toFixed(2);
    check('ECHTE fifoMatch: Trades = ' + golden.trades, closed.length === golden.trades);
    check('ECHTE fifoMatch: P&L = ' + golden.pnl, Math.abs(rPnl - golden.pnl) < 0.5);
    check('ECHTE fifoMatch: Steuer = ' + golden.tax, Math.abs(rTax - golden.tax) < 0.5);
    check('ECHTE fifoMatch: offene Lots = ' + golden.openLots,
      openLots.length === golden.openLots);
    const rOpenCost = +openLots.reduce((s, lot) => s + lot.amount, 0).toFixed(2);
    check('ECHTE fifoMatch: offener Einstand = ' + golden.openCost,
      Math.abs(rOpenCost - golden.openCost) < 0.01);
    // views.js: Aggregation muss die Gesamtsumme erhalten
    const vmod = await import('file://' + DIR + '/js/views.js');
    const fmod = await import('file://' + DIR + '/js/fifo.js');
    const navmod = fs.existsSync(navigationPath)
      ? await import('file://' + navigationPath)
      : null;
    const dialogmod = fs.existsSync(tradeDialogsPath)
      ? await import('file://' + tradeDialogsPath)
      : null;
    const searchmod = fs.existsSync(tradeSearchPath)
      ? await import('file://' + tradeSearchPath)
      : null;
    const positionmod = fs.existsSync(positionDialogPath)
      ? await import('file://' + positionDialogPath)
      : null;
    const importdialogsmod = fs.existsSync(importDialogsPath)
      ? await import('file://' + importDialogsPath)
      : null;
    check('navigation: alle Desktop- und Mobilfunktionen exportiert',
      !!navmod && ['showTab', 'setStatsView', 'handleStatsViewKey', 'mobileTab',
        'toggleMobileActions', 'closeMobileActions']
        .every(name => typeof navmod[name] === 'function'));

    const navDom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
    const previousWindow = global.window;
    const previousDocument = global.document;
    global.window = navDom.window;
    global.document = navDom.window.document;
    let scrollCalls = 0;
    navDom.window.scrollTo = () => { scrollCalls++; };
    try {
      if (navmod) navmod.showTab('timestats');
      check('navigation: Haupttab aktiviert Section und Standard-Statistikbereich',
        !!navmod && navDom.window.document.getElementById('tab-timestats').classList.contains('active') &&
        navDom.window.document.querySelector('.nav-tab.active').textContent.trim() === 'Statistik' &&
        !navDom.window.document.getElementById('stats-view-performance').hidden);

      if (navmod) navmod.setStatsView('timing');
      check('navigation: Statistikbereich aktualisiert Sichtbarkeit und ARIA-Zustand',
        !!navmod && !navDom.window.document.getElementById('stats-view-timing').hidden &&
        navDom.window.document.getElementById('stats-view-performance').hidden &&
        navDom.window.document.getElementById('stats-nav-timing').getAttribute('aria-selected') === 'true');

      const timingButton = navDom.window.document.getElementById('stats-nav-timing');
      timingButton.focus();
      let prevented = false;
      if (navmod) navmod.handleStatsViewKey({ key: 'ArrowRight', preventDefault: () => { prevented = true; } });
      check('navigation: Pfeiltaste wechselt und fokussiert den naechsten Statistikbereich',
        !!navmod && prevented &&
        navDom.window.document.getElementById('stats-nav-behavior').classList.contains('active') &&
        navDom.window.document.activeElement.id === 'stats-nav-behavior');

      navDom.window.document.getElementById('mobile-actions').classList.add('open');
      if (navmod) navmod.mobileTab('monthly');
      check('navigation: mobiler Tab synchronisiert Navigation, schliesst Aktionen und scrollt hoch',
        !!navmod &&
        navDom.window.document.querySelector('#bottom-bar button.active').dataset.tab === 'monthly' &&
        !navDom.window.document.getElementById('mobile-actions').classList.contains('open') &&
        scrollCalls === 1);
    } finally {
      global.window = previousWindow;
      global.document = previousDocument;
      navDom.window.close();
    }

    check('tradeDialogs: Formular- und Vorschaufunktionen exportiert',
      !!dialogmod && ['openAddModal', 'closeAddModal', 'updatePnlPreview',
        'readAddTradeForm', 'openEditTradeDialog', 'closeEditModal',
        'updateEditPreview', 'readEditTradeForm']
        .every(name => typeof dialogmod[name] === 'function'));
    const dialogDom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
    global.window = dialogDom.window;
    global.document = dialogDom.window.document;
    try {
      if (dialogmod) dialogmod.openAddModal('2026-07-14');
      check('tradeDialogs: Hinzufuegen oeffnet mit Wunschdatum und leerem Formular',
        !!dialogmod && dialogDom.window.document.getElementById('add-overlay').classList.contains('open') &&
        dialogDom.window.document.getElementById('f-date').value === '2026-07-14' &&
        dialogDom.window.document.getElementById('f-desc').value === '' &&
        dialogDom.window.document.getElementById('pnl-preview').textContent.includes('0,00'));

      dialogDom.window.document.getElementById('f-desc').value = 'Test Long';
      dialogDom.window.document.getElementById('f-buy').value = '100';
      dialogDom.window.document.getElementById('f-sell').value = '150';
      dialogDom.window.document.getElementById('f-tax').value = '10';
      if (dialogmod) dialogmod.updatePnlPreview();
      const addForm = dialogmod ? dialogmod.readAddTradeForm() : {};
      check('tradeDialogs: Hinzufuegen liest Zahlen und berechnet die Vorschau',
        addForm.desc === 'Test Long' && addForm.buy === 100 && addForm.sell === 150 &&
        addForm.tax === 10 && dialogDom.window.document.getElementById('pnl-preview').textContent.includes('40,00'));

      if (dialogmod) dialogmod.openEditTradeDialog({
        uid: 'import-1', date: '2026-07-13', desc: 'DAX Short', broker: 'scalable',
        shares: 2, buy: 200, sell: 150, tax: -10, source: 'import'
      });
      check('tradeDialogs: Import-Editor sperrt FIFO-Einstand und Broker sichtbar',
        !!dialogmod && dialogDom.window.document.getElementById('e-buy').readOnly &&
        dialogDom.window.document.getElementById('e-broker').disabled &&
        dialogDom.window.document.getElementById('e-import-note').style.display === 'block' &&
        dialogDom.window.document.getElementById('edit-pnl-preview').textContent.includes('FIFO'));

      if (dialogmod) dialogmod.openEditTradeDialog({
        uid: 'manual-1', date: '2026-07-12', desc: 'Manuell', broker: 'tr',
        shares: 1, buy: 80, sell: 120, tax: 5
      });
      const editForm = dialogmod ? dialogmod.readEditTradeForm() : {};
      check('tradeDialogs: Manueller Editor entsperrt Felder und liefert Formulardaten',
        !!dialogmod && !dialogDom.window.document.getElementById('e-buy').readOnly &&
        !dialogDom.window.document.getElementById('e-broker').disabled &&
        editForm.uid === 'manual-1' && editForm.buy === 80 && editForm.sell === 120 &&
        dialogDom.window.document.getElementById('edit-pnl-preview').textContent.includes('35,00'));
    } finally {
      global.window = previousWindow;
      global.document = previousDocument;
      dialogDom.window.close();
    }

    check('positionDialog: Formular- und Vorschaufunktionen exportiert',
      !!positionmod && ['openClosePositionDialog', 'closeClosePositionDialog',
        'readClosePositionForm', 'setCloseTotalLoss', 'updateClosePreview',
        'onCloseTaxInput']
        .every(name => typeof positionmod[name] === 'function'));
    const positionDom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
    global.window = positionDom.window;
    global.document = positionDom.window.document;
    const positionLots = [
      { desc: 'DAX Long', shares: 1.25, amount: 1000 },
      { desc: 'DAX Long', shares: 0.75, amount: 500 }
    ];
    try {
      if (positionmod) positionmod.openClosePositionDialog(positionLots, '2026-07-14');
      check('positionDialog: Oeffnen zeigt aggregierte Position und Verlustvorschau',
        !!positionmod && positionDom.window.document.getElementById('close-pos-overlay').classList.contains('open') &&
        positionDom.window.document.getElementById('cp-name').textContent === 'DAX Long' &&
        positionDom.window.document.getElementById('cp-info').textContent.includes('2 St\u00fcck') &&
        positionDom.window.document.getElementById('cp-date').value === '2026-07-14' &&
        positionDom.window.document.getElementById('cp-tax').value === '-395.63' &&
        positionDom.window.document.getElementById('cp-preview').textContent.includes('-1.104,37'));

      positionDom.window.document.getElementById('cp-sell').value = '2000';
      if (positionmod) positionmod.updateClosePreview();
      check('positionDialog: Gewinn berechnet automatische Steuer mit 26,375 Prozent',
        !!positionmod && positionDom.window.document.getElementById('cp-tax').value === '131.88' &&
        positionDom.window.document.getElementById('cp-preview').textContent.includes('368,12'));

      positionDom.window.document.getElementById('cp-tax').value = '100';
      if (positionmod) positionmod.onCloseTaxInput();
      const closeForm = positionmod ? positionmod.readClosePositionForm() : {};
      check('positionDialog: Manuelle Steuer bleibt erhalten und Formulardaten sind numerisch',
        closeForm.date === '2026-07-14' && closeForm.sell === 2000 && closeForm.tax === 100 &&
        positionDom.window.document.getElementById('cp-tax').dataset.touched === '1' &&
        positionDom.window.document.getElementById('cp-preview').textContent.includes('400,00'));

      if (positionmod) {
        positionmod.openClosePositionDialog(positionLots, '2026-07-15');
        positionmod.setCloseTotalLoss();
      }
      check('positionDialog: Totalverlust setzt Verkauf auf null und Steuererstattung automatisch',
        !!positionmod && positionDom.window.document.getElementById('cp-sell').value === '0' &&
        positionDom.window.document.getElementById('cp-tax').value === '-395.63' &&
        positionDom.window.document.getElementById('cp-preview').textContent.includes('Steuererstattung'));

      if (positionmod) positionmod.closeClosePositionDialog();
      check('positionDialog: Schliessen entfernt den sichtbaren Dialogzustand',
        !!positionmod && !positionDom.window.document.getElementById('close-pos-overlay').classList.contains('open'));
    } finally {
      global.window = previousWindow;
      global.document = previousDocument;
      positionDom.window.close();
    }

    check('importDialogs: Dialog-, Datei- und Renderfunktionen exportiert',
      !!importdialogsmod && ['openImportDialog', 'closeImportDialog',
        'closeImportMigration', 'chooseImportMigrationFile',
        'handleImportDragOver', 'handleImportDragLeave', 'handleImportDrop',
        'readImportFile', 'showImportError', 'renderImportMigration',
        'renderImportReport', 'renderImportPreview', 'showSavedImportReport']
        .every(name => typeof importdialogsmod[name] === 'function'));
    const importDom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
    global.window = importDom.window;
    global.document = importDom.window.document;
    const importReport = {
      newBrokerRows: 2, duplicateBrokerRows: 1, acceptedRows: 3, sourceRows: 4,
      rejectedRows: 1, newClosedTrades: 1, duplicateClosedTrades: 1,
      openPositionsAfter: 2, openPositionsBefore: 1, openPositionsDelta: 1,
      pnlAfter: 120, pnlBefore: 100, pnlDelta: 20,
      taxAfter: 30, taxBefore: 20, taxDelta: 10
    };
    const previewTrades = Array.from({ length: 41 }, (_, index) => ({
      date: '2026-07-' + String((index % 28) + 1).padStart(2, '0'),
      desc: index === 0 ? '<img src=x> DAX Long' : 'DAX Trade ' + index,
      shares: 1, buy: 100, sell: 120, pnl: 20, isDup: index === 1
    }));
    try {
      importDom.window.document.getElementById('import-migration-overlay').classList.add('open');
      importDom.window.document.getElementById('import-tbody').innerHTML = '<tr><td>alt</td></tr>';
      if (importdialogsmod) importdialogsmod.openImportDialog();
      check('importDialogs: Oeffnen setzt die komplette Importansicht zurueck',
        !!importdialogsmod && importDom.window.document.getElementById('import-overlay').classList.contains('open') &&
        !importDom.window.document.getElementById('import-migration-overlay').classList.contains('open') &&
        importDom.window.document.getElementById('import-tbody').children.length === 0 &&
        importDom.window.document.getElementById('drop-zone').style.display === 'block' &&
        importDom.window.document.getElementById('import-preview').style.display === 'none' &&
        importDom.window.document.getElementById('import-confirm-btn').style.display === 'none');

      if (importdialogsmod) importdialogsmod.showImportError('CSV ist ungueltig');
      check('importDialogs: Fehleransicht erklaert den Fehler ohne alte Vorschau',
        !!importdialogsmod && importDom.window.document.getElementById('import-summary').textContent === 'CSV ist ungueltig' &&
        importDom.window.document.getElementById('import-summary').classList.contains('warn') &&
        importDom.window.document.getElementById('import-summary').style.display === 'block' &&
        importDom.window.document.getElementById('import-report').style.display === 'none');

      if (importdialogsmod) importdialogsmod.renderImportMigration({
        legacyTradeCount: 2, baseOpenLotCount: 1,
        historyFrom: '2026-01-01', historyTo: '2026-02-01', cutoff: '2026-02-01',
        overlapCount: 1, incomingRowCount: 5, rowsWithoutDate: 1,
        rowsAtOrBeforeCutoff: 3, rowsAfterCutoff: 1
      });
      check('importDialogs: Migrationsdialog zeigt Bestand, Zeitraum und sicheren Schnitt',
        !!importdialogsmod && importDom.window.document.getElementById('import-migration-overlay').classList.contains('open') &&
        importDom.window.document.getElementById('migration-existing-count').textContent.includes('2 geschlossene Trades') &&
        importDom.window.document.getElementById('migration-history-range').textContent === '01.01.2026 bis 01.02.2026' &&
        importDom.window.document.getElementById('migration-cutoff').textContent.includes('01.02.2026') &&
        importDom.window.document.getElementById('migration-row-summary').textContent.includes('1 ohne Datum'));

      if (importdialogsmod) importdialogsmod.renderImportPreview(previewTrades, importReport, 2, 1);
      const previewRows = importDom.window.document.querySelectorAll('#import-tbody tr');
      check('importDialogs: Vorschau begrenzt Zeilen, markiert Duplikate und bleibt HTML-sicher',
        !!importdialogsmod && previewRows.length === 41 && previewRows[1].classList.contains('dup') &&
        importDom.window.document.querySelector('#import-tbody img') === null &&
        previewRows[0].textContent.includes('<img src=x> DAX Long') &&
        previewRows[40].textContent.includes('1 weitere'));
      check('importDialogs: Kontrollbericht und Importaktion zeigen die berechneten Werte',
        !!importdialogsmod && importDom.window.document.getElementById('import-report-state').textContent.includes('Vorschau') &&
        importDom.window.document.getElementById('import-report-rows').textContent === '2 neu' &&
        importDom.window.document.getElementById('import-report-pnl').textContent.includes('120,00') &&
        importDom.window.document.getElementById('import-confirm-btn').textContent === '1 Trade importieren');

      if (importdialogsmod) importdialogsmod.showSavedImportReport(importReport);
      check('importDialogs: Gespeicherter Bericht bleibt sichtbar und sperrt erneutes Bestaetigen',
        !!importdialogsmod && importDom.window.document.getElementById('import-report').classList.contains('saved') &&
        importDom.window.document.getElementById('import-report-state').textContent === 'Import gespeichert' &&
        importDom.window.document.getElementById('import-preview').style.display === 'none' &&
        importDom.window.document.getElementById('import-confirm-btn').style.display === 'none');

      let droppedFile = null;
      let prevented = false;
      const fakeFile = { name: 'broker.csv' };
      importDom.window.document.getElementById('drop-zone').classList.add('dragover');
      if (importdialogsmod) importdialogsmod.handleImportDrop({
        preventDefault: () => { prevented = true; },
        dataTransfer: { files: [fakeFile] }
      }, file => { droppedFile = file; });
      check('importDialogs: Drop-Zone entfernt Hervorhebung und reicht die Datei weiter',
        prevented && droppedFile === fakeFile &&
        !importDom.window.document.getElementById('drop-zone').classList.contains('dragover'));

      let fileError = '';
      if (importdialogsmod) importdialogsmod.readImportFile(
        { name: 'broker.xlsx' }, () => {}, message => { fileError = message; }
      );
      check('importDialogs: Dateiauswahl lehnt Nicht-CSV vor dem Lesen ab',
        fileError.includes('.csv-Datei'));

      let filePickerClicks = 0;
      importDom.window.document.getElementById('csv-input').addEventListener('click', () => { filePickerClicks++; });
      if (importdialogsmod) importdialogsmod.chooseImportMigrationFile();
      check('importDialogs: Andere CSV schliesst die Migration und oeffnet die Dateiauswahl',
        filePickerClicks === 1 &&
        !importDom.window.document.getElementById('import-migration-overlay').classList.contains('open'));
    } finally {
      global.window = previousWindow;
      global.document = previousDocument;
      importDom.window.close();
    }

    check('tradeSearch: Dialogfunktionen exportiert und State bleibt Parameter',
      !!searchmod && ['openTradeSearchDialog', 'closeTradeSearch',
        'resetTradeSearchDialog', 'readTradeSearchFilters', 'renderTradeSearch']
        .every(name => typeof searchmod[name] === 'function'));
    const searchDom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
    global.window = searchDom.window;
    global.document = searchDom.window.document;
    let shownDate = '';
    const searchTrades = [
      {
        uid: 'old', date: '2026-07-12', time: '10:00:00', buyDate: '2026-07-12',
        buyTime: '09:00:00', pnl: 50, desc: '<img src=x> DAX Long', isin: 'DE000OLD'
      },
      {
        uid: 'new', date: '2026-07-14', time: '10:30:00', buyDate: '2026-07-14',
        buyTime: '09:30:00', pnl: -30, desc: 'DAX Short', isin: 'DE000NEW'
      }
    ];
    try {
      if (searchmod) searchmod.openTradeSearchDialog(searchTrades, date => { shownDate = date; });
      await new Promise(resolve => setTimeout(resolve, 0));
      const searchRows = searchDom.window.document.querySelectorAll('.search-result-row');
      check('tradeSearch: Oeffnen rendert aktuelle Trades und fokussiert die Produktsuche',
        !!searchmod && searchDom.window.document.getElementById('search-overlay').classList.contains('open') &&
        searchRows.length === 2 && searchRows[0].textContent.includes('DAX Short') &&
        searchDom.window.document.getElementById('search-summary').textContent.includes('2 von 2') &&
        searchDom.window.document.activeElement.id === 'search-query');
      check('tradeSearch: importierte Texte bleiben beim Rendern HTML-sicher',
        !!searchmod && searchDom.window.document.querySelector('#search-results img') === null &&
        searchRows[1].textContent.includes('<img src=x> DAX Long'));

      if (searchRows[0]) searchRows[0].querySelector('.search-result-open').click();
      check('tradeSearch: Tag anzeigen schliesst den Dialog und meldet das Datum zurueck',
        shownDate === '2026-07-14' &&
        !searchDom.window.document.getElementById('search-overlay').classList.contains('open'));

      searchDom.window.document.getElementById('search-from').value = '2026-07-15';
      searchDom.window.document.getElementById('search-to').value = '2026-07-14';
      if (searchmod) searchmod.renderTradeSearch(searchTrades, () => {});
      check('tradeSearch: ungueltiger Zeitraum wird ohne Ergebniszeilen erklaert',
        !!searchmod && searchDom.window.document.getElementById('search-summary').classList.contains('error') &&
        searchDom.window.document.querySelectorAll('.search-result-row').length === 0 &&
        searchDom.window.document.getElementById('search-results').textContent.includes('Keine Suche ausgef\u00fchrt'));

      searchDom.window.document.getElementById('search-query').value = 'short';
      if (searchmod) searchmod.resetTradeSearchDialog(searchTrades, () => {});
      check('tradeSearch: Zuruecksetzen leert alle Filter und rendert erneut',
        !!searchmod && searchDom.window.document.getElementById('search-query').value === '' &&
        searchDom.window.document.getElementById('search-from').value === '' &&
        searchDom.window.document.getElementById('search-direction').value === 'all' &&
        searchDom.window.document.querySelectorAll('.search-result-row').length === 2 &&
        searchDom.window.document.activeElement.id === 'search-query');
    } finally {
      global.window = previousWindow;
      global.document = previousDocument;
      searchDom.window.close();
    }
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
    check('views: ISO-Kalenderwochen-Helfer exportiert', typeof vmod.isoWeekInfo === 'function');
    const isoNewYear = typeof vmod.isoWeekInfo === 'function'
      ? vmod.isoWeekInfo('2025-12-29')
      : null;
    const expectedIsoWeekLabel = 'KW 01 \u00b7 29.12.2025\u201304.01.2026';
    check('views: 29.12.2025 ist KW 01 des ISO-Jahres 2026',
      !!isoNewYear && isoNewYear.isoWeek === 1 && isoNewYear.isoYear === 2026);
    check('views: ISO-KW-Label umfasst Montag bis Sonntag ueber Jahreswechsel',
      !!isoNewYear && isoNewYear.label === expectedIsoWeekLabel);
    // Ein lokales new Date('YYYY-MM-DD') faellt westlich von UTC auf den
    // Vortag. Zwei getrennte Node-Prozesse beweisen, dass die ISO-Rechnung
    // unabhaengig von der Laufzeit-Zeitzone bleibt.
    const viewsUrl = 'file://' + DIR.replace(/\\/g, '/') + '/js/views.js';
    const tzScript = 'import { isoWeekInfo } from ' + JSON.stringify(viewsUrl) +
      '; process.stdout.write(isoWeekInfo("2025-12-29").label);';
    let berlinLabel = '', losAngelesLabel = '';
    try {
      berlinLabel = execFileSync(process.execPath,
        ['--input-type=module', '--eval', tzScript],
        { cwd: DIR, env: Object.assign({}, process.env, { TZ: 'Europe/Berlin' }), encoding: 'utf8' });
      losAngelesLabel = execFileSync(process.execPath,
        ['--input-type=module', '--eval', tzScript],
        { cwd: DIR, env: Object.assign({}, process.env, { TZ: 'America/Los_Angeles' }), encoding: 'utf8' });
    } catch (_) { /* Der folgende Check meldet den fehlgeschlagenen Prozess. */ }
    check('views: ISO-KW bleibt in Berlin und Los Angeles identisch',
      berlinLabel === expectedIsoWeekLabel && losAngelesLabel === expectedIsoWeekLabel);
    const isoWeeks = vmod.aggregateWeeks({
      '2025-12-29': { pnl: 100, rev: 500, n: 1 },
      '2026-01-04': { pnl: -25, rev: 200, n: 1 },
      '2026-01-05': { pnl: 50, rev: 300, n: 1 }
    });
    check('views: Jahreswechsel-Tage landen gemeinsam in ISO-KW 01',
      isoWeeks.length === 2 && isoWeeks[1].pnl === 75 && isoWeeks[1].n === 2);
    check('views: neueste ISO-Kalenderwoche steht zuerst',
      isoWeeks.length === 2 && isoWeeks[0].isoWeek === 2 && isoWeeks[0].isoYear === 2026);
    check('UI: Wochen-Label kommt vollstaendig aus der puren Aggregation',
      appJs.includes('sorted.forEach(({ label, pnl, rev, n })') &&
      !appJs.includes('new Date(week)'));
    check('views: Monats-Summe = 250', msum === 250);
    check('views: Wochen-/Monatsreview als pure Berechnung exportiert',
      typeof vmod.computePeriodReviews === 'function');
    const reviewTrades = [
      { date: '2026-07-08', buyDate: '2026-07-08', buyTime: '11:00:00', time: '12:00:00', desc: 'ServiceNow', pnl: 25, tax: 5 },
      { date: '2026-07-13', buyDate: '2026-07-13', buyTime: '09:10:00', time: '10:00:00', desc: 'DAX Long Turbo', pnl: 100, tax: 20 },
      { date: '2026-07-14', buyDate: '2026-07-14', buyTime: '09:20:00', time: '10:10:00', desc: 'DAX Call', pnl: 80, tax: 15 },
      { date: '2026-07-15', buyDate: '2026-07-15', buyTime: '15:40:00', time: '16:00:00', desc: 'DAX Short Turbo', pnl: -120, tax: -30 },
      { date: '2026-07-16', buyDate: '2026-07-15', buyTime: '15:50:00', time: '09:00:00', desc: 'DAX Put', pnl: -60, tax: -15 },
      { date: 'kaputt', desc: 'DAX Long', pnl: 999, tax: 0 },
      { date: '2026-07-17', desc: 'DAX Long', pnl: 'kein-betrag', tax: 0 }
    ];
    const reviewBefore = JSON.stringify(reviewTrades);
    const weeklyReviews = typeof vmod.computePeriodReviews === 'function'
      ? vmod.computePeriodReviews(reviewTrades, 'week', 2)
      : { reviews: [], excluded: {} };
    const latestWeekReview = weeklyReviews.reviews[0];
    check('periodReview: ISO-Wochen sind neueste zuerst und ungueltige Daten ehrlich ausgeschlossen',
      weeklyReviews.period === 'week' && weeklyReviews.minSample === 2 &&
      weeklyReviews.reviews.length === 2 && latestWeekReview.key === '2026-07-13' &&
      latestWeekReview.label === 'KW 29 \u00b7 13.07.2026\u201319.07.2026' &&
      weeklyReviews.excluded.invalidDate === 1 && weeklyReviews.excluded.invalidPnl === 1);
    check('periodReview: Zusammenfassung rechnet Trades, Netto-P&L, Steuer und Winrate',
      latestWeekReview.summary.n === 4 && latestWeekReview.summary.pnl === 0 &&
      latestWeekReview.summary.tax === -10 && latestWeekReview.summary.wins === 2 &&
      latestWeekReview.summary.losses === 2 && latestWeekReview.summary.winrate === 50);
    check('periodReview: staerkstes und schwaechstes Muster nutzen Durchschnitt und Mindeststichprobe',
      latestWeekReview.strongest.label === 'Long / Call' && latestWeekReview.strongest.avg === 90 &&
      latestWeekReview.strongest.n === 2 && latestWeekReview.weakest.label === 'Short / Put' &&
      latestWeekReview.weakest.avg === -90 && latestWeekReview.weakest.n === 2 &&
      weeklyReviews.reviews[1].strongest === null && weeklyReviews.reviews[1].weakest === null);
    check('periodReview: Verlusttreiber, schlimmster Trade und Overnight-Verlust stimmen',
      latestWeekReview.losses.pnl === -180 && latestWeekReview.losses.n === 2 &&
      latestWeekReview.losses.worstTrade.pnl === -120 &&
      latestWeekReview.losses.dominantDirection.key === 'short' &&
      latestWeekReview.losses.dominantDirection.pnl === -180 &&
      latestWeekReview.losses.dominantPhase.key === 'us' &&
      latestWeekReview.losses.overnight.n === 1 && latestWeekReview.losses.overnight.pnl === -60);
    check('periodReview: auffaellige Einstiegsphase wird mit Stichprobe ausgewiesen',
      latestWeekReview.notablePhase.key === 'open' && latestWeekReview.notablePhase.avg === 90 &&
      latestWeekReview.notablePhase.n === 2);
    const monthlyReviews = typeof vmod.computePeriodReviews === 'function'
      ? vmod.computePeriodReviews(reviewTrades, 'month', 2)
      : { reviews: [] };
    check('periodReview: Monatsreview gruppiert denselben Datenbestand nach Kalendermonat',
      monthlyReviews.period === 'month' && monthlyReviews.reviews.length === 1 &&
      monthlyReviews.reviews[0].key === '2026-07' && monthlyReviews.reviews[0].summary.n === 5 &&
      monthlyReviews.reviews[0].summary.pnl === 25);
    check('periodReview: Berechnung mutiert Trades nicht', JSON.stringify(reviewTrades) === reviewBefore);
    check('views: computeStats Wins/Losses (2/1)', stats.wins === 2 && stats.losses === 1);
    check('views: Rendite bei 1000 Einstand = 25%', Math.abs(stats.rendite - 25) < 0.01);
    check('views: Equity-/Drawdown-Berechnung exportiert',
      typeof vmod.computeEquityCurve === 'function');
    const equity = typeof vmod.computeEquityCurve === 'function'
      ? vmod.computeEquityCurve([
          { date: '2026-01-11', time: '10:00', pnl: -50 },
          { date: '2026-01-02', time: '11:00', pnl: -20 },
          { date: '2026-01-01', time: '09:00', pnl: 100 },
          { date: '2026-01-10', time: '12:00', pnl: 200 },
          { date: '2026-01-02', time: '10:00', pnl: -40 },
          { date: '2026-01-05', time: '15:00', pnl: -100 }
        ], 1000)
      : null;
    check('views: Equity aggregiert mehrere Trades pro Tag',
      !!equity && equity.points.length === 5 && equity.points[1].dayPnl === -60);
    check('views: Equity-Handwerte fuer Stand und Hoch stimmen',
      !!equity && equity.currentEquity === 1090 && equity.highWaterMark === 1140 && equity.netPnl === 90);
    check('views: maximaler Drawdown = 160 Euro / 14,55 Prozent',
      !!equity && equity.maxDrawdown === 160 && Math.abs(equity.maxDrawdownPct - 14.54545) < 0.001);
    const growingEquity = typeof vmod.computeEquityCurve === 'function'
      ? vmod.computeEquityCurve([
          { date: '2026-01-01', pnl: -50 },
          { date: '2026-01-02', pnl: 950 },
          { date: '2026-01-03', pnl: -100 }
        ], 100)
      : null;
    check('views: Max-DD-Betrag und Prozent stammen aus derselben Phase',
      !!growingEquity && growingEquity.maxDrawdown === 100 &&
      Math.abs(growingEquity.maxDrawdownPct - 10) < 0.001);
    check('views: aktueller Drawdown = 50 Euro seit einem Tag',
      !!equity && equity.currentDrawdown === 50 && equity.currentDrawdownDays === 1);
    check('views: laengste Drawdown-Phase bis Erholung = 9 Tage',
      !!equity && equity.longestDrawdownDays === 9);
    const noCapitalEquity = typeof vmod.computeEquityCurve === 'function'
      ? vmod.computeEquityCurve([{ date: '2026-01-01', pnl: -25 }], 0)
      : null;
    check('views: Drawdown-Prozent bleibt ohne Startkapital ehrlich leer',
      !!noCapitalEquity && noCapitalEquity.maxDrawdown === 25 && noCapitalEquity.maxDrawdownPct === null);
    check('UI: Equity-Bereich und Renderer sind verdrahtet',
      html.includes('id="equity-summary"') && html.includes('id="equity-chart"') &&
      appJs.includes('function buildEquityCurve()') && appJs.includes('buildEquityCurve();'));
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
    const csvWithRejected = csvOk + '\n' +
      '2026-06-30;12:00:00;Cancelled;"DAX";Buy;DE000X;1;1,00;-1,00;0,00;0,00;EUR\n' +
      '2026-06-30;13:00:00;Executed;"Dividende";Dividend;DE000X;0;0,00;10,00;0,00;0,00;EUR';
    const csvRejectedRes = imod.parseScalableCsv(csvWithRejected);
    check('import: Parser meldet angenommene und abgelehnte Brokerzeilen',
      csvRejectedRes.meta && csvRejectedRes.meta.sourceRows === 4 &&
      csvRejectedRes.meta.acceptedRows === 2 && csvRejectedRes.meta.rejectedRows === 2 &&
      csvRejectedRes.meta.rejectedStatusRows === 1 && csvRejectedRes.meta.rejectedTypeRows === 1);
    check('import: CSV leer -> error', !!imod.parseScalableCsv('').error);
    check('import: CSV fehlende Spalten -> error', !!imod.parseScalableCsv('foo;bar\n1;2').error);
    const md = imod.markDuplicates([{ uid: 'a' }, { uid: 'b' }], new Set(['b']));
    check('import: markDuplicates (1 neu, 1 dup)', md.newCount === 1 && md.dupCount === 1);
    const migrationFnReady = typeof imod.diagnoseFirstLedgerImport === 'function';
    check('Import-Migration: pure Diagnose exportiert', migrationFnReady);
    if (migrationFnReady) {
      const legacyInput = [
        { uid: 'legacy-1', buyDate: '2026-06-10', date: '2026-06-15' },
        { uid: 'legacy-2', buyDate: '2026-06-12', date: '2026-06-18' }
      ];
      const openLotInput = [{ isin: 'OPEN', date: '2026-06-20', shares: 1 }];
      const rowInput = [
        { date: '2026-06-18' },
        { date: '2026-06-20' },
        { date: '2026-06-21' }
      ];
      const closedInput = [{ uid: 'legacy-2' }, { uid: 'new-1' }];
      const before = JSON.stringify([legacyInput, openLotInput, rowInput, closedInput]);
      const migration = imod.diagnoseFirstLedgerImport(
        legacyInput, openLotInput, rowInput, closedInput
      );
      check('Import-Migration: historische Ueberschneidung blockiert ersten Ledger-Import',
        migration.blocked && migration.overlapCount === 1);
      check('Import-Migration: Stichtag beruecksichtigt auch vorhandene offene Lots',
        migration.cutoff === '2026-06-20' &&
        migration.historyFrom === '2026-06-10' && migration.historyTo === '2026-06-20');
      check('Import-Migration: CSV-Zeilen werden am Stichtag nachvollziehbar aufgeteilt',
        migration.rowsAtOrBeforeCutoff === 2 && migration.rowsAfterCutoff === 1 &&
        migration.incomingFrom === '2026-06-18' && migration.incomingTo === '2026-06-21');
      check('Import-Migration: Diagnose meldet Bestandsumfang und mutiert keine Eingaben',
        migration.legacyTradeCount === 2 && migration.baseOpenLotCount === 1 &&
        JSON.stringify([legacyInput, openLotInput, rowInput, closedInput]) === before);
      const cleanMigration = imod.diagnoseFirstLedgerImport(
        legacyInput, openLotInput, [{ date: '2026-06-21' }], [{ uid: 'new-1' }]
      );
      check('Import-Migration: reine neue Brokerzeilen bleiben erlaubt',
        !cleanMigration.blocked && cleanMigration.overlapCount === 0 &&
        cleanMigration.rowsAtOrBeforeCutoff === 0 && cleanMigration.rowsAfterCutoff === 1);
      const openLotDuplicate = imod.diagnoseFirstLedgerImport(
        [], openLotInput, [{ date: '2026-06-20' }], []
      );
      check('Import-Migration: alte Kaufzeile einer offenen Position wird ebenfalls blockiert',
        openLotDuplicate.blocked && openLotDuplicate.overlapCount === 0 &&
        openLotDuplicate.rowsAtOrBeforeCutoff === 1);
    } else {
      check('Import-Migration: historische Ueberschneidung blockiert ersten Ledger-Import', false);
      check('Import-Migration: Stichtag beruecksichtigt auch vorhandene offene Lots', false);
      check('Import-Migration: CSV-Zeilen werden am Stichtag nachvollziehbar aufgeteilt', false);
      check('Import-Migration: Diagnose meldet Bestandsumfang und mutiert keine Eingaben', false);
      check('Import-Migration: reine neue Brokerzeilen bleiben erlaubt', false);
      check('Import-Migration: alte Kaufzeile einer offenen Position wird ebenfalls blockiert', false);
    }
    const reportFnReady = typeof imod.buildImportReport === 'function';
    check('Import-Kontrollbericht: pure Berechnung exportiert', reportFnReady);
    if (reportFnReady) {
      const previousRow = { type: 'Buy', status: 'Executed', isin: 'OLD', shares: 1, amount: -100, date: '2026-07-01' };
      const newBuy = { type: 'Buy', status: 'Executed', isin: 'NEW', shares: 2, amount: -200, date: '2026-07-02' };
      const newSell = { type: 'Sell', status: 'Executed', isin: 'NEW', shares: 2, amount: 170, tax: -10, date: '2026-07-03' };
      const reportInput = {
        incomingRows: [previousRow, newBuy, newSell, newSell],
        rejectedRows: 3,
        previousImportRows: [previousRow],
        candidateTrades: [{ uid: 'existing' }, { uid: 'new' }],
        previousTrades: [{ uid: 'existing', pnl: 100, tax: 20 }],
        nextTrades: [
          { uid: 'existing', pnl: 100, tax: 20 },
          { uid: 'new', pnl: -40, tax: -10 }
        ],
        previousOpenLots: [
          { isin: 'A', shares: 1 }, { isin: 'A', shares: 2 }, { isin: 'B', shares: 1 }
        ],
        nextOpenLots: [{ isin: 'B', shares: 1 }]
      };
      const reportBefore = JSON.stringify(reportInput);
      const report = imod.buildImportReport(reportInput);
      check('Import-Kontrollbericht: neue Zeilen und Duplikate inklusive Dateiduplikat stimmen',
        report.sourceRows === 7 && report.acceptedRows === 4 && report.rejectedRows === 3 &&
        report.newBrokerRows === 2 && report.duplicateBrokerRows === 2);
      check('Import-Kontrollbericht: geschlossene Trades und offene Positionen stimmen',
        report.newClosedTrades === 1 && report.duplicateClosedTrades === 1 &&
        report.openPositionsBefore === 2 && report.openPositionsAfter === 1 &&
        report.openPositionsDelta === -1);
      check('Import-Kontrollbericht: P&L- und Steueraenderung stimmen auf den Cent',
        report.pnlBefore === 100 && report.pnlAfter === 60 && report.pnlDelta === -40 &&
        report.taxBefore === 20 && report.taxAfter === 10 && report.taxDelta === -10);
      check('Import-Kontrollbericht: Berechnung mutiert keine Eingaben',
        JSON.stringify(reportInput) === reportBefore);
      const emptyReport = imod.buildImportReport();
      check('Import-Kontrollbericht: leere Eingabe liefert ehrliche Nullwerte',
        emptyReport.sourceRows === 0 && emptyReport.newBrokerRows === 0 &&
        emptyReport.openPositionsAfter === 0 && emptyReport.pnlDelta === 0);
    } else {
      check('Import-Kontrollbericht: neue Zeilen und Duplikate inklusive Dateiduplikat stimmen', false);
      check('Import-Kontrollbericht: geschlossene Trades und offene Positionen stimmen', false);
      check('Import-Kontrollbericht: P&L- und Steueraenderung stimmen auf den Cent', false);
      check('Import-Kontrollbericht: Berechnung mutiert keine Eingaben', false);
      check('Import-Kontrollbericht: leere Eingabe liefert ehrliche Nullwerte', false);
    }
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

      const editFnReady = typeof imod.updateImportSellRow === 'function';
      check('Import-Ledger: Rohverkauf kann pure bearbeitet werden', editFnReady);
      if (editFnReady) {
        const edited = imod.updateImportSellRow(ledgerRows, ledgerRows[1].sourceRowId, {
          date: '2026-07-02', description: 'DAX Put', shares: 10, amount: 1300, tax: 60
        });
        const editedReplay = edited.rows ? fmod.replayImportLedger(edited.rows, []) : { trades: [], errors: [{}] };
        check('Import-Ledger: Bearbeitung ersetzt Rohzeile ohne Eingabe zu mutieren',
          !edited.error && edited.rows.length === 2 &&
          edited.sourceRowId !== ledgerRows[1].sourceRowId &&
          ledgerRows[1].date === '2026-07-01' && ledgerRows[1].amount === 1200);
        check('Import-Ledger: Replay berechnet Einstand und P&L nach Bearbeitung neu',
          editedReplay.errors.length === 0 && editedReplay.trades.length === 1 &&
          editedReplay.trades[0].date === '2026-07-02' &&
          editedReplay.trades[0].buy === 1000 && editedReplay.trades[0].pnl === 240 &&
          editedReplay.trades[0].sourceRowId === edited.sourceRowId);
        const invalid = imod.updateImportSellRow(ledgerRows, ledgerRows[1].sourceRowId, {
          date: '2026-07-02', description: 'DAX Put', shares: 0, amount: 1300, tax: 60
        });
        check('Import-Ledger: ungueltige Verkaufsdaten werden abgelehnt', !!invalid.error);
        const collisionRows = imod.withSourceRowIds([
          { type: 'Sell', status: 'Executed', isin: 'COLLISION', shares: 1, amount: 100, date: '2026-07-01', time: '10:00:00', description: 'Erster Verkauf', tax: 10 },
          { type: 'Sell', status: 'Executed', isin: 'COLLISION', shares: 2, amount: 200, date: '2026-07-02', time: '10:00:00', description: 'Zweiter Verkauf', tax: 20 }
        ]);
        const collision = imod.updateImportSellRow(collisionRows, collisionRows[0].sourceRowId, {
          date: '2026-07-02', description: 'Zweiter Verkauf', shares: 2, amount: 200, tax: 20
        });
        check('Import-Ledger: doppelte Roh-ID wird beim Bearbeiten abgelehnt', !!collision.error);
      } else {
        check('Import-Ledger: Bearbeitung ersetzt Rohzeile ohne Eingabe zu mutieren', false);
        check('Import-Ledger: Replay berechnet Einstand und P&L nach Bearbeitung neu', false);
        check('Import-Ledger: ungueltige Verkaufsdaten werden abgelehnt', false);
        check('Import-Ledger: doppelte Roh-ID wird beim Bearbeiten abgelehnt', false);
      }
    } else {
      check('Import-Ledger: gleiche Rohzeile wird nur einmal gespeichert', false);
      check('Import-Ledger: Replay markiert abgeleiteten Trade und Quelle', false);
      check('Import-Ledger: geloeschter Verkauf stellt offenes Lot wieder her', false);
      check('Import-Ledger: Rohverkauf kann pure bearbeitet werden', false);
      check('Import-Ledger: Bearbeitung ersetzt Rohzeile ohne Eingabe zu mutieren', false);
      check('Import-Ledger: Replay berechnet Einstand und P&L nach Bearbeitung neu', false);
      check('Import-Ledger: ungueltige Verkaufsdaten werden abgelehnt', false);
      check('Import-Ledger: doppelte Roh-ID wird beim Bearbeiten abgelehnt', false);
    }

    const hideFnsReady =
      typeof fmod.createHiddenOpenPositionEvent === 'function' &&
      typeof fmod.visibleOpenLots === 'function' &&
      typeof fmod.restoreHiddenOpenPosition === 'function' &&
      typeof fmod.activeHiddenOpenPositions === 'function';
    check('Offene Position entfernen: pure Ereignisfunktionen exportiert', hideFnsReady);
    if (hideFnsReady) {
      const originalLots = [
        { openLotId: 'lot-alt', isin: 'HIDDEN', shares: 5, amount: 500, date: '2026-07-01', time: '09:00:00', desc: 'DAX Call' }
      ];
      const hiddenResult = fmod.createHiddenOpenPositionEvent(originalLots, 'HIDDEN', 'hide-1', 123456);
      check('Offene Position entfernen: Ereignis ist versioniert und mutiert Lots nicht',
        !hiddenResult.error && hiddenResult.event.version === 1 &&
        hiddenResult.event.lotIds.length === 1 && hiddenResult.event.lotIds[0] === 'lot-alt' &&
        originalLots.length === 1 && originalLots[0].openLotId === 'lot-alt');
      const lotsAfterNewBuy = originalLots.concat([
        { openLotId: 'lot-neu', isin: 'HIDDEN', shares: 2, amount: 240, date: '2026-07-03', time: '09:00:00', desc: 'DAX Call' }
      ]);
      const visibleAfterNewBuy = fmod.visibleOpenLots(lotsAfterNewBuy, [hiddenResult.event]);
      check('Offene Position entfernen: spaeterer Kauf derselben ISIN bleibt sichtbar',
        visibleAfterNewBuy.length === 1 && visibleAfterNewBuy[0].openLotId === 'lot-neu');
      const restoredEvents = fmod.restoreHiddenOpenPosition([hiddenResult.event], 'hide-1');
      check('Offene Position entfernen: Rueckgaengig stellt alte Lots wieder her',
        restoredEvents.length === 0 && fmod.visibleOpenLots(lotsAfterNewBuy, restoredEvents).length === 2);
      check('Offene Position entfernen: geschlossene Lots erzeugen keinen veralteten UI-Eintrag',
        fmod.activeHiddenOpenPositions(originalLots, [hiddenResult.event]).length === 1 &&
        fmod.activeHiddenOpenPositions([], [hiddenResult.event]).length === 0);

      const identityRows = imod.withSourceRowIds([
        { type: 'Buy', status: 'Executed', isin: 'LOT-ID', shares: 10, amount: -1000, date: '2026-07-01', time: '09:00:00', description: 'DAX Call', tax: 0 },
        { type: 'Sell', status: 'Executed', isin: 'LOT-ID', shares: 4, amount: 480, date: '2026-07-02', time: '10:00:00', description: 'DAX Call', tax: 20 }
      ]);
      const identityReplay = fmod.replayImportLedger(identityRows, []);
      check('Offene Position entfernen: Lot-ID bleibt nach partiellem FIFO-Verkauf stabil',
        identityReplay.errors.length === 0 && identityReplay.openLots.length === 1 &&
        identityReplay.openLots[0].openLotId === identityRows[0].sourceRowId);
    } else {
      check('Offene Position entfernen: Ereignis ist versioniert und mutiert Lots nicht', false);
      check('Offene Position entfernen: spaeterer Kauf derselben ISIN bleibt sichtbar', false);
      check('Offene Position entfernen: Rueckgaengig stellt alte Lots wieder her', false);
      check('Offene Position entfernen: geschlossene Lots erzeugen keinen veralteten UI-Eintrag', false);
      check('Offene Position entfernen: Lot-ID bleibt nach partiellem FIFO-Verkauf stabil', false);
    }
    const hmod = await import('file://' + DIR + '/js/helpers.js');
    check('helpers: escapeHtml neutralisiert HTML aus Importdaten',
      typeof hmod.escapeHtml === 'function' &&
      hmod.escapeHtml('<img src=x onerror="alert(1)">&\'') === '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;');
    const csvCellReady = typeof hmod.csvCell === 'function';
    check('CSV-Export: pure Zellabsicherung exportiert', csvCellReady);
    check('CSV-Export: Formel-Praefixe werden als Text neutralisiert',
      csvCellReady &&
      hmod.csvCell('=HYPERLINK("https://example.test")') === '"\'=HYPERLINK(""https://example.test"")"' &&
      hmod.csvCell('+SUM(A1:A2)') === '\'+SUM(A1:A2)' &&
      hmod.csvCell('-2+3') === '\'-2+3' &&
      hmod.csvCell('@IMPORTDATA("https://example.test")') === '"\'@IMPORTDATA(""https://example.test"")"');
    check('CSV-Export: Formeln nach Leerraum und Steuerzeichen werden ebenfalls neutralisiert',
      csvCellReady &&
      hmod.csvCell('  =1+1') === '\'  =1+1' &&
      hmod.csvCell('\tProdukt') === '"\'\tProdukt"' &&
      hmod.csvCell('\n=1+1') === '"\'\n=1+1"');
    check('CSV-Export: Zahlen und harmlose Texte bleiben auswertbar',
      csvCellReady && hmod.csvCell(-125.5) === '-125.5' &&
      hmod.csvCell(0) === '0' && hmod.csvCell('DAX Turbo') === 'DAX Turbo' &&
      hmod.csvCell(null) === '');
    check('CSV-Export: Semikolon, Anfuehrungszeichen und Zeilenumbruch bleiben in genau einer Zelle',
      csvCellReady &&
      hmod.csvCell('DAX; "Turbo"') === '"DAX; ""Turbo"""' &&
      hmod.csvCell('Zeile 1\nZeile 2') === '"Zeile 1\nZeile 2"');
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

      const versionApiReady =
        typeof smod.getDataEtag === 'function' &&
        typeof smod.downloadVersionedData === 'function' &&
        typeof smod.updateData === 'function' &&
        typeof smod.DriveConflictError === 'function';
      check('storage: Drive-Konfliktvertrag ist exportiert', versionApiReady);
      if (versionApiReady) {
        const versionCalls = [];
        global.fetch = async (url, opts = {}) => {
          versionCalls.push({ url, opts });
          if (url.includes('/drive/v2/files/')) {
            return new Response(JSON.stringify({ etag: '"etag-1"' }), { status: 200 });
          }
          return new Response(JSON.stringify({ trades: [], openLots: [], capital: 7 }), { status: 200 });
        };
        const loaded = await smod.downloadVersionedData('test-token', 'file-id');
        check('storage: ETag wird vor dem Dateninhalt geladen',
          loaded.etag === '"etag-1"' && loaded.data.capital === 7 &&
          versionCalls.length === 2 && versionCalls[0].url.includes('/drive/v2/files/') &&
          versionCalls[1].url.includes('/drive/v3/files/'));

        request = null;
        global.fetch = async (url, opts = {}) => {
          request = { url, opts };
          return new Response(JSON.stringify({ etag: '"etag-2"' }), { status: 200 });
        };
        const nextEtag = await smod.updateData('test-token', 'file-id', { trades: [] }, '"etag-1"');
        check('storage: Update nutzt v2 mit atomarem If-Match und liefert neues ETag',
          nextEtag === '"etag-2"' && request.url.includes('/upload/drive/v2/files/') &&
          request.opts.method === 'PUT' && request.opts.headers['If-Match'] === '"etag-1"');

        global.fetch = async () => new Response(JSON.stringify({ error: { message: 'Precondition failed' } }), { status: 412 });
        let conflictError = null;
        try { await smod.updateData('test-token', 'file-id', { trades: [] }, '"veraltet"'); }
        catch (e) { conflictError = e; }
        check('storage: HTTP 412 wird als DriveConflictError erkannt',
          conflictError instanceof smod.DriveConflictError && conflictError.status === 412);

        global.fetch = async () => new Response('{}', { status: 200 });
        let missingEtagError = '';
        try { await smod.getDataEtag('test-token', 'file-id'); }
        catch (e) { missingEtagError = e.message; }
        check('storage: fehlendes ETag verhindert ungeschuetztes Speichern', missingEtagError.includes('Versionskennung'));
      } else {
        check('storage: ETag wird vor dem Dateninhalt geladen', false);
        check('storage: Update nutzt v2 mit atomarem If-Match und liefert neues ETag', false);
        check('storage: HTTP 412 wird als DriveConflictError erkannt', false);
        check('storage: fehlendes ETag verhindert ungeschuetztes Speichern', false);
      }

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
    check('weekdayStats: pure Berechnung exportiert',
      typeof vmod.computeWeekdayStats === 'function');
    const weekdayTrades = [
      { pnl: 100, buyDate: '2026-07-13', date: '2026-07-14', desc: 'DAX Long Turbo' },
      { pnl: -20, buyDate: '2026-07-13', date: '2026-07-14', desc: 'Call auf DAX' },
      { pnl: 30, buyDate: '2026-07-13', date: '2026-07-14', desc: 'DAX Short Turbo' },
      { pnl: 10, buyDate: '2026-07-13', date: '2026-07-14', desc: 'DAX Put' },
      { pnl: 500, buyDate: '2026-07-13', date: '2026-07-13', desc: 'ServiceNow' },
      { pnl: 999, date: '2026-07-13', desc: 'DAX Long Turbo' }
    ];
    const weekdayBuy = typeof vmod.computeWeekdayStats === 'function'
      ? vmod.computeWeekdayStats(weekdayTrades, 'buy', 2)
      : null;
    const weekdayMonday = weekdayBuy && weekdayBuy.days[0];
    check('weekdayStats: Montag trennt Long und Short',
      !!weekdayMonday && weekdayMonday.label === 'Montag' &&
      weekdayMonday.long.n === 2 && weekdayMonday.short.n === 2);
    check('weekdayStats: Long-Handwerte inkl. Median und Profit Factor',
      !!weekdayMonday && weekdayMonday.long.pnl === 80 && weekdayMonday.long.avg === 40 &&
      weekdayMonday.long.median === 40 && weekdayMonday.long.winrate === 50 &&
      weekdayMonday.long.profitFactor === 5);
    check('weekdayStats: Montag-Tendenz nutzt Durchschnitt pro Trade',
      !!weekdayMonday && weekdayMonday.comparison.winner === 'long' &&
      weekdayMonday.comparison.edge === 20);
    check('weekdayStats: neutrale Richtung und fehlendes Einstiegsdatum ehrlich gezaehlt',
      !!weekdayBuy && weekdayBuy.excluded.neutral === 1 && weekdayBuy.excluded.missingDate === 1);
    const weekdaySell = typeof vmod.computeWeekdayStats === 'function'
      ? vmod.computeWeekdayStats(weekdayTrades, 'sell', 2)
      : null;
    check('weekdayStats: Umschalter gruppiert alternativ nach Ausstiegstag',
      !!weekdaySell && weekdaySell.days[1].long.n === 2 && weekdaySell.days[1].short.n === 2 &&
      weekdaySell.days[0].long.n === 1);
    const weekdayDefault = typeof vmod.computeWeekdayStats === 'function'
      ? vmod.computeWeekdayStats(weekdayTrades, 'buy')
      : null;
    check('weekdayStats: Standard-Mindeststichprobe ist acht je Richtung',
      !!weekdayDefault && weekdayDefault.minSample === 8 &&
      weekdayDefault.days[0].comparison === null);
    check('UI: Wochentagsstatistik und Einstieg/Ausstieg-Umschalter verdrahtet',
      html.includes('id="weekday-grid"') && html.includes('id="weekday-mode-buy"') &&
      html.includes('id="weekday-mode-sell"') && appJs.includes('function buildWeekdayStats()') &&
      appJs.includes('function setWeekdayMode(mode)') && appJs.includes('buildWeekdayStats();'));
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
    const searchableTrades = [
      { uid: 'a', date: '2026-07-10', time: '10:00:00', buyDate: '2026-07-10', buyTime: '09:30:00', pnl: 100, desc: 'DAX Long Turbo', isin: 'DE000LONG' },
      { uid: 'b', date: '2026-07-11', time: '12:00:00', buyDate: '2026-07-11', buyTime: '09:00:00', pnl: -40, desc: 'DAX Short Turbo', isin: 'DE000SHORT' },
      { uid: 'c', date: '2026-07-12', time: '14:00:00', buyDate: '2026-07-12', buyTime: '09:00:00', pnl: 0, desc: 'ServiceNow Aktie', isin: 'US81762P1021' },
      { uid: 'd', date: '2026-07-13', time: '08:00:00', buyDate: '2026-07-12', buyTime: '22:00:00', pnl: 70, desc: 'DAX Call Overnight', isin: 'DE000CALL' },
      { uid: 'e', date: '2026-07-14', time: '10:00:00', pnl: 0, desc: 'DAX Put Altbestand', isin: 'DE000PUT' }
    ];
    check('tradeFilter: pure Filterfunktion exportiert', typeof vmod.filterTrades === 'function');
    const combinedFilter = typeof vmod.filterTrades === 'function'
      ? vmod.filterTrades(searchableTrades, {
        from: '2026-07-11', to: '2026-07-13', query: 'dax',
        direction: 'short', result: 'loss', hold: '1to4h'
      })
      : null;
    check('tradeFilter: Zeitraum, Produkt, Richtung, Ergebnis und Haltedauer sind kombinierbar',
      !!combinedFilter && combinedFilter.trades.length === 1 && combinedFilter.trades[0].uid === 'b');
    const isinFilter = typeof vmod.filterTrades === 'function'
      ? vmod.filterTrades(searchableTrades, { query: 'de000long' })
      : null;
    check('tradeFilter: Produktsuche findet Beschreibung und ISIN ohne Gross-/Kleinschreibung',
      !!isinFilter && isinFilter.trades.length === 1 && isinFilter.trades[0].uid === 'a');
    const holdFilters = typeof vmod.filterTrades === 'function'
      ? {
        under60: vmod.filterTrades(searchableTrades, { hold: 'under60' }),
        oneToFour: vmod.filterTrades(searchableTrades, { hold: '1to4h' }),
        overFour: vmod.filterTrades(searchableTrades, { hold: 'over4h' }),
        overnight: vmod.filterTrades(searchableTrades, { hold: 'overnight' }),
        unknown: vmod.filterTrades(searchableTrades, { hold: 'unknown' })
      }
      : null;
    check('tradeFilter: Haltedauer-Bereiche sind eindeutig und Alt-Daten bleiben sichtbar',
      !!holdFilters && holdFilters.under60.trades[0].uid === 'a' &&
      holdFilters.oneToFour.trades[0].uid === 'b' && holdFilters.overFour.trades[0].uid === 'c' &&
      holdFilters.overnight.trades[0].uid === 'd' && holdFilters.unknown.trades[0].uid === 'e');
    const allFiltered = typeof vmod.filterTrades === 'function'
      ? vmod.filterTrades(searchableTrades)
      : null;
    check('tradeFilter: Zusammenfassung zaehlt Treffer und Netto-P&L korrekt',
      !!allFiltered && allFiltered.count === 5 && allFiltered.totalPnl === 130 &&
      allFiltered.wins === 2 && allFiltered.losses === 1 && allFiltered.flat === 2);
    check('tradeFilter: Ergebnis ist neueste zuerst und mutiert Eingabe nicht',
      !!allFiltered && allFiltered.trades[0].uid === 'e' &&
      searchableTrades.map(t => t.uid).join(',') === 'a,b,c,d,e');
    const invalidRange = typeof vmod.filterTrades === 'function'
      ? vmod.filterTrades(searchableTrades, { from: '2026-07-14', to: '2026-07-10' })
      : null;
    check('tradeFilter: ungueltiger Zeitraum wird ehrlich gemeldet',
      !!invalidRange && invalidRange.invalidRange === true && invalidRange.trades.length === 0);
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
  (appJs.includes('escapeHtml(t.desc)') || appJs.includes('escapeHtml(trade.desc)')) &&
  (appJs.includes('escapeHtml(t.date)') || appJs.includes('escapeHtml(trade.date)')));
check('Import blockiert FIFO-Ueberverkaeufe vor dem Speichern',
  appJs.includes('const { trades: closed, openLots, errors } = replayImportLedger') &&
  appJs.includes('if (errors.length > 0)'));
check('Import-Migration: eigener Erklaerdialog statt knapper Fehlermeldung',
  html.includes('id="import-migration-overlay"') &&
  html.includes('id="migration-cutoff"') &&
  html.includes('id="migration-overlap-count"') &&
  appJs.includes('function showImportMigration(') &&
  !appJs.includes('Bitte f\\u00fcr den ersten Ledger-Import nur neue Brokerzeilen verwenden.'));
check('Import-Migration: UI nutzt die pure Diagnose und bietet keinen unsicheren Bypass',
  appJs.includes('diagnoseFirstLedgerImport(') &&
  appJs.includes('if (!hasImportLedger() && migration.blocked)') &&
  !html.includes('import-migration-force'));
check('Import-Migration: Stichtagspruefung laeuft vor dem FIFO-Replay',
  /const migrationByDate[\s\S]{0,1000}replayImportLedger\(importRows/.test(appJs));
check('Import-Kontrollbericht: UI zeigt alle geforderten Kennzahlen',
  html.includes('id="import-report"') && html.includes('id="import-report-rows"') &&
  html.includes('id="import-report-rejected"') && html.includes('id="import-report-trades"') &&
  html.includes('id="import-report-open"') && html.includes('id="import-report-pnl"') &&
  html.includes('id="import-report-tax"'));
check('Import-Kontrollbericht: Vorschau nutzt pure Berechnung und sichtbare offene Lots',
  appJs.includes('buildImportReport({') && appJs.includes('visibleOpenLots(DATA.openLots') &&
  appControllerJs.includes('renderImportPreview(pendingImport, pendingImportReport'));
check('Import-Kontrollbericht: bleibt nach erfolgreichem Speichern sichtbar',
  /function confirmImport[\s\S]{0,1200}showSavedImportReport\(pendingImportReport\)/.test(appControllerJs) &&
  !/function confirmImport[\s\S]{0,1200}closeImportModal\(\)/.test(appControllerJs));
check('App persistiert Import-Ledger getrennt von Legacy-Trades',
  appJs.includes('importRows') &&
  appJs.includes('importBaseOpenLots') &&
  appJs.includes('replayImportLedger'));
check('UI bearbeitet importierte Trades ueber Rohverkauf und Ledger-Replay',
  appJs.includes('updateImportSellRow') &&
  appJs.includes('replayStoredImports(updated.rows)') &&
  !appJs.includes('Bitte den Verkauf l\\u00f6schen und die korrigierte CSV erneut importieren'));
check('UI haelt den FIFO-Einstand importierter Trades schreibgeschuetzt',
  html.includes('id="e-import-note"') &&
  appJs.includes("$('e-buy').readOnly = isImported") &&
  appJs.includes("$('e-broker').disabled = isImported"));
check('Import-Ledger speichert auch reine Buy-Zeilen ohne Verkauf',
  appJs.includes('const newImportRowCount =') &&
  appJs.includes('if (newImportRowCount > 0)'));
check('Ledger erfasst manuelles Schliessen als Rohverkauf',
  appJs.includes('if (hasImportLedger())') &&
  appJs.includes("type: 'Sell', status: 'Executed'") &&
  appJs.includes('mergeImportRows(DATA.importRows'));
check('Ledger entfernt offene Positionen ueber versioniertes Ereignis',
  appJs.includes('createHiddenOpenPositionEvent') &&
  appJs.includes('hiddenOpenPositions') &&
  !appJs.includes('lassen sich nach dem Ledger-Start nicht l\\u00f6schen'));
check('Entfernte Positionen koennen dauerhaft wiederhergestellt werden',
  html.includes('id="hidden-pos-wrap"') &&
  appJs.includes('restoreHiddenOpenPosition') &&
  appJs.includes('async function undoDeleteOpenPosition'));
check('App serialisiert Drive-Speichervorgaenge mit Snapshot',
  appJs.includes('const enqueuePersist = createWriteQueue()') &&
  appJs.includes('const snapshot = JSON.parse(JSON.stringify(DATA))'));
check('App verwaltet Drive-ETag und aktualisiert es nach jedem Speichern',
  appJs.includes('let driveEtag = null') &&
  appJs.includes('downloadVersionedData') &&
  appJs.includes('driveEtag = await updateData'));
check('App laedt bei Drive-Konflikt den neuesten Stand und informiert den Nutzer',
  appJs.includes('e instanceof DriveConflictError') &&
  appJs.includes('Daten wurden in einem anderen Tab oder Ger') &&
  /DriveConflictError[\s\S]{0,700}await loadFromDrive\(\)/.test(appJs));
check('import.js: parseScalableCsv vorhanden', appJs.includes('export function parseScalableCsv'));
check('import.js: deutsche Zahlen-Parser', appJs.includes('export function parseGermanNumber'));
check('import.js: Pflichtspalten-Pruefung', appJs.includes("const REQUIRED_COLUMNS = ['type', 'status', 'isin'"));
check('importError-Funktion vorhanden', appJs.includes('function importError('));
check('leere Datei abgefangen', appJs.includes('Keine Datenzeilen'));
check('fehlende Spalten gemeldet', appJs.includes('Spalten fehlen im Export'));
check('Dateityp-Check (.csv)', appJs.includes('.csv$/i.test'));
check('deleteOpenPosition vorhanden', appJs.includes('async function deleteOpenPosition'));
check('deleteOpenPosition: Sicherheitsabfrage', appJs.includes("confirm('Offene Position aus dem Tracking entfernen?"));
check('deleteOpenPosition: veraendert keine Broker-Rohzeilen',
  /function deleteOpenPosition[\s\S]{0,1800}createHiddenOpenPositionEvent/.test(appJs) &&
  !/function deleteOpenPosition[\s\S]{0,1800}DATA\.importRows\s*=/.test(appJs));
check('deleteOpenPosition: speichert nach Entfernen', /deleteOpenPosition[\s\S]{0,1800}await persist\(\)/.test(appJs));
check('Loeschen-Button an Positions-Karte', appJs.includes('btn-del-pos') && appJs.includes('deleteOpenPosition(p.isin)'));
check('fifo: Verkaufszeit wird gespeichert', appJs.includes("time: String(row.time || '')"));
check('Export-CSV enthaelt Zeit-Spalte', appJs.includes('UID;Datum;Zeit;ISIN') && appJs.includes("t.time || ''"));
check('Export-CSV sichert jede Datenzelle zentral gegen Formeln und Strukturbruch ab',
  appJs.includes('csvCell') && appJs.includes('.map(csvCell).join(\';\')') &&
  !appJs.includes("t.pnl].join(';')"));
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
check('Statistik-UI: interne Navigation mit drei Bereichen vorhanden',
  html.includes('id="stats-nav-performance"') && html.includes('id="stats-nav-timing"') &&
  html.includes('id="stats-nav-behavior"') && html.includes('id="stats-view-performance"') &&
  html.includes('id="stats-view-timing"') && html.includes('id="stats-view-behavior"'));
check('Statistik-UI: Bereichswechsel ist verdrahtet und global erreichbar',
  appJs.includes('function setStatsView(view)') && appJs.includes('window.setStatsView = setStatsView'));
check('Statistik-UI: interne Tabs sind per Pfeiltasten erreichbar',
  html.includes('onkeydown="handleStatsViewKey(event)"') &&
  appJs.includes('function handleStatsViewKey(event)') &&
  appJs.includes("'ArrowLeft', 'ArrowRight', 'Home', 'End'"));
check('Statistik-UI: Untermenue bleibt auf kleinen Displays horizontal bedienbar',
  html.includes('.stats-view-nav{') && html.includes('overflow-x:auto') &&
  html.includes('.stats-view-nav-btn{'));
check('Trade-Suche: alle kombinierbaren Filter und Ergebnisbereich vorhanden',
  html.includes('id="search-overlay"') && html.includes('id="search-query"') &&
  html.includes('id="search-from"') && html.includes('id="search-to"') &&
  html.includes('id="search-direction"') && html.includes('id="search-result"') &&
  html.includes('id="search-hold"') && html.includes('id="search-results"'));
check('Trade-Suche: Renderer nutzt die pure Filterlogik ohne Speichervorgang',
  tradeSearchJs.includes('function renderTradeSearch(trades, onShowDetail)') &&
  tradeSearchJs.includes('filterTrades(source, readTradeSearchFilters())') &&
  !/function renderTradeSearch[\s\S]{0,5000}persist\(\)/.test(tradeSearchJs));
check('Trade-Suche: auf Desktop und Mobil erreichbar',
  html.includes('id="btn-search"') && html.includes('id="btn-search-m"') &&
  appControllerJs.includes('function openTradeSearch()') &&
  appControllerJs.includes('closeTradeSearch'));
check('Periodenreview: Wochen- und Monats-Tab besitzen Auswahl und Review-Karten',
  html.includes('id="weekly-review"') && html.includes('id="weekly-review-select"') &&
  html.includes('id="weekly-review-grid"') && html.includes('id="monthly-review"') &&
  html.includes('id="monthly-review-select"') && html.includes('id="monthly-review-grid"'));
check('Periodenreview: UI nutzt unterschiedliche Mindeststichproben fuer Woche und Monat',
  appJs.includes("computePeriodReviews(DATA.trades, 'week', 3)") &&
  appJs.includes("computePeriodReviews(DATA.trades, 'month', 5)") &&
  appJs.includes('function renderPeriodReview('));

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
  const statsPerformance = doc.getElementById('stats-view-performance');
  const statsTiming = doc.getElementById('stats-view-timing');
  const statsBehavior = doc.getElementById('stats-view-behavior');
  check('Statistik-UI: Performance ist der sichtbare Standardbereich',
    !!statsPerformance && !statsPerformance.hidden && !!statsTiming && statsTiming.hidden &&
    !!statsBehavior && statsBehavior.hidden);
  check('Statistik-UI: Equity liegt ausschliesslich im Performance-Bereich',
    !!statsPerformance && statsPerformance.contains(doc.getElementById('equity-summary')) &&
    !statsTiming.contains(doc.getElementById('equity-summary')));
  check('Statistik-UI: Wochentage, Uhrzeit und Stunden liegen im Timing-Bereich',
    !!statsTiming && statsTiming.contains(doc.getElementById('weekday-grid')) &&
    statsTiming.contains(doc.getElementById('ts-blocks')) &&
    statsTiming.contains(doc.getElementById('ts-hours')));
  check('Statistik-UI: Overnight und Disziplin liegen im Verhalten-Bereich',
    !!statsBehavior && statsBehavior.contains(doc.getElementById('ts-on-detail')) &&
    statsBehavior.contains(doc.getElementById('ts-discipline')));
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
  const searchOverlay = doc.getElementById('search-overlay');
  check('Trade-Suche: Overlay liegt ausserhalb der Haupttabs',
    !!searchOverlay && !searchOverlay.closest('.section'));
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
