// ============================================================
// import.js — XLSX-Parsing und -Validierung (pure, kein DOM)
// ============================================================
// Nimmt einen ArrayBuffer + die XLSX-Bibliothek (wird übergeben, damit
// dieses Modul nicht von globalem XLSX abhängt und testbar bleibt).
// Gibt entweder { error: '...' } oder { rows: [...gefilterte Zeilen] } zurück.
// Das eigentliche FIFO-Matching und das DOM-Rendering passieren in app.js.

import { toLocalDateStr } from './helpers.js';

const REQUIRED_COLUMNS = ['type', 'status', 'isin', 'shares', 'amount', 'date'];

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
    const da = (typeof a.date === 'object' && a.date instanceof Date) ? toLocalDateStr(a.date) : String(a.date);
    const db = (typeof b.date === 'object' && b.date instanceof Date) ? toLocalDateStr(b.date) : String(b.date);
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
