// ============================================================
// helpers.js — kleine Hilfsfunktionen (Formatierung, DOM-Zugriff)
// ============================================================
// Reine Werkzeuge ohne eigene Logik. Werden überall gebraucht.

// Kurzform für document.getElementById
export const $ = id => document.getElementById(id);

// Formatiert einen Betrag deutsch mit Vorzeichen und €, z.B. "+1.234,56 €"
export const fmtDE = (v, d = 2) => {
  const abs = Math.abs(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  return (v < 0 ? '-' : '+') + abs + ' \u20ac';
};

// Formatiert eine Zahl deutsch ohne Vorzeichen, z.B. "1.234,56"
export const fmtPlain = (v, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

// Kompakte Darstellung mit Vorzeichen, z.B. "+1.2k" oder "-450"
export const fmtK = v => {
  const s = v < 0 ? '-' : '+';
  const a = Math.abs(v);
  return s + (a >= 1000 ? (a / 1000).toFixed(1) + 'k' : a.toFixed(0));
};

// CSV-Importe und JSON-Restores sind Nutzereingaben. Bevor solche Werte in
// innerHTML landen, muessen sie Text bleiben; sonst wird eine Produktbezeichnung
// wie "<img onerror=...>" als Code statt als Beschreibung interpretiert.
export const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Wandelt ein Date in einen lokalen 'YYYY-MM-DD'-String um.
// WICHTIG: NICHT toISOString() verwenden — das rechnet in UTC um und
// verschiebt Mitternachts-Zeiten um einen Tag zurück (Zeitzonen-Bug).
export function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Normalisiert das date-Feld aus einem XLSX-Import zu 'YYYY-MM-DD'.
// SheetJS liefert Excel-Datumszellen als Date-Objekt bei UTC-Mitternacht
// (z.B. 2026-06-29T00:00:00Z). Deshalb müssen die UTC-Komponenten gelesen
// werden — sonst rutscht das Datum je nach Zeitzone um einen Tag.
// Strings (falls die Zelle als Text vorliegt) werden direkt geparst.
export function normalizeXlsxDate(raw) {
  if (raw instanceof Date) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  const s = String(raw).trim();
  // ISO: 2026-06-29 oder 2026-06-29T...
  let mm = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mm) return mm[1] + '-' + mm[2] + '-' + mm[3];
  // Deutsch: 29.06.2026
  mm = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (mm) return mm[3] + '-' + mm[2].padStart(2, '0') + '-' + mm[1].padStart(2, '0');
  // US: 06/29/2026 oder 06/29/26
  mm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mm) {
    let yr = mm[3].length === 2 ? '20' + mm[3] : mm[3];
    return yr + '-' + mm[1].padStart(2, '0') + '-' + mm[2].padStart(2, '0');
  }
  return s.slice(0, 10);
}

// Zeigt eine Statusmeldung im Header (oder versteckt sie bei leerem Text)
export function setStatus(msg, isError) {
  const el = $('status-bar');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--red)' : 'var(--muted)';
  el.style.display = msg ? 'block' : 'none';
}
