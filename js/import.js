// ============================================================
// import.js — XLSX-Parsing und -Validierung (pure, kein DOM)
// ============================================================
// Nimmt einen ArrayBuffer + die XLSX-Bibliothek (wird übergeben, damit
// dieses Modul nicht von globalem XLSX abhängt und testbar bleibt).
// Gibt entweder { error: '...' } oder { rows: [...gefilterte Zeilen] } zurück.
// Das eigentliche FIFO-Matching und das DOM-Rendering passieren in app.js.

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
