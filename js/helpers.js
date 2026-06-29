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

// Wandelt ein Date in einen lokalen 'YYYY-MM-DD'-String um.
// WICHTIG: NICHT toISOString() verwenden — das rechnet in UTC um und
// verschiebt Mitternachts-Zeiten um einen Tag zurück (Zeitzonen-Bug).
export function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// Zeigt eine Statusmeldung im Header (oder versteckt sie bei leerem Text)
export function setStatus(msg, isError) {
  const el = $('status-bar');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--red)' : 'var(--muted)';
  el.style.display = msg ? 'block' : 'none';
}
