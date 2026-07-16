'use strict';

// ============================================================
// app.js — Haupt-Einstiegspunkt (verbindet alle Module)
// ============================================================
import { CLIENT_ID, SCOPE, APP_VERSION } from './config.js';
import { emptyAppData, isAppDataDocument, normalizeAppData } from './app-data.js';
import { $, fmtDE, fmtPlain, fmtK, setStatus, toLocalDateStr, escapeHtml, csvCell } from './helpers.js';
import {
  showTab, handleMainTabKey, setStatsView, handleStatsViewKey,
  mobileTab, toggleMobileActions, closeMobileActions
} from './navigation.js';
import {
  openAccessibleDialog, closeAccessibleDialog, handleAccessibleDialogKey
} from './dialog-accessibility.js';
import {
  openAddModal, closeAddModal, updatePnlPreview, readAddTradeForm,
  openEditTradeDialog, closeEditModal, updateEditPreview, readEditTradeForm
} from './trade-dialogs.js';
import {
  openTradeSearchDialog, closeTradeSearch,
  resetTradeSearchDialog, renderTradeSearch
} from './trade-search.js';
import {
  openClosePositionDialog, closeClosePositionDialog, readClosePositionForm,
  setCloseTotalLoss, updateClosePreview, onCloseTaxInput
} from './position-dialog.js';
import {
  openImportDialog, closeImportDialog, closeImportMigration,
  chooseImportMigrationFile, handleImportDragOver, handleImportDragLeave,
  handleImportDrop, readImportFile, showImportError, renderImportMigration,
  renderImportPreview, showSavedImportReport
} from './import-dialogs.js';
import { addSafetyBackup, addSafetyBackupFrom, restoreSafetyBackup } from './safety-backups.js';
import {
  openSafetyBackupDialog, closeSafetyBackupDialog, renderSafetyBackupDialog
} from './safety-backup-dialog.js';
import {
  readTradingMetricRange, clearTradingMetricRange, renderTradingMetrics
} from './metrics-view.js';
import {
  dayMap, deriveOpenPositions, fifoMatch, replayImportLedger,
  closePositionPnl, tradePnl, withOpenLotIds,
  createHiddenOpenPositionEvent, visibleOpenLots,
  activeHiddenOpenPositions, restoreHiddenOpenPosition
} from './fifo.js';
import { DriveConflictError, findDataFile, getDataEtag, downloadVersionedData, createData, updateData, createWriteQueue } from './storage.js';
import {
  STORAGE_MODE_LOCAL, STORAGE_MODE_DRIVE,
  loadLocalData, saveLocalData, loadStorageMode, saveStorageMode,
  requestPersistentLocalStorage
} from './local-storage.js';
import { classifyStorageMigration, prepareStorageMigration } from './storage-migration.js';
import {
  openStorageMigrationDialog, closeStorageMigrationDialog,
  setStorageMigrationBusy
} from './storage-migration-dialog.js';
import { encryptBackupFile, decryptBackupFile } from './backup-crypto.js';
import {
  openEncryptedBackupDialog, closeEncryptedBackupDialog,
  readEncryptedExportPasswords, readEncryptedImport,
  showEncryptedBackupFileName, setEncryptedBackupStatus,
  setEncryptedBackupBusy
} from './encrypted-backup-dialog.js';
import {
  aggregateWeeks, aggregateMonths, computeStats, computeTradingMetrics,
  computeEquityCurve,
  computeWeekdayStats, computeTimeStats, computeInsights, diagnoseBucket,
  computeMonthlyDiscipline,
  computePeriodReviews
} from './views.js';
import {
  parseScalableCsv, markDuplicates, mergeImportRows, updateImportSellRow,
  diagnoseFirstLedgerImport, buildImportReport
} from './import.js';

/* ============================================================
   STATE
   ============================================================ */
let tokenClient = null;
let accessToken = null;
let authRequestInProgress = false;
let storageMode = null;
let authIntent = 'open-drive';
let localStoragePersistent = false;
let driveFileId = null;          // id of trade-kalender.json in Drive
let driveEtag = null;            // geladene Serverversion fuer atomare If-Match-Updates
const emptyData = emptyAppData;
let DATA = emptyData();
let pendingImport = [];
let pendingOpenLots = [];
let pendingImportRows = null;
let pendingImportBaseOpenLots = null;
let pendingImportReport = null;
let pendingDriveData = null;
let migrationCommitInProgress = false;
const enqueuePersist = createWriteQueue();
let currentDetailDate = null;
// Aktuell angezeigter Monat im Kalender (Jahr + Monat 0-11). Standard: aktueller Monat.
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

/* ============================================================
   GOOGLE AUTH (Google Identity Services, token flow)
   ============================================================ */
function initAuth() {
  if (tokenClient) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (resp) => {
      authRequestInProgress = false;
      updateGoogleLoginState();
      if (resp.error) {
        reportAuthError('Login fehlgeschlagen: ' + resp.error);
        return;
      }
      accessToken = resp.access_token;
      onSignedIn();
    },
    error_callback: (error) => {
      authRequestInProgress = false;
      updateGoogleLoginState();
      const message = error?.type === 'popup_closed'
        ? 'Google-Anmeldung wurde abgebrochen.'
        : 'Google-Anmeldung konnte nicht geoeffnet werden. Bitte erneut versuchen.';
      reportAuthError(message);
    }
  });
  updateGoogleLoginState();
}

function updateGoogleLoginState() {
  const button = $('btn-login');
  if (!button) return;
  button.disabled = !tokenClient || authRequestInProgress;
  button.setAttribute('aria-busy', String(!tokenClient || authRequestInProgress));
  button.textContent = !tokenClient
    ? 'Google wird vorbereitet ...'
    : authRequestInProgress
      ? 'Google-Anmeldung laeuft ...'
      : 'Mit Google Drive starten';
}

function signIn() {
  authIntent = 'open-drive';
  requestGoogleAccess();
}

function connectDrive() {
  authIntent = 'connect-local';
  requestGoogleAccess();
}

function requestGoogleAccess() {
  if (!tokenClient) { reportAuthError('Auth noch nicht bereit, bitte neu laden.'); return; }
  if (authRequestInProgress) return;
  authRequestInProgress = true;
  updateGoogleLoginState();
  try {
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  } catch (error) {
    authRequestInProgress = false;
    updateGoogleLoginState();
    reportAuthError('Google-Anmeldung konnte nicht gestartet werden: ' + error.message);
  }
}

function setLoginStatus(message = '') {
  const element = $('login-status');
  if (element) element.textContent = message;
}

function reportAuthError(message) {
  if ($('login-screen').style.display !== 'none') setLoginStatus(message);
  else setStatus(message, true);
}

function updateStorageUi() {
  const local = storageMode === STORAGE_MODE_LOCAL;
  const badge = $('storage-badge');
  if (badge) {
    badge.textContent = local
      ? 'Nur auf diesem Geraet' + (localStoragePersistent ? ' · persistent' : '')
      : 'Google Drive';
  }
  $('btn-connect-drive').style.display = local ? 'inline-block' : 'none';
  $('btn-connect-drive-m').style.display = local ? 'block' : 'none';
  $('btn-logout').style.display = storageMode === STORAGE_MODE_DRIVE ? 'inline-block' : 'none';
}

function showApp() {
  $('login-screen').style.display = 'none';
  $('app-main').style.display = 'block';
  updateStorageUi();
}

function showLogin() {
  $('app-main').style.display = 'none';
  $('login-screen').style.display = 'flex';
  $('btn-logout').style.display = 'none';
}

function signOut() {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  authRequestInProgress = false;
  driveFileId = null;
  driveEtag = null;
  storageMode = STORAGE_MODE_DRIVE;
  DATA = emptyData();
  showLogin();
  updateGoogleLoginState();
}

async function onSignedIn() {
  if (authIntent === 'connect-local' && storageMode === STORAGE_MODE_LOCAL) {
    await inspectDriveConnection();
    return;
  }
  storageMode = STORAGE_MODE_DRIVE;
  showApp();
  setStatus('Lade Daten aus Google Drive \u2026');
  try {
    await loadFromDrive();
    await saveStorageMode(STORAGE_MODE_DRIVE).catch(() => {});
    setStatus('');
    updateStorageUi();
    rebuildAll();
  } catch (e) {
    setStatus('Fehler beim Laden: ' + e.message, true);
  }
}

async function startLocalMode() {
  setLoginStatus('Lokaler Datenstand wird geladen \u2026');
  try {
    DATA = await loadLocalData();
    await saveStorageMode(STORAGE_MODE_LOCAL);
    localStoragePersistent = await requestPersistentLocalStorage();
    storageMode = STORAGE_MODE_LOCAL;
    driveFileId = null;
    driveEtag = null;
    setLoginStatus('');
    showApp();
    setStatus('');
    rebuildAll();
  } catch (error) {
    storageMode = null;
    setLoginStatus('Lokaler Modus konnte nicht gestartet werden: ' + error.message);
  }
}

async function resumeStoredMode() {
  try {
    const savedMode = await loadStorageMode();
    if (savedMode === STORAGE_MODE_LOCAL) {
      await startLocalMode();
    } else {
      storageMode = savedMode;
      showLogin();
    }
  } catch (error) {
    storageMode = null;
    showLogin();
    setLoginStatus('Lokaler Browser-Speicher ist nicht verfuegbar. Google Drive kann weiterhin verwendet werden.');
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
    const created = await downloadVersionedData(accessToken, driveFileId);
    DATA = created.data;
    driveEtag = created.etag;
    return;
  }
  const loaded = await downloadVersionedData(accessToken, driveFileId);
  DATA = loaded.data;
  driveEtag = loaded.etag;
}

async function inspectDriveConnection() {
  setStatus('Pruefe lokalen Stand und Google Drive \u2026');
  try {
    driveFileId = await findDataFile(accessToken);
    let driveData = emptyData();
    driveEtag = null;
    if (driveFileId) {
      const loaded = await downloadVersionedData(accessToken, driveFileId);
      driveData = loaded.data;
      driveEtag = loaded.etag;
    }
    pendingDriveData = driveData;
    migrationCommitInProgress = false;
    const migrationComparison = classifyStorageMigration(DATA, driveData);
    setStatus('');
    openStorageMigrationDialog(migrationComparison);
  } catch (error) {
    setStatus('Drive konnte nicht geprueft werden: ' + error.message, true);
  }
}

function cancelStorageMigration() {
  if (migrationCommitInProgress) return;
  closeStorageMigrationDialog();
  pendingDriveData = null;
  driveFileId = null;
  driveEtag = null;
  if (accessToken && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  setStatus('Drive-Verbindung abgebrochen. Lokale Daten bleiben unveraendert.');
}

async function reloadMigrationComparison(message) {
  if (!driveFileId) return;
  const loaded = await downloadVersionedData(accessToken, driveFileId);
  pendingDriveData = loaded.data;
  driveEtag = loaded.etag;
  openStorageMigrationDialog(classifyStorageMigration(DATA, pendingDriveData));
  setStorageMigrationBusy(false, message);
}

async function confirmStorageMigration(choice) {
  if (!pendingDriveData || storageMode !== STORAGE_MODE_LOCAL) return;
  const localChoice = choice === 'local';
  const question = localChoice
    ? 'Lokalen Stand zu Google Drive uebertragen? Der bisherige Drive-Stand wird als Sicherung aufgenommen.'
    : 'Drive-Stand auf diesem Geraet verwenden? Der bisherige lokale Stand wird als Sicherung aufgenommen.';
  if (!confirm(question)) return;

  const target = prepareStorageMigration(DATA, pendingDriveData, choice);
  migrationCommitInProgress = true;
  setStorageMigrationBusy(true, 'Auswahl wird ETag-geschuetzt in Google Drive gespeichert \u2026');
  try {
    if (driveFileId) {
      driveEtag = await updateData(accessToken, driveFileId, target, driveEtag);
    } else {
      // Zwischen Bestandsaufnahme und Erstellung koennte ein anderer Tab eine
      // Datei angelegt haben. In diesem Fall wird neu verglichen statt eine
      // zweite konkurrierende Drive-Datei zu erzeugen.
      const appearedFileId = await findDataFile(accessToken);
      if (appearedFileId) {
        driveFileId = appearedFileId;
        await reloadMigrationComparison('Drive wurde parallel geaendert. Beide Staende wurden neu geladen; bitte erneut waehlen.');
        migrationCommitInProgress = false;
        return;
      }
      driveFileId = await createData(accessToken, target);
      driveEtag = await getDataEtag(accessToken, driveFileId);
    }

    DATA = target;
    storageMode = STORAGE_MODE_DRIVE;
    localStoragePersistent = false;
    await saveStorageMode(STORAGE_MODE_DRIVE).catch(() => {});
    pendingDriveData = null;
    migrationCommitInProgress = false;
    closeStorageMigrationDialog();
    updateStorageUi();
    rebuildAll();
    setStatus('Mit Google Drive verbunden. Der ausgewaehlte Stand ist synchronisiert.');
  } catch (error) {
    migrationCommitInProgress = false;
    if (error instanceof DriveConflictError && driveFileId) {
      try {
        await reloadMigrationComparison('Drive wurde parallel geaendert. Beide Staende wurden neu geladen; bitte erneut waehlen.');
      } catch (reloadError) {
        setStorageMigrationBusy(false, 'Konflikt erkannt; Neuladen fehlgeschlagen: ' + reloadError.message);
      }
      return;
    }
    setStorageMigrationBusy(false, 'Uebernahme fehlgeschlagen: ' + error.message);
  }
}

async function saveToDrive(isCreate, data = DATA) {
  if (!driveFileId || isCreate) {
    driveFileId = await createData(accessToken, data);
    driveEtag = await getDataEtag(accessToken, driveFileId);
  } else {
    driveEtag = await updateData(accessToken, driveFileId, data, driveEtag);
  }
}

function persist() {
  // Jede Aktion speichert ihren eigenen Zustandsschnappschuss. Ohne Snapshot
  // koennte eine spaetere Mutation waehrend eines laufenden Requests in den
  // falschen Schreibauftrag gelangen.
  const snapshot = JSON.parse(JSON.stringify(DATA));
  return enqueuePersist(async () => {
    if (storageMode === 'local') {
      setStatus('Speichere auf diesem Geraet \u2026');
      try {
        await saveLocalData(snapshot);
        setStatus('');
        return { ok: true, conflict: false };
      } catch (error) {
        setStatus('Lokales Speichern fehlgeschlagen: ' + error.message, true);
        return { ok: false, conflict: false };
      }
    }
    if (storageMode !== STORAGE_MODE_DRIVE || !accessToken) {
      setStatus('Speichern fehlgeschlagen: Kein aktiver Speichermodus.', true);
      return { ok: false, conflict: false };
    }
    setStatus('Speichere in Google Drive \u2026');
    try {
      await saveToDrive(false, snapshot);
      setStatus('');
      return { ok: true, conflict: false };
    } catch (e) {
      if (e instanceof DriveConflictError) {
        try {
          // Der lokale Stand basiert auf einer alten Serverversion. Er darf
          // nicht erneut gespeichert werden; stattdessen wird die aktuelle
          // Drive-Datei zur neuen Arbeitsgrundlage.
          await loadFromDrive();
          rebuildAll();
          setStatus('Drive-Konflikt: Neuester Stand wurde geladen.', true);
          alert('Daten wurden in einem anderen Tab oder Ger\u00e4t ge\u00e4ndert. Deine letzte Aktion wurde nicht gespeichert; der neueste Drive-Stand ist jetzt geladen. Bitte pr\u00fcfen und die Aktion bei Bedarf wiederholen.');
        } catch (reloadError) {
          setStatus('Drive-Konflikt; Neuladen fehlgeschlagen: ' + reloadError.message, true);
          alert('Drive-Konflikt erkannt. Der neueste Stand konnte nicht geladen werden; bitte Seite neu laden.');
        }
        return { ok: false, conflict: true };
      }
      setStatus('Speichern fehlgeschlagen: ' + e.message, true);
      return { ok: false, conflict: false };
    }
  });
}

// Destruktive Aktionen bauen zuerst einen vollstaendigen Folgezustand. Bei
// einem normalen Speicherfehler bleibt der bisherige lokale Stand erhalten;
// bei einem Drive-Konflikt hat persist() bereits den neuesten Serverstand
// geladen und dieser darf nicht wieder ueberschrieben werden.
async function persistReplacement(nextData) {
  const previousData = DATA;
  DATA = nextData;
  const result = await persist();
  if (!result.ok && !result.conflict) DATA = previousData;
  return result;
}

/* ============================================================
   DERIVED VIEWS
   ============================================================ */
function tradesByDate(date) { return DATA.trades.filter(t => t.date === date); }

// dayMap und deriveOpenPositions kommen jetzt aus fifo.js (pure functions).
// Dünne Wrapper reichen die globale DATA durch, damit der restliche Code
// unverändert dayMapDATA()/openPositionsDATA() nutzen kann.
function dayMapDATA() { return dayMap(DATA.trades); }
function hiddenOpenPositionsDATA() { return Array.isArray(DATA.hiddenOpenPositions) ? DATA.hiddenOpenPositions : []; }
function visibleOpenLotsDATA() { return visibleOpenLots(DATA.openLots, hiddenOpenPositionsDATA()); }
function openPositionsDATA() { return deriveOpenPositions(visibleOpenLotsDATA()); }

// Alte Daten haben keine Rohzeilen. Der Snapshot offener Lots zu Beginn der
// Ledger-Einfuehrung bleibt deshalb unveraendert die Basis; nur neue Importe werden
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
   STATS
   ============================================================ */
function rebuildStats() {
  const s = computeStats(dayMapDATA(), DATA.capital);

  $('hdr-pnl').textContent = fmtDE(s.totalPnl);
  $('hdr-pnl').className = 'total-pnl ' + (s.totalPnl >= 0 ? 'pos' : 'neg');
  $('s-tax').textContent = fmtPlain(Math.abs(s.totalTax)) + ' \u20ac';

  const renditeEl = $('s-rendite');
  if (renditeEl) {
    if (s.rendite !== null) {
      renditeEl.textContent = (s.rendite >= 0 ? '+' : '') + s.rendite.toFixed(1).replace('.', ',') + ' %';
      renditeEl.className = 'header-value ' + (s.rendite >= 0 ? 'pos' : 'neg');
    } else {
      renditeEl.textContent = '\u2014';
      renditeEl.className = 'header-value';
    }
  }
}

function buildTradingMetrics() {
  const range = readTradingMetricRange();
  renderTradingMetrics(computeTradingMetrics(DATA.trades, {
    from: range.from,
    to: range.to,
    capital: DATA.capital
  }));
}

function resetTradingMetrics() {
  clearTradingMetricRange();
  buildTradingMetrics();
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
  btnPrev.type = 'button';
  btnPrev.className = 'calendar-month-button';
  btnPrev.textContent = '\u2039';
  btnPrev.setAttribute('aria-label', 'Vorheriger Monat');
  btnPrev.style.cssText = 'font-size:1.4rem;line-height:1;background:none;border:1px solid var(--border);border-radius:8px;width:40px;height:40px;cursor:pointer;color:var(--ink);flex-shrink:0;';
  btnPrev.onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } buildCalendar(); };
  const btnNext = document.createElement('button');
  btnNext.type = 'button';
  btnNext.className = 'calendar-month-button';
  btnNext.textContent = '\u203a';
  btnNext.setAttribute('aria-label', 'Nächster Monat');
  btnNext.style.cssText = btnPrev.style.cssText;
  btnNext.onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } buildCalendar(); };
  const title = document.createElement('h2');
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

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day-button';
    const bg = data ? (dayColor(data.pnl, maxAbs) || 'var(--paper)') : 'var(--paper)';
    cell.style.cssText =
      'aspect-ratio:1;border:1px solid var(--border);border-radius:8px;padding:.4rem;' +
      'display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;' +
      'background:' + bg + ';min-height:64px;overflow:hidden;';
    cell.setAttribute('aria-label', String(day).padStart(2, '0') + '.' +
      String(calMonth + 1).padStart(2, '0') + '.' + calYear +
      (data
        ? ': ' + data.n + (data.n === 1 ? ' Trade, ' : ' Trades, ') +
          'Netto P&L ' + fmtPlain(data.pnl, 2) + ' Euro'
        : ': Keine Trades'));

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
function renderPeriodReview(prefix, result) {
  const select = $(prefix + '-review-select');
  const grid = $(prefix + '-review-grid');
  const note = $(prefix + '-review-note');
  const previousKey = select.value;
  const reviews = result.reviews || [];

  select.innerHTML = reviews.map(review =>
    '<option value="' + escapeHtml(review.key) + '">' + escapeHtml(review.label) + '</option>'
  ).join('');
  select.disabled = reviews.length === 0;

  const renderSelected = key => {
    const review = reviews.find(item => item.key === key) || reviews[0];
    if (!review) {
      grid.innerHTML = '<div class="period-review-empty">Noch keine geschlossenen Trades f&uuml;r dieses Review vorhanden.</div>';
      note.textContent = '';
      return;
    }

    select.value = review.key;
    const summary = review.summary;
    const strongest = review.strongest;
    const weakest = review.weakest;
    const loss = review.losses;
    const phase = review.notablePhase;
    const patternCard = (title, pattern, cssClass, emptyText) => {
      if (!pattern) {
        return '<article class="period-review-card"><div class="period-review-card-label">' + title + '</div>' +
          '<div class="period-review-card-value">Noch nicht belastbar</div>' +
          '<div class="period-review-card-meta">' + escapeHtml(emptyText) + '</div></article>';
      }
      return '<article class="period-review-card"><div class="period-review-card-label">' + title + '</div>' +
        '<div class="period-review-card-value ' + cssClass + '">' + escapeHtml(pattern.label) + '</div>' +
        '<div class="period-review-card-meta"><strong>' + fmtDE(pattern.avg) + ' / Trade</strong><br>' +
        pattern.n + ' Trades &middot; gesamt ' + fmtDE(pattern.pnl) + '</div></article>';
    };
    const lossDetails = loss.n === 0
      ? 'Keine Verlusttrades in dieser Periode.'
      : '<strong>' + loss.n + ' Verluste &middot; ' + fmtDE(loss.pnl) + '</strong><br>' +
        (loss.worstTrade
          ? 'Schlimmster Trade: ' + escapeHtml(loss.worstTrade.desc || 'Ohne Produkt') + ' (' + fmtDE(loss.worstTrade.pnl) + ')<br>'
          : '') +
        (loss.dominantDirection
          ? 'Richtung: ' + escapeHtml(loss.dominantDirection.label) + ' (' + fmtDE(loss.dominantDirection.pnl) + ')<br>'
          : '') +
        (loss.dominantPhase
          ? 'Einstiegsphase: ' + escapeHtml(loss.dominantPhase.label) + ' (' + fmtDE(loss.dominantPhase.pnl) + ')<br>'
          : '') +
        (loss.overnight.n > 0
          ? 'Overnight: ' + loss.overnight.n + ' &middot; ' + fmtDE(loss.overnight.pnl)
          : 'Overnight: keine Verluste');

    grid.innerHTML =
      '<article class="period-review-card"><div class="period-review-card-label">Periodenergebnis</div>' +
        '<div class="period-review-card-value ' + (summary.pnl >= 0 ? 'pos' : 'neg') + '">' + fmtDE(summary.pnl) + '</div>' +
        '<div class="period-review-card-meta"><strong>' + summary.n + ' Trades &middot; ' + fmtPlain(summary.winrate, 1) + '% Treffer</strong><br>' +
        '&Oslash; ' + fmtDE(summary.avg) + ' / Trade &middot; Steuer ' + fmtDE(summary.tax) +
        (phase ? '<br>Auff&auml;llige Phase: ' + escapeHtml(phase.label) + ' (' + fmtDE(phase.avg) + ' / Trade)' : '') +
        '</div></article>' +
      patternCard('St\u00e4rkstes Muster', strongest, 'pos', 'Kein positives Muster mit mindestens ' + result.minSample + ' Trades.') +
      patternCard('Schw\u00e4chstes Muster', weakest, 'neg', 'Kein negatives Muster mit mindestens ' + result.minSample + ' Trades.') +
      '<article class="period-review-card"><div class="period-review-card-label">Verlustursachen</div>' +
        '<div class="period-review-card-value ' + (loss.n > 0 ? 'neg' : 'pos') + '">' +
        (loss.n > 0 ? fmtDE(loss.pnl) : 'Keine') + '</div>' +
        '<div class="period-review-card-meta">' + lossDetails + '</div></article>';
    note.textContent = 'Muster werden erst ab ' + result.minSample + ' gleichartigen Trades bewertet. ' +
      'Gruppierung nach Ausstiegsdatum.' +
      ((result.excluded.invalidDate || result.excluded.invalidPnl)
        ? ' Ausgeschlossen: ' + result.excluded.invalidDate + ' ung\u00fcltige Datumswerte, ' +
          result.excluded.invalidPnl + ' ung\u00fcltige P&L-Werte.'
        : '');
  };

  select.onchange = () => renderSelected(select.value);
  renderSelected(reviews.some(review => review.key === previousKey) ? previousKey : (reviews[0] && reviews[0].key));
}

function buildWeekly() {
  renderPeriodReview('weekly', computePeriodReviews(DATA.trades, 'week', 3));
  const sorted = aggregateWeeks(dayMapDATA());
  const maxAbs = Math.max(...sorted.map(w => Math.abs(w.pnl)), 1);
  const tbody = $('weekly-tbody');
  tbody.innerHTML = '';
  if (sorted.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);padding:1rem">Keine Daten.</td></tr>'; return; }
  sorted.forEach(({ label, pnl, rev, n }) => {
    const pct = Math.round((Math.abs(pnl) / maxAbs) * 100);
    const cls = pnl >= 0 ? 'pos' : 'neg';
    tbody.innerHTML += '<tr><td>' + escapeHtml(label) + '</td><td class="r ' + cls + '">' + fmtDE(pnl) + '</td><td class="r">' + fmtPlain(rev, 0) + ' \u20ac</td><td class="r">' + n + '</td><td><div class="bar-track"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div></td></tr>';
  });
}

/* ============================================================
   MONTHLY
   ============================================================ */
function buildMonthly() {
  renderPeriodReview('monthly', computePeriodReviews(DATA.trades, 'month', 5));
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
  openClosePositionDialog(lots);
}

function closeClosePosModal() {
  closeClosePositionDialog();
  closingIsin = null;
}

async function confirmClosePos() {
  if (!closingIsin) return;
  const lots = DATA.openLots.filter(l => l.isin === closingIsin);
  if (lots.length === 0) { alert('Position nicht gefunden.'); return; }
  const { date, sell, tax } = readClosePositionForm();
  if (!date || isNaN(sell)) { alert('Bitte Datum und Verkaufswert eingeben (0 f\u00fcr Totalverlust).'); return; }
  const totalShares = lots.reduce((s, l) => s + l.shares, 0);
  const totalCost = lots.reduce((s, l) => s + l.amount, 0);
  const desc = lots[0].desc;
  if (hasImportLedger()) {
    // Nach der Ledger-Einfuehrung muss auch ein manueller Schluss im Roh-Ledger landen.
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
    if (!(await persist()).ok) return;
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
  if (!(await persist()).ok) return;
  closeClosePosModal();
  rebuildAll();
}

function buildOpenPositions() {
  const wrap = $('open-pos-wrap');
  wrap.innerHTML = '';
  buildHiddenOpenPositions();
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
      '<button type="button" class="btn-close-pos" data-isin="' + escapeHtml(p.isin) + '">Schlie\u00dfen</button>' +
      '<button type="button" class="btn-del-pos" data-isin="' + escapeHtml(p.isin) +
        '" aria-label="' + escapeHtml(p.desc) + ' aus dem Tracking entfernen, ohne P&L-Buchung">\u2715</button>' +
      '</div>';
    card.querySelector('.btn-close-pos').onclick = () => openClosePosModal(p.isin);
    card.querySelector('.btn-del-pos').onclick = () => deleteOpenPosition(p.isin);
    wrap.appendChild(card);
  });
}

function buildHiddenOpenPositions() {
  const wrap = $('hidden-pos-wrap');
  wrap.innerHTML = '';
  const events = activeHiddenOpenPositions(DATA.openLots, hiddenOpenPositionsDATA());
  if (events.length === 0) return;

  const heading = document.createElement('h3');
  heading.className = 'hidden-pos-title';
  heading.textContent = 'Entfernte Positionen';
  wrap.appendChild(heading);
  events.forEach(event => {
    const row = document.createElement('div');
    row.className = 'hidden-pos-row';
    row.innerHTML = '<div><div class="hidden-pos-desc">' + escapeHtml(event.desc || event.isin) + '</div>' +
      '<div class="hidden-pos-meta">' + escapeHtml(event.isin) + ' \u00b7 ' +
      Number(event.shares || 0).toLocaleString('de-DE') + ' St\u00fcck \u00b7 Einstand ' +
      fmtPlain(Number(event.cost || 0), 2) + ' \u20ac</div></div>' +
      '<button class="btn restore-hidden-pos">Wieder anzeigen</button>';
    row.querySelector('.restore-hidden-pos').onclick = () => undoDeleteOpenPosition(event.id);
    wrap.appendChild(row);
  });
}

// Entfernt nur die aktuell sichtbaren Lots der ISIN aus dem Tracking. Die
// Brokerhistorie bleibt vollstaendig, damit FIFO und spaetere Verkaeufe korrekt
// bleiben; der versionierte Ausschluss kann jederzeit rueckgaengig werden.
async function deleteOpenPosition(isin) {
  let canonicalLots;
  if (hasImportLedger()) {
    try {
      canonicalLots = replayStoredImports().openLots;
    } catch (e) {
      alert('Position konnte nicht entfernt werden: ' + e.message);
      return;
    }
  } else {
    canonicalLots = withOpenLotIds(DATA.openLots);
  }
  const lots = visibleOpenLots(canonicalLots, hiddenOpenPositionsDATA()).filter(lot => lot.isin === isin);
  if (lots.length === 0) return;
  const shares = lots.reduce((s, l) => s + l.shares, 0);
  const cost = lots.reduce((s, l) => s + Math.abs(l.amount), 0);
  const desc = lots[0].desc || lots[0].description || isin;
  if (!confirm('Offene Position aus dem Tracking entfernen?\n\n' + desc + '\n' + isin + '\n' +
    shares.toLocaleString('de-DE') + ' St\u00fcck, Einstand ' + fmtPlain(cost, 2) + ' \u20ac\n\n' +
    'Brokerhistorie, P&L und Steuer bleiben unver\u00e4ndert. Die Position kann unter "Entfernte Positionen" wieder angezeigt werden.')) return;

  const hidden = hiddenOpenPositionsDATA();
  const hiddenAt = Date.now();
  const eventId = 'hidden-open-' + hiddenAt + '-' + hidden.length;
  const created = createHiddenOpenPositionEvent(lots, isin, eventId, hiddenAt);
  if (created.error) { alert('Position konnte nicht entfernt werden: ' + created.error); return; }
  const previousData = DATA;
  DATA = Object.assign({}, DATA, {
    openLots: canonicalLots,
    hiddenOpenPositions: hidden.concat(created.event)
  });
  const saveResult = await persist();
  if (!saveResult.ok) {
    if (!saveResult.conflict) DATA = previousData;
    return;
  }
  rebuildAll();
}

async function undoDeleteOpenPosition(eventId) {
  const hidden = hiddenOpenPositionsDATA();
  const restored = restoreHiddenOpenPosition(hidden, eventId);
  if (restored.length === hidden.length) return;
  const previousData = DATA;
  DATA = Object.assign({}, DATA, { hiddenOpenPositions: restored });
  const saveResult = await persist();
  if (!saveResult.ok) {
    if (!saveResult.conflict) DATA = previousData;
    return;
  }
  rebuildAll();
}

/* ============================================================
   EQUITY-KURVE + DRAWDOWN
   ============================================================ */
function buildEquityCurve() {
  const result = computeEquityCurve(DATA.trades, DATA.capital);
  const summary = $('equity-summary');
  const chart = $('equity-chart');
  const note = $('equity-note');
  if (!summary || !chart || !note) return;

  if (result.points.length === 0) {
    summary.innerHTML = '';
    chart.innerHTML = '<div class="equity-empty">Noch keine geschlossenen Trades f\u00fcr eine Equity-Kurve.</div>';
    note.textContent = '';
    return;
  }

  const hasCapital = result.initialCapital > 0;
  const percentage = value => value === null
    ? ''
    : ' (' + value.toFixed(1).replace('.', ',') + ' %)';
  const drawdownValue = (amount, pct) => amount > 0
    ? '\u2212' + fmtPlain(amount) + ' \u20ac' + percentage(pct)
    : '0,00 \u20ac' + percentage(pct);
  const card = (label, value, cls, sub) =>
    '<div class="equity-card"><div class="equity-card-label">' + label + '</div>' +
    '<div class="equity-card-value ' + (cls || '') + '">' + value + '</div>' +
    (sub ? '<div class="equity-card-sub">' + sub + '</div>' : '') + '</div>';

  const currentLabel = hasCapital ? 'Aktueller Stand' : 'P&L kumuliert';
  const highLabel = hasCapital ? 'H\u00f6chststand' : 'P&L-Hoch';
  const currentValue = hasCapital
    ? fmtPlain(result.currentEquity) + ' \u20ac'
    : fmtDE(result.netPnl);
  const highValue = hasCapital
    ? fmtPlain(result.highWaterMark) + ' \u20ac'
    : fmtDE(result.highWaterMark);
  summary.innerHTML =
    card(currentLabel, currentValue, result.netPnl >= 0 ? 'pos' : 'neg') +
    card(highLabel, highValue, '') +
    card('Aktueller Drawdown', drawdownValue(result.currentDrawdown, result.currentDrawdownPct),
      result.currentDrawdown > 0 ? 'neg' : 'pos', result.currentDrawdownDays + ' Tage unter Hoch') +
    card('Max. Drawdown', drawdownValue(result.maxDrawdown, result.maxDrawdownPct),
      result.maxDrawdown > 0 ? 'neg' : 'pos') +
    card('L\u00e4ngste DD-Phase', result.longestDrawdownDays + ' Tage', '', 'bis Erholung oder heute');

  const width = 840;
  const height = 240;
  const left = 46;
  const right = 14;
  const top = 14;
  const bottom = 32;
  const values = result.points.map(point => point.equity).concat([result.initialCapital]);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);
  const margin = Math.max((maxValue - minValue) * 0.08, 1);
  minValue -= margin;
  maxValue += margin;
  const xFor = index => result.points.length === 1
    ? (left + width - right) / 2
    : left + (index / (result.points.length - 1)) * (width - left - right);
  const yFor = value => top + ((maxValue - value) / (maxValue - minValue)) * (height - top - bottom);
  const linePoints = result.points.map((point, index) =>
    xFor(index).toFixed(1) + ',' + yFor(point.equity).toFixed(1)).join(' ');
  const firstX = xFor(0).toFixed(1);
  const lastX = xFor(result.points.length - 1).toFixed(1);
  const chartBottom = height - bottom;
  const areaPoints = firstX + ',' + chartBottom + ' ' + linePoints + ' ' + lastX + ',' + chartBottom;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const value = maxValue - ((maxValue - minValue) * i / 4);
    const y = yFor(value).toFixed(1);
    grid += '<line class="equity-grid-line" x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '"></line>' +
      '<text class="equity-axis-label" x="' + (left - 6) + '" y="' + (+y + 3) + '" text-anchor="end">' + escapeHtml(fmtK(value)) + '</text>';
  }

  const maxPointIndex = result.maxDrawdownDate
    ? result.points.findIndex(point => point.date === result.maxDrawdownDate)
    : -1;
  const marker = maxPointIndex >= 0 && result.maxDrawdown > 0
    ? '<circle class="equity-dd-marker" cx="' + xFor(maxPointIndex).toFixed(1) + '" cy="' +
      yFor(result.points[maxPointIndex].equity).toFixed(1) + '" r="4"><title>Max. Drawdown am ' +
      escapeHtml(result.maxDrawdownDate) + ': ' + escapeHtml(fmtPlain(result.maxDrawdown)) + ' \u20ac</title></circle>'
    : '';
  const shortDate = value => value.slice(8, 10) + '.' + value.slice(5, 7) + '.' + value.slice(2, 4);

  chart.innerHTML = '<svg class="equity-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Equity-Kurve nach Handelstag">' +
    '<defs><linearGradient id="equity-area-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--green)" stop-opacity=".22"></stop><stop offset="100%" stop-color="var(--green)" stop-opacity=".02"></stop></linearGradient></defs>' +
    grid +
    '<line class="equity-baseline" x1="' + left + '" y1="' + yFor(result.initialCapital).toFixed(1) + '" x2="' + (width - right) + '" y2="' + yFor(result.initialCapital).toFixed(1) + '"></line>' +
    '<polygon class="equity-area" points="' + areaPoints + '"></polygon>' +
    '<polyline class="equity-line" points="' + linePoints + '"></polyline>' + marker +
    '<text class="equity-date-label" x="' + firstX + '" y="' + (height - 8) + '" text-anchor="start">' + shortDate(result.points[0].date) + '</text>' +
    '<text class="equity-date-label" x="' + lastX + '" y="' + (height - 8) + '" text-anchor="end">' + shortDate(result.points[result.points.length - 1].date) + '</text>' +
    '</svg>';

  note.textContent = 'Tagesendst\u00e4nde aus realisiertem Netto-P&L; offene Positionen sind nicht enthalten.' +
    (hasCapital ? '' : ' F\u00fcr Depotwerte und prozentuale Drawdowns zuerst den Einstand im Kopfbereich setzen.');
}

/* ============================================================
   WOCHENTAGS-STATISTIK (Long/Call vs. Short/Put)
   ============================================================ */
let weekdayMode = 'buy'; // Einstieg ist der Entscheidungstag und daher Standard.

function setWeekdayMode(mode) {
  weekdayMode = mode === 'sell' ? 'sell' : 'buy';
  const buyButton = $('weekday-mode-buy');
  const sellButton = $('weekday-mode-sell');
  if (buyButton) {
    buyButton.classList.toggle('active', weekdayMode === 'buy');
    buyButton.setAttribute('aria-pressed', weekdayMode === 'buy' ? 'true' : 'false');
  }
  if (sellButton) {
    sellButton.classList.toggle('active', weekdayMode === 'sell');
    sellButton.setAttribute('aria-pressed', weekdayMode === 'sell' ? 'true' : 'false');
  }
  buildWeekdayStats();
}

function buildWeekdayStats() {
  const grid = $('weekday-grid');
  const note = $('weekday-note');
  if (!grid || !note) return;

  const result = computeWeekdayStats(DATA.trades, weekdayMode);
  const formatPercent = value => value === null
    ? '\u2014'
    : fmtPlain(value, 1) + ' %';
  const formatFactor = value => value === null
    ? '\u2014'
    : (value === Infinity ? '\u221e' : fmtPlain(value, 2));
  const formatMoney = (bucket, value) => bucket.n > 0 ? fmtDE(value) : '\u2014';
  const directionBlock = (key, label, bucket) => {
    const remaining = Math.max(0, result.minSample - bucket.n);
    const sampleText = bucket.significant
      ? 'Stichprobe belastbar'
      : (remaining + ' bis Mindeststichprobe');
    return '<div class="weekday-direction ' + key + '">' +
      '<div class="weekday-direction-head"><span class="weekday-badge ' + key + '">' + label + '</span>' +
      '<span class="weekday-count">n = ' + bucket.n + '</span></div>' +
      '<div class="weekday-average"><span>\u00d8 pro Trade</span><strong class="' +
      (bucket.avg >= 0 ? 'pos' : 'neg') + '">' + formatMoney(bucket, bucket.avg) + '</strong></div>' +
      '<div class="weekday-metrics">' +
      '<div><span>Netto-P&amp;L</span><b>' + formatMoney(bucket, bucket.pnl) + '</b></div>' +
      '<div><span>Median</span><b>' + (bucket.median === null ? '\u2014' : fmtDE(bucket.median)) + '</b></div>' +
      '<div><span>Winrate</span><b>' + formatPercent(bucket.winrate) + '</b></div>' +
      '<div><span>Profit Factor</span><b>' + formatFactor(bucket.profitFactor) + '</b></div>' +
      '</div><div class="weekday-sample ' + (bucket.significant ? 'ready' : '') + '">' + sampleText + '</div></div>';
  };

  grid.innerHTML = result.days.map(day => {
    let tendency;
    let tendencyClass = '';
    if (!day.comparison) {
      tendency = 'Noch keine belastbare Tendenz';
    } else if (day.comparison.winner === 'tie') {
      tendency = 'Long und Short im Durchschnitt gleich';
      tendencyClass = 'tie';
    } else {
      const winner = day.comparison.winner === 'long' ? 'Long' : 'Short';
      tendency = 'Tendenz ' + winner + ' \u00b7 Vorsprung \u00d8 ' + fmtPlain(day.comparison.edge) + ' \u20ac/Trade';
      tendencyClass = day.comparison.winner;
    }
    return '<article class="weekday-card">' +
      '<div class="weekday-card-head"><h3>' + escapeHtml(day.label) + '</h3>' +
      '<div class="weekday-tendency ' + tendencyClass + '">' + tendency + '</div></div>' +
      directionBlock('long', 'Long / Call', day.long) +
      directionBlock('short', 'Short / Put', day.short) +
      '</article>';
  }).join('');

  const excluded = [];
  if (result.excluded.missingDate > 0) {
    excluded.push(result.excluded.missingDate + ' ohne ' +
      (result.mode === 'buy' ? 'Einstiegsdatum' : 'Ausstiegsdatum'));
  }
  if (result.excluded.neutral > 0) excluded.push(result.excluded.neutral + ' ohne Long-/Short-Zuordnung');
  if (result.excluded.weekend > 0) excluded.push(result.excluded.weekend + ' am Wochenende');
  if (result.excluded.invalidPnl > 0) excluded.push(result.excluded.invalidPnl + ' ohne g\u00fcltiges P&L');
  note.textContent = result.included + ' zugeordnete Trades nach ' +
    (result.mode === 'buy' ? 'Einstiegstag' : 'Ausstiegstag') +
    '. Tendenzen vergleichen das durchschnittliche Netto-P&L und gelten erst ab n \u2265 ' +
    result.minSample + ' je Richtung und Wochentag.' +
    (excluded.length ? ' Nicht enthalten: ' + excluded.join(', ') + '.' : '');
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
  $('ts-mode-sell').setAttribute('aria-pressed', mode === 'sell' ? 'true' : 'false');
  $('ts-mode-buy').setAttribute('aria-pressed', mode === 'buy' ? 'true' : 'false');
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
      '<button type="button" class="btn-edit" aria-label="' + escapeHtml(t.desc) + ' bearbeiten">\u270e</button>' +
      '<button type="button" class="btn-del" aria-label="' + escapeHtml(t.desc) + ' l\u00f6schen">\u2715</button>' +
      '</div>';
    row.querySelector('.btn-edit').onclick = () => openEditModal(uid);
    row.querySelector('.btn-del').onclick = () => deleteTrade(uid, key);
    c.appendChild(row);
  });
  $('add-day-btn').style.display = 'flex';
  openAccessibleDialog('detail-overlay', 'detail-close-btn');
}

function openDetailNew(key) {
  currentDetailDate = key;
  const p = key.split('-');
  $('detail-date').textContent = p[2] + '.' + p[1] + '.' + p[0];
  $('detail-summary').textContent = 'Noch keine Trades';
  $('detail-pnl-hdr').textContent = '';
  $('detail-trades').innerHTML = '<div style="color:var(--muted);font-size:.7rem;padding:.5rem 0">Kein Trade f\u00fcr diesen Tag.</div>';
  $('add-day-btn').style.display = 'flex';
  openAccessibleDialog('detail-overlay', 'detail-close-btn');
}

function closeDetail() { closeAccessibleDialog('detail-overlay'); currentDetailDate = null; }

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
  if (!(await persist()).ok) return;
  rebuildAll();
  const rem = tradesByDate(date);
  if (rem.length > 0) showDetail(date); else closeDetail();
}

/* ============================================================
   ADD / EDIT TRADE
   ============================================================ */
function openAddModalForDate() {
  const preferredDate = currentDetailDate || '';
  closeDetail();
  openAddModal(preferredDate);
}

async function saveTrade() {
  const { date, desc, broker, shares, buy, sell, tax } = readAddTradeForm();
  if (!date || !desc || !buy || !sell) { alert('Bitte Datum, Produkt, Kauf- und Verkaufsbetrag ausf\u00fcllen.'); return; }
  const pnl = parseFloat((sell - buy - tax).toFixed(2));
  const base = 'manual_' + date + '_' + sell.toFixed(2) + '_' + shares.toFixed(3);
  const uid = DATA.trades.some(t => t.uid === base) ? base + '_' + Date.now() : base;
  DATA.trades.push({ uid, date, isin: '', desc, broker, shares, buy: +buy.toFixed(2), sell: +sell.toFixed(2), tax: +tax.toFixed(2), pnl });
  if (!(await persist()).ok) return;
  closeAddModal();
  rebuildAll();
  setTimeout(() => showDetail(date), 50);
}

function openEditModal(uid) {
  const t = DATA.trades.find(x => x.uid === uid);
  if (!t) { alert('Trade nicht gefunden.'); return; }
  const isImported = t.source === 'import';
  if (isImported && !t.sourceRowId) { alert('Import-Quelle fehlt \u2014 Trade kann nicht sicher bearbeitet werden.'); return; }
  openEditTradeDialog(t);
}

async function saveEdit() {
  const { uid, date, desc, broker, shares, buy, sell, tax } = readEditTradeForm();
  const idx = DATA.trades.findIndex(x => x.uid === uid);
  if (idx === -1) { alert('Trade nicht gefunden.'); return; }
  const trade = DATA.trades[idx];

  if (trade.source === 'import') {
    const updated = updateImportSellRow(DATA.importRows, trade.sourceRowId, {
      date, description: desc, shares, amount: sell, tax
    });
    if (updated.error) { alert('Bearbeiten abgebrochen: ' + updated.error); return; }

    let replay;
    try {
      replay = replayStoredImports(updated.rows);
    } catch (e) {
      alert('Bearbeiten abgebrochen: ' + e.message);
      return;
    }

    const previousData = DATA;
    DATA = Object.assign({}, DATA, {
      importRows: updated.rows,
      trades: legacyTrades().concat(replay.trades),
      openLots: replay.openLots
    });
    const saveResult = await persist();
    if (!saveResult.ok) {
      // Bei einem Drive-Konflikt hat persist bereits den neuesten Serverstand
      // geladen. Nur bei anderen Fehlern ist der lokale Vorzustand korrekt.
      if (!saveResult.conflict) DATA = previousData;
      return;
    }
    closeEditModal();
    rebuildAll();
    setTimeout(() => showDetail(date), 50);
    return;
  }

  if (!desc || !buy || !sell) { alert('Bitte Produkt, Kauf- und Verkaufsbetrag ausf\u00fcllen.'); return; }
  const pnl = +(sell - buy - tax).toFixed(2);
  DATA.trades[idx] = Object.assign({}, DATA.trades[idx], { date, desc, broker, shares, buy: +buy.toFixed(2), sell: +sell.toFixed(2), tax: +tax.toFixed(2), pnl });
  if (!(await persist()).ok) return;
  closeEditModal();
  rebuildAll();
  setTimeout(() => showDetail(date), 50);
}

/* ============================================================
   CSV IMPORT (FIFO, Buy-before-Sell tiebreak, UID dedup)
   ============================================================ */
function openImportModal() {
  pendingImport = []; pendingOpenLots = []; pendingImportRows = null; pendingImportBaseOpenLots = null; pendingImportReport = null;
  openImportDialog();
}
function closeImportModal() {
  closeImportDialog();
}
function handleDragOver(event) { handleImportDragOver(event); }
function handleDragLeave() { handleImportDragLeave(); }
function handleDrop(event) { handleImportDrop(event, handleFileSelect); }
function handleFileSelect(file) {
  readImportFile(file, parseImport, importError);
}

function importError(msg) {
  pendingImportReport = null;
  showImportError(msg);
}

function showImportMigration(migration) {
  // Eine alte Vorschau darf hinter dem Dialog nicht versehentlich bestaetigt
  // werden. Der Dialog erklaert nur den sicheren Zuschnitt und veraendert DATA nie.
  pendingImport = []; pendingOpenLots = []; pendingImportRows = null; pendingImportBaseOpenLots = null; pendingImportReport = null;
  renderImportMigration(migration);
}

function parseImport(text) {
  // Parsen + Validieren passiert in import.js (pure). Hier nur Fehleranzeige + Rendering.
  const result = parseScalableCsv(text);
  if (result.error) { importError(result.error); return; }
  const filtered = result.rows;
  // Datierbare Altzeilen werden vor dem Replay erkannt. So ueberdeckt ein
  // daraus folgender FIFO-Fehler nicht die eigentliche Migrationsanleitung.
  const migrationByDate = diagnoseFirstLedgerImport(legacyTrades(), DATA.openLots, filtered, []);
  if (!hasImportLedger() && migrationByDate.blocked) {
    showImportMigration(migrationByDate);
    return;
  }
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
  // Ein erster Ledger-Import darf keine alte Historie nochmals uebernehmen.
  // Die pure Diagnose liefert der UI zugleich den sicheren Stichtag und den
  // Umfang der erkannten Ueberschneidung, ohne gespeicherte Daten anzufassen.
  const migration = diagnoseFirstLedgerImport(legacyTrades(), DATA.openLots, filtered, closed);
  if (!hasImportLedger() && migration.blocked) {
    showImportMigration(migration);
    return;
  }
  pendingOpenLots = openLots;
  pendingImportRows = importRows;
  pendingImportBaseOpenLots = importBaseOpenLots;

  const { marked, newCount } = markDuplicates(closed, new Set(DATA.trades.map(t => t.uid)));
  pendingImport = marked;
  pendingImportReport = buildImportReport({
    incomingRows: filtered,
    rejectedRows: result.meta ? result.meta.rejectedRows : 0,
    previousImportRows: DATA.importRows,
    candidateTrades: closed,
    previousTrades: DATA.trades,
    nextTrades: legacyTrades().concat(closed),
    previousOpenLots: visibleOpenLots(DATA.openLots, hiddenOpenPositionsDATA()),
    nextOpenLots: visibleOpenLots(openLots, hiddenOpenPositionsDATA())
  });

  renderImportPreview(pendingImport, pendingImportReport, newImportRowCount, newCount);
}

async function confirmImport() {
  if (!pendingImportRows || !pendingImportBaseOpenLots) return;
  const importedTrades = pendingImport.map(t => {
    const o = Object.assign({}, t);
    delete o.isDup;
    return o;
  });
  const protectedData = addSafetyBackup(DATA, 'csv-import');
  const nextData = Object.assign({}, protectedData, {
    importRows: pendingImportRows,
    importBaseOpenLots: pendingImportBaseOpenLots,
    trades: legacyTrades().concat(importedTrades),
    openLots: pendingOpenLots
  });
  if (!(await persistReplacement(nextData)).ok) return;
  rebuildAll();
  showSavedImportReport(pendingImportReport);
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
  if (!confirm('Wirklich ALLE Trades l\u00f6schen? Vor dem Leeren wird automatisch eine Sicherung angelegt.')) return;
  const protectedData = addSafetyBackup(DATA, 'reset');
  const nextData = Object.assign(emptyData(), { safetyBackups: protectedData.safetyBackups });
  if (!(await persistReplacement(nextData)).ok) return;
  rebuildAll();
  alert('Alle Daten gel\u00f6scht. Der vorherige Stand liegt unter Sicherungen.');
}

function storageDestinationLabel() {
  return storageMode === STORAGE_MODE_LOCAL ? 'auf diesem Geraet' : 'in Google Drive';
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function openEncryptedBackups() {
  closeMobileActions();
  openEncryptedBackupDialog();
}

async function createEncryptedBackup() {
  const { password, confirmation } = readEncryptedExportPasswords();
  if (password !== confirmation) {
    setEncryptedBackupStatus('Die beiden Passphrasen stimmen nicht ueberein.', true);
    return;
  }
  setEncryptedBackupBusy(true);
  setEncryptedBackupStatus('Backup wird lokal verschluesselt \u2026');
  try {
    const encrypted = await encryptBackupFile(DATA, password);
    downloadTextFile(
      encrypted,
      'trade-kalender-backup-' + toLocalDateStr(new Date()) + '.json.enc',
      'application/octet-stream'
    );
    closeEncryptedBackupDialog(true);
    alert('Verschluesseltes Backup wurde erstellt. Bewahre Datei und Passphrase getrennt auf.');
  } catch (error) {
    setEncryptedBackupBusy(false);
    setEncryptedBackupStatus(error.message, true);
  }
}

async function restoreEncryptedBackup() {
  const { file, password } = readEncryptedImport();
  if (!file) {
    setEncryptedBackupStatus('Bitte zuerst eine verschluesselte Backup-Datei auswaehlen.', true);
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    setEncryptedBackupStatus('Backup-Datei ist zu gross.', true);
    return;
  }
  setEncryptedBackupBusy(true);
  setEncryptedBackupStatus('Backup wird lokal entschluesselt und geprueft \u2026');
  try {
    const restored = await decryptBackupFile(await file.text(), password);
    if (!isAppDataDocument(restored)) {
      throw new Error('Backup enthaelt keinen gueltigen App-Datenstand.');
    }
    const normalized = normalizeAppData(restored);
    if (!confirm(normalized.trades.length + ' Trades aus dem verschluesselten Backup ' +
      storageDestinationLabel() + ' wiederherstellen? Der aktuelle Stand wird vorher gesichert.')) {
      setEncryptedBackupBusy(false);
      setEncryptedBackupStatus('Wiederherstellung abgebrochen.');
      return;
    }
    const nextData = addSafetyBackupFrom(normalized, DATA, 'encrypted-restore');
    if (!(await persistReplacement(nextData)).ok) {
      setEncryptedBackupBusy(false);
      setEncryptedBackupStatus('Wiederherstellung konnte nicht gespeichert werden.', true);
      return;
    }
    closeEncryptedBackupDialog(true);
    rebuildAll();
    alert(nextData.trades.length + ' Trades aus dem verschluesselten Backup wiederhergestellt.');
  } catch (error) {
    setEncryptedBackupBusy(false);
    setEncryptedBackupStatus(error.message, true);
  }
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
    if (!isAppDataDocument(parsed)) {
      alert('Die Datei enth\u00e4lt kein g\u00fcltiges trades-Array.');
      return;
    }
    const n = parsed.trades.length;
    if (!confirm(n + ' Trades aus der unverschluesselten Datei ' + storageDestinationLabel() +
      ' wiederherstellen? Der aktuelle Stand wird vorher automatisch gesichert.')) return;
    const protectedData = addSafetyBackup(DATA, 'json-restore');
    const nextData = {
      trades: parsed.trades,
      openLots: Array.isArray(parsed.openLots) ? parsed.openLots : [],
      capital: typeof parsed.capital === 'number' ? parsed.capital : 0,
      importRows: Array.isArray(parsed.importRows) ? parsed.importRows : [],
      importBaseOpenLots: Array.isArray(parsed.importBaseOpenLots) ? parsed.importBaseOpenLots : null,
      hiddenOpenPositions: Array.isArray(parsed.hiddenOpenPositions) ? parsed.hiddenOpenPositions : [],
      safetyBackups: protectedData.safetyBackups
    };
    if (!(await persistReplacement(nextData)).ok) return;
    rebuildAll();
    alert(n + ' Trades erfolgreich ' + storageDestinationLabel() + ' wiederhergestellt.');
  };
  reader.readAsText(file);
}

function openSafetyBackups() {
  openSafetyBackupDialog(DATA.safetyBackups, restoreSafetyBackupById);
}

async function restoreSafetyBackupById(backupId) {
  if (!confirm('Diesen gesicherten Stand wiederherstellen? Der aktuelle Stand wird vorher ebenfalls gesichert.')) return;
  const nextData = restoreSafetyBackup(DATA, backupId);
  if (!nextData) {
    alert('Die Sicherung ist nicht mehr vorhanden. Bitte den Verlauf neu oeffnen.');
    return;
  }
  if (!(await persistReplacement(nextData)).ok) return;
  rebuildAll();
  renderSafetyBackupDialog(DATA.safetyBackups, restoreSafetyBackupById);
  alert(nextData.trades.length + ' Trades aus der Sicherung wiederhergestellt.');
}

function exportCSV() {
  const rows = ['UID;Datum;Zeit;ISIN;Produkt;Broker;Kauf;Verkauf;Steuer;P&L'];
  DATA.trades.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    rows.push([t.uid || '', t.date, t.time || '', t.isin || '', t.desc, t.broker || '', t.buy, t.sell, t.tax, t.pnl]
      .map(csvCell).join(';'));
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
async function setCapital() {
  const cur = DATA.capital || 0;
  const input = prompt('Einstand / Startkapital in Euro eingeben:', cur > 0 ? String(cur) : '');
  if (input === null) return;
  const val = parseFloat(String(input).replace(/\\./g, '').replace(',', '.')) || 0;
  if (val < 0) { alert('Bitte einen positiven Betrag eingeben.'); return; }
  DATA.capital = val;
  if (!(await persist()).ok) return;
  rebuildStats();
  buildTradingMetrics();
  buildEquityCurve();
}

/* ============================================================
   TRADE-SUCHE (rein lesende Ansicht auf DATA.trades)
   ============================================================ */
function openTradeSearch() {
  closeMobileActions();
  openTradeSearchDialog(DATA.trades, showDetail);
}

function resetTradeSearch() {
  resetTradeSearchDialog(DATA.trades, showDetail);
}

function buildTradeSearch() {
  renderTradeSearch(DATA.trades, showDetail);
}

function rebuildAll() {
  rebuildStats();
  buildCalendar();
  buildWeekly();
  buildMonthly();
  buildOpenPositions();
  buildTradingMetrics();
  buildEquityCurve();
  buildWeekdayStats();
  buildTimeStats();
}

function closeDialogById(id) {
  const closers = {
    'search-overlay': closeTradeSearch,
    'detail-overlay': closeDetail,
    'add-overlay': closeAddModal,
    'edit-overlay': closeEditModal,
    'close-pos-overlay': closeClosePosModal,
    'import-overlay': closeImportModal,
    'import-migration-overlay': closeImportMigration,
    'safety-backup-overlay': closeSafetyBackupDialog,
    'storage-migration-overlay': cancelStorageMigration,
    'encrypted-backup-overlay': closeEncryptedBackupDialog
  };
  if (closers[id]) closers[id]();
}

function bind(id, eventName, handler) {
  const element = $(id);
  if (element) element.addEventListener(eventName, handler);
}

function bindBackdrop(id, close) {
  bind(id, 'click', event => {
    if (event.target === event.currentTarget) close();
  });
}

function bindMobileAction(id, action) {
  bind(id, 'click', () => {
    closeMobileActions();
    action();
  });
}

function initAuthWhenReady() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    initAuth();
  }
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
  // Ereignisse werden ausschliesslich hier verdrahtet. Inline-Handler im HTML
  // waeren fuer eine wirksame Script-CSP nur mit unsafe-inline ausfuehrbar.
  bind('btn-login', 'click', signIn);
  bind('btn-local-mode', 'click', startLocalMode);
  bind('btn-logout', 'click', signOut);
  bind('btn-connect-drive', 'click', connectDrive);
  bind('btn-add', 'click', openAddModal);
  bind('btn-search', 'click', openTradeSearch);
  bind('btn-import', 'click', openImportModal);
  bind('btn-export', 'click', exportCSV);
  bind('btn-restore', 'click', openRestoreJson);
  bind('btn-backups', 'click', openSafetyBackups);
  bind('btn-encrypted-backup', 'click', openEncryptedBackups);
  bind('btn-reset', 'click', resetAllData);

  bind('main-nav', 'keydown', handleMainTabKey);
  document.querySelectorAll('.nav-tab[data-tab]').forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.tab));
  });
  bind('stats-view-nav', 'keydown', handleStatsViewKey);
  document.querySelectorAll('.stats-view-nav-btn').forEach(button => {
    button.addEventListener('click', () => setStatsView(button.id.slice('stats-nav-'.length)));
  });
  document.querySelectorAll('#bottom-bar button[data-tab]').forEach(button => {
    button.addEventListener('click', () => mobileTab(button.dataset.tab));
  });
  bind('mobile-actions-toggle', 'click', toggleMobileActions);

  bind('weekday-mode-buy', 'click', () => setWeekdayMode('buy'));
  bind('weekday-mode-sell', 'click', () => setWeekdayMode('sell'));
  bind('ts-mode-buy', 'click', () => setTsMode('buy'));
  bind('ts-mode-sell', 'click', () => setTsMode('sell'));

  bind('search-close-btn', 'click', closeTradeSearch);
  bind('search-query', 'input', buildTradeSearch);
  ['search-from', 'search-to', 'search-direction', 'search-result', 'search-hold']
    .forEach(id => bind(id, 'change', buildTradeSearch));
  bind('search-reset-btn', 'click', resetTradeSearch);
  bindBackdrop('search-overlay', closeTradeSearch);

  bind('detail-close-btn', 'click', closeDetail);
  bind('add-day-btn', 'click', openAddModalForDate);
  bindBackdrop('detail-overlay', closeDetail);

  ['f-buy', 'f-sell', 'f-tax'].forEach(id => bind(id, 'input', updatePnlPreview));
  bind('add-cancel-btn', 'click', closeAddModal);
  bind('add-save-btn', 'click', saveTrade);
  bindBackdrop('add-overlay', closeAddModal);

  ['e-buy', 'e-sell', 'e-tax'].forEach(id => bind(id, 'input', updateEditPreview));
  bind('edit-cancel-btn', 'click', closeEditModal);
  bind('edit-save-btn', 'click', saveEdit);
  bindBackdrop('edit-overlay', closeEditModal);

  bind('cp-sell', 'input', updateClosePreview);
  bind('cp-tax', 'input', onCloseTaxInput);
  bind('close-pos-total-loss', 'click', setCloseTotalLoss);
  bind('close-pos-cancel-btn', 'click', closeClosePosModal);
  bind('close-pos-save-btn', 'click', confirmClosePos);
  bindBackdrop('close-pos-overlay', closeClosePosModal);

  bind('drop-zone', 'click', () => $('csv-input').click());
  bind('drop-zone', 'dragover', handleDragOver);
  bind('drop-zone', 'dragleave', handleDragLeave);
  bind('drop-zone', 'drop', handleDrop);
  bind('csv-input', 'change', event => handleFileSelect(event.currentTarget.files[0]));
  bind('import-close-btn', 'click', closeImportModal);
  bind('import-confirm-btn', 'click', confirmImport);
  bindBackdrop('import-overlay', closeImportModal);
  bind('import-migration-cancel-btn', 'click', closeImportMigration);
  bind('import-migration-choose-btn', 'click', chooseImportMigrationFile);
  bindBackdrop('import-migration-overlay', closeImportMigration);

  bind('json-input', 'change', event => handleJsonRestore(event.currentTarget.files[0]));
  bind('safety-backup-close', 'click', closeSafetyBackupDialog);
  bindBackdrop('safety-backup-overlay', closeSafetyBackupDialog);
  bind('storage-migration-cancel', 'click', cancelStorageMigration);
  bind('storage-migration-local', 'click', () => confirmStorageMigration('local'));
  bind('storage-migration-drive', 'click', () => confirmStorageMigration('drive'));
  bindBackdrop('storage-migration-overlay', cancelStorageMigration);
  bind('encrypted-backup-close', 'click', closeEncryptedBackupDialog);
  bind('encrypted-backup-export', 'click', createEncryptedBackup);
  bind('encrypted-backup-restore', 'click', restoreEncryptedBackup);
  bind('encrypted-backup-file', 'change', showEncryptedBackupFileName);
  bindBackdrop('encrypted-backup-overlay', closeEncryptedBackupDialog);

  bind('metrics-from', 'change', buildTradingMetrics);
  bind('metrics-to', 'change', buildTradingMetrics);
  bind('metrics-reset', 'click', resetTradingMetrics);

  bindMobileAction('btn-add-m', openAddModal);
  bind('btn-search-m', 'click', openTradeSearch);
  bindMobileAction('btn-import-m', openImportModal);
  bindMobileAction('btn-export-m', exportCSV);
  bindMobileAction('btn-restore-m', openRestoreJson);
  bindMobileAction('btn-backups-m', openSafetyBackups);
  bindMobileAction('btn-encrypted-backup-m', openEncryptedBackups);
  bindMobileAction('btn-connect-drive-m', connectDrive);
  bindMobileAction('btn-reset-m', resetAllData);

  bind('google-gis-script', 'load', initAuthWhenReady);
  bind('google-gis-script', 'error', () => {
    reportAuthError('Google-Anmeldung konnte nicht geladen werden. Bitte Netzwerk pruefen und neu laden.');
  });
  updateGoogleLoginState();
  initAuthWhenReady();
  document.addEventListener('keydown', event => {
    if (handleAccessibleDialogKey(event, closeDialogById)) return;
    if (event.key === 'Escape' && $('mobile-actions')?.classList.contains('open')) {
      event.preventDefault();
      closeMobileActions(true);
    }
  });
  bind('s-rendite-card', 'click', setCapital);

  // Ein lokal gewaehlter Modus kann ohne Google und ohne Netz sofort starten.
  // Drive bleibt wegen des bewusst interaktiven OAuth-Dialogs auf dem Login.
  resumeStoredMode();

}

// ES-Module laufen "deferred" — d.h. DOMContentLoaded kann schon vorbei sein,
// wenn dieses Modul ausgeführt wird. Deshalb starten wir bootApp direkt,
// falls das DOM bereits geladen ist, sonst warten wir auf das Event.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
