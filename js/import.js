// ============================================================
// import.js — Broker-Parsing und Ledger-Bearbeitung (pure, kein DOM)
// ============================================================
// Nimmt einen ArrayBuffer + die XLSX-Bibliothek (wird übergeben, damit
// dieses Modul nicht von globalem XLSX abhängt und testbar bleibt).
// Gibt entweder { error: '...' } oder { rows: [...gefilterte Zeilen] } zurück.
// Das FIFO-Matching passiert in fifo.js, das DOM-Rendering in app.js.

import { normalizeXlsxDate } from './helpers.js';

const REQUIRED_COLUMNS = ['type', 'status', 'isin', 'shares', 'amount', 'date'];

// ------------------------------------------------------------
// Deutsches Zahlenformat -> Number.  "20.420,01" -> 20420.01
// (Punkt = Tausender, Komma = Dezimal). Leere Felder -> 0.
// ------------------------------------------------------------
export function parseGermanNumber(s) {
  if (s === null || s === undefined) return 0;
  s = String(s).trim();
  if (s === '') return 0;
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Eine Rohzeile braucht eine stabile Identitaet, damit ein wiederholter CSV-
// Import dieselbe Buchung nicht erneut im Ledger ablegt. Sie beschreibt die
// Brokerzeile selbst, nicht das daraus abgeleitete FIFO-Ergebnis.
export function sourceRowId(row) {
  const numberKey = (value, decimals) => (parseFloat(value) || 0).toFixed(decimals);
  return JSON.stringify([
    String(row.type || ''),
    String(row.status || ''),
    normalizeXlsxDate(row.date),
    String(row.time || ''),
    String(row.isin || ''),
    numberKey(row.shares, 6),
    numberKey(row.amount, 2),
    numberKey(row.tax, 2),
    String(row.description || '')
  ]);
}

// Neue Ledger-Zeilen behalten alle Brokerfelder und erhalten nur die technische
// Quell-ID. Die FIFO-Logik kann sie dadurch spaeter vollstaendig erneut abspielen.
export function withSourceRowIds(rows) {
  return (rows || []).map(row => Object.assign({}, row, {
    sourceRowId: row.sourceRowId || sourceRowId(row)
  }));
}

// Fuegt nur bislang unbekannte Brokerzeilen hinzu. So bleibt der Import
// idempotent, auch wenn ein CSV-Export historische Zeilen erneut enthaelt.
export function mergeImportRows(existingRows, incomingRows) {
  const merged = withSourceRowIds(existingRows);
  const known = new Set(merged.map(row => row.sourceRowId));
  withSourceRowIds(incomingRows).forEach(row => {
    if (known.has(row.sourceRowId)) return;
    known.add(row.sourceRowId);
    merged.push(row);
  });
  return merged;
}

// Beim ersten Ledger-Import existieren fuer alte Trades noch keine Broker-
// Rohzeilen. Die Diagnose trennt deshalb reine Analyse von der UI und bezieht
// neben geschlossenen Trades auch offene Lots ein: Deren Kaufzeilen duerfen
// ebenfalls nicht erneut importiert werden.
export function diagnoseFirstLedgerImport(legacyTrades, baseOpenLots, incomingRows, incomingTrades) {
  const trades = Array.isArray(legacyTrades) ? legacyTrades : [];
  const lots = Array.isArray(baseOpenLots) ? baseOpenLots : [];
  const rows = Array.isArray(incomingRows) ? incomingRows : [];
  const closed = Array.isArray(incomingTrades) ? incomingTrades : [];
  const validDate = value => {
    const normalized = normalizeXlsxDate(value);
    const parts = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return null;
    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day ? normalized : null;
  };

  const historyDates = [];
  trades.forEach(trade => {
    const buyDate = validDate(trade.buyDate);
    const sellDate = validDate(trade.date);
    if (buyDate) historyDates.push(buyDate);
    if (sellDate) historyDates.push(sellDate);
  });
  lots.forEach(lot => {
    const lotDate = validDate(lot.date || lot.buyDate);
    if (lotDate) historyDates.push(lotDate);
  });
  historyDates.sort();

  const incomingDates = rows.map(row => validDate(row.date)).filter(Boolean).sort();
  const cutoff = historyDates.length > 0 ? historyDates[historyDates.length - 1] : null;
  const legacyUids = new Set(trades.map(trade => trade.uid).filter(Boolean));
  const overlapUids = new Set(
    closed.filter(trade => trade && legacyUids.has(trade.uid)).map(trade => trade.uid)
  );
  const overlapCount = overlapUids.size;
  const rowsAtOrBeforeCutoff = cutoff ? incomingDates.filter(date => date <= cutoff).length : 0;
  const rowsAfterCutoff = cutoff ? incomingDates.filter(date => date > cutoff).length : 0;

  return {
    // Auch eine reine alte Buy-Zeile ist gefaehrlich: Sie erzeugt zwar keinen
    // UID-Treffer, kann aber ein bereits offenes Basis-Lot verdoppeln.
    blocked: overlapCount > 0 || rowsAtOrBeforeCutoff > 0,
    overlapCount,
    legacyTradeCount: trades.length,
    baseOpenLotCount: lots.length,
    historyFrom: historyDates[0] || null,
    historyTo: cutoff,
    cutoff,
    incomingFrom: incomingDates[0] || null,
    incomingTo: incomingDates[incomingDates.length - 1] || null,
    incomingRowCount: rows.length,
    rowsAtOrBeforeCutoff,
    rowsAfterCutoff,
    rowsWithoutDate: rows.length - incomingDates.length
  };
}

// Import-Trades sind nur eine abgeleitete Sicht. Deshalb wird beim Bearbeiten
// die zugehoerige Sell-Rohzeile ersetzt und ihre technische ID neu erzeugt;
// Einstand, P&L und offene Lots berechnet anschliessend allein der FIFO-Replay.
export function updateImportSellRow(importRows, currentSourceRowId, changes) {
  const rows = withSourceRowIds(importRows);
  const index = rows.findIndex(row => row.sourceRowId === currentSourceRowId);
  if (index === -1) return { error: 'Die zugehoerige Import-Zeile wurde nicht gefunden.' };

  const current = rows[index];
  if (current.type !== 'Sell') return { error: 'Nur Verkaufszeilen koennen als Trade bearbeitet werden.' };

  const date = String(changes && changes.date || '').trim();
  const description = String(changes && changes.description || '').trim();
  const shares = Number(changes && changes.shares);
  const amount = Number(changes && changes.amount);
  const tax = Number(changes && changes.tax);
  const dateParts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let validDate = false;
  if (dateParts) {
    const year = Number(dateParts[1]);
    const month = Number(dateParts[2]);
    const day = Number(dateParts[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    validDate = parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  }
  if (!validDate || !description || !Number.isFinite(shares) || shares <= 0 ||
      !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(tax)) {
    return { error: 'Bitte Datum, Produkt, Stueckzahl, Verkaufsbetrag und Steuer gueltig ausfuellen.' };
  }

  const updated = Object.assign({}, current, {
    date,
    description,
    shares: +shares.toFixed(6),
    amount: +amount.toFixed(2),
    tax: +tax.toFixed(2)
  });
  delete updated.sourceRowId;
  updated.sourceRowId = sourceRowId(updated);

  // Zwei identische Roh-IDs wuerden beim naechsten CSV-Import zusammenfallen.
  // Die Kollision wird deshalb vor dem Speichern sichtbar abgelehnt.
  if (rows.some((row, rowIndex) => rowIndex !== index && row.sourceRowId === updated.sourceRowId)) {
    return { error: 'Diese Verkaufszeile ist bereits im Import-Ledger vorhanden.' };
  }

  const nextRows = rows.map((row, rowIndex) => rowIndex === index ? updated : row);
  return { rows: nextRows, sourceRowId: updated.sourceRowId };
}

// ------------------------------------------------------------
// Zerlegt eine CSV-Zeile und beachtet Anführungszeichen
// (Felder in "..." dürfen das Trennzeichen enthalten).
// ------------------------------------------------------------
function parseCsvLine(line, delimiter) {
  const fields = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === delimiter && !inQuotes) {
      fields.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  fields.push(cur);
  return fields;
}

// ------------------------------------------------------------
// Parst eine Scalable-Capital-CSV (Semikolon-getrennt, deutsche Zahlen).
// Gibt { rows } oder { error } zurück — gleiche Struktur wie der XLSX-Parser,
// damit die restliche Import-Pipeline unverändert bleibt.
// Datum bleibt als String (z.B. "2026-07-01") — keine Zeitzonen-Umrechnung.
// ------------------------------------------------------------
export function parseScalableCsv(text) {
  if (!text || String(text).trim() === '') {
    return { error: 'Die CSV-Datei ist leer.' };
  }
  const allLines = String(text).split(/\r?\n/).filter(l => l.trim() !== '');
  if (allLines.length < 2) {
    return { error: 'Keine Datenzeilen in der CSV gefunden.' };
  }
  // Trennzeichen automatisch erkennen (Scalable nutzt Semikolon)
  const first = allLines[0];
  const delimiter = (first.split(';').length >= first.split(',').length) ? ';' : ',';
  const headers = parseCsvLine(allLines[0], delimiter).map(h => h.trim());

  const missing = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
  if (missing.length > 0) {
    return { error: 'Spalten fehlen in der CSV: ' + missing.join(', ') + '. Erwartet wird ein Scalable Capital CSV-Export.' };
  }

  const rows = [];
  for (let i = 1; i < allLines.length; i++) {
    const vals = parseCsvLine(allLines[i], delimiter);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
    // Zahlenfelder ins numerische Format bringen (wie der XLSX-Pfad es liefert)
    obj.shares = parseGermanNumber(obj.shares);
    obj.amount = parseGermanNumber(obj.amount);
    obj.tax = parseGermanNumber(obj.tax);
    rows.push(obj);
  }

  const filtered = rows.filter(r => (r.type === 'Buy' || r.type === 'Sell') && r.status === 'Executed');
  if (filtered.length === 0) {
    return { error: 'Keine ausgef\u00fchrten Buy/Sell-Trades gefunden (Spalten type=Buy/Sell, status=Executed).' };
  }

  // Nach datetime sortieren, bei Gleichstand Buy vor Sell
  filtered.sort((a, b) => {
    const da = normalizeXlsxDate(a.date);
    const db = normalizeXlsxDate(b.date);
    const ta = da + String(a.time) + (a.type === 'Buy' ? '0' : '1');
    const tb = db + String(b.time) + (b.type === 'Buy' ? '0' : '1');
    return ta.localeCompare(tb);
  });

  return { rows: filtered };
}

// ------------------------------------------------------------
// Parst und validiert eine Scalable-Capital-XLSX.
// xlsxLib = die SheetJS-Bibliothek (window.XLSX im Browser).
// ------------------------------------------------------------
export function parseScalableXlsx(buffer, xlsxLib) {
  let wb;
  try {
    wb = xlsxLib.read(buffer, { type: 'array', cellDates: true });
  } catch (e) {
    return { error: 'Datei ist keine g\u00fcltige XLSX (besch\u00e4digt oder falsches Format).' };
  }
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return { error: 'Die Datei enth\u00e4lt keine Tabellenbl\u00e4tter.' };
  }
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { error: 'Erstes Tabellenblatt ist leer.' };

  const rows = xlsxLib.utils.sheet_to_json(ws, { defval: '' });
  if (rows.length === 0) return { error: 'Keine Datenzeilen in der Tabelle gefunden.' };

  // Pflichtspalten prüfen
  const cols = Object.keys(rows[0] || {});
  const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c));
  if (missing.length > 0) {
    return { error: 'Spalten fehlen im Export: ' + missing.join(', ') + '. Erwartet wird ein Scalable Capital XLSX-Export.' };
  }

  // Nur ausgeführte Käufe/Verkäufe behalten
  const filtered = rows.filter(r => (r.type === 'Buy' || r.type === 'Sell') && r.status === 'Executed');
  if (filtered.length === 0) {
    return { error: 'Keine ausgef\u00fchrten Buy/Sell-Trades gefunden (Spalten type=Buy/Sell, status=Executed).' };
  }

  // Nach datetime sortieren, bei Gleichstand Buy vor Sell
  filtered.sort((a, b) => {
    const da = normalizeXlsxDate(a.date);
    const db = normalizeXlsxDate(b.date);
    const ta = da + String(a.time) + (a.type === 'Buy' ? '0' : '1');
    const tb = db + String(b.time) + (b.type === 'Buy' ? '0' : '1');
    return ta.localeCompare(tb);
  });

  return { rows: filtered };
}

// ------------------------------------------------------------
// Markiert geschlossene Trades als neu/Duplikat gegenüber bestehenden UIDs.
// Gibt { marked: [...mit isDup], newCount, dupCount } zurück.
// ------------------------------------------------------------
export function markDuplicates(closed, existingUids) {
  const set = existingUids instanceof Set ? existingUids : new Set(existingUids);
  let newCount = 0, dupCount = 0;
  const marked = closed.map(t => {
    const isDup = set.has(t.uid);
    if (isDup) dupCount++; else newCount++;
    return Object.assign({}, t, { isDup });
  });
  return { marked, newCount, dupCount };
}
