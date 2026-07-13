// ============================================================
// fifo.js — Berechnungs-Kern (FIFO-Matching, Steuer, Aggregation)
// ============================================================
// WICHTIG: Alle Funktionen hier sind "pure functions" — sie bekommen
// ihre Daten als Parameter und greifen NICHT auf globalen State (DATA) zu.
// Das macht sie leicht testbar und wiederverwendbar.

import { KNOCKOUT_THRESHOLD, TAX_RATE } from './config.js';
import { normalizeXlsxDate } from './helpers.js';

// ------------------------------------------------------------
// Aggregiert Trades pro Tag → { 'YYYY-MM-DD': {pnl, rev, tax, n} }
// ------------------------------------------------------------
export function dayMap(trades) {
  const m = {};
  trades.forEach(t => {
    if (!m[t.date]) m[t.date] = { pnl: 0, rev: 0, tax: 0, n: 0 };
    m[t.date].pnl += t.pnl;
    m[t.date].rev += t.sell;
    m[t.date].tax += t.tax;
    m[t.date].n += 1;
  });
  return m;
}

// Eine offene Position ist nur eine Sicht auf einzelne Buy-Lots. Die stabile
// Lot-ID bindet einen Ausschluss an genau diese Lots, damit spaetere Kaeufe
// derselben ISIN nicht versehentlich ebenfalls verschwinden.
export function openLotId(lot) {
  if (lot && lot.openLotId) return String(lot.openLotId);
  if (lot && lot.sourceRowId) return String(lot.sourceRowId);
  const numberKey = (value, decimals) => (parseFloat(value) || 0).toFixed(decimals);
  return JSON.stringify([
    String(lot && lot.isin || ''),
    normalizeXlsxDate(lot && lot.date || ''),
    String(lot && lot.time || ''),
    numberKey(lot && lot.shares, 6),
    numberKey(lot && lot.amount, 2),
    String(lot && (lot.desc || lot.description) || '')
  ]);
}

export function withOpenLotIds(openLots) {
  return (openLots || []).map(lot => Object.assign({}, lot, {
    openLotId: openLotId(lot)
  }));
}

// Erzeugt nur den versionierten Ausschlussvermerk; Brokerzeilen und Lots
// bleiben unveraendert. eventId und hiddenAt kommen als Parameter, damit die
// Fachfunktion ohne Uhr- oder Zufallszugriff deterministisch testbar bleibt.
export function createHiddenOpenPositionEvent(openLots, isin, eventId, hiddenAt) {
  const lots = withOpenLotIds(openLots).filter(lot => lot.isin === isin);
  if (lots.length === 0) return { error: 'Die offene Position wurde nicht gefunden.' };
  if (!eventId) return { error: 'Der Ausschlussvermerk hat keine ID.' };

  const lotIds = Array.from(new Set(lots.map(lot => lot.openLotId)));
  const shares = lots.reduce((sum, lot) => sum + (parseFloat(lot.shares) || 0), 0);
  const cost = lots.reduce((sum, lot) => sum + Math.abs(parseFloat(lot.amount) || 0), 0);
  return {
    event: {
      version: 1,
      id: String(eventId),
      hiddenAt: Number.isFinite(Number(hiddenAt)) ? Number(hiddenAt) : 0,
      isin: String(isin),
      desc: String(lots[0].desc || lots[0].description || isin),
      lotIds,
      shares: +shares.toFixed(6),
      cost: +cost.toFixed(2)
    }
  };
}

// Unbekannte zukuenftige Ereignisversionen werden bewusst ignoriert. So kann
// ein alter Client keine Daten nach Regeln ausblenden, die er nicht versteht.
export function visibleOpenLots(openLots, hiddenOpenPositions) {
  const hiddenIds = new Set();
  (hiddenOpenPositions || []).forEach(event => {
    if (!event || event.version !== 1 || !Array.isArray(event.lotIds)) return;
    event.lotIds.forEach(id => hiddenIds.add(String(id)));
  });
  return withOpenLotIds(openLots).filter(lot => !hiddenIds.has(lot.openLotId));
}

export function activeHiddenOpenPositions(openLots, hiddenOpenPositions) {
  const openIds = new Set(withOpenLotIds(openLots).map(lot => lot.openLotId));
  return (hiddenOpenPositions || []).filter(event =>
    event && event.version === 1 && event.id && Array.isArray(event.lotIds) &&
    event.lotIds.some(id => openIds.has(String(id))));
}

export function restoreHiddenOpenPosition(hiddenOpenPositions, eventId) {
  return (hiddenOpenPositions || []).filter(event => String(event && event.id) !== String(eventId));
}

// ------------------------------------------------------------
// Leitet aus offenen Buy-Lots die zusammengefassten offenen
// Positionen ab (gruppiert pro ISIN, Durchschnittspreis etc.)
// ------------------------------------------------------------
export function deriveOpenPositions(openLots) {
  const byIsin = {};
  openLots.forEach(lot => {
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

// ------------------------------------------------------------
// Berechnet das P&L beim Schließen einer Position.
// Auf Verlust automatisch Steuererstattung (negative Steuer).
// Gibt { tax, pnl } zurück.
// ------------------------------------------------------------
export function closePositionPnl(cost, sell) {
  const gross = sell - cost;
  const tax = +(gross * TAX_RATE).toFixed(2); // negativ bei Verlust = Erstattung
  const pnl = +(sell - cost - tax).toFixed(2);
  return { tax, pnl };
}

// ------------------------------------------------------------
// Standard-P&L: Verkauf − Kauf − Steuer (Steuer MIT Vorzeichen)
// ------------------------------------------------------------
export function tradePnl(buy, sell, tax) {
  return +(sell - buy - tax).toFixed(2);
}

// ------------------------------------------------------------
// FIFO-Matching für einen Import.
// Nimmt: rohe Buy/Sell-Zeilen + bestehende offene Lots.
// Optional: applyKnockoutFilter (default false) — wenn true, werden
//   offene Lots unter KNOCKOUT_THRESHOLD verworfen. Standardmäßig aus,
//   damit ausgeknockte Positionen sichtbar bleiben und manuell
//   geschlossen werden können.
// Liefert: { closed: [...Trades], openLots: [...Lots], errors: [...] }
//
// Regeln (alle in der App validiert):
//  - Sortierung nach datetime, bei Gleichstand Buy VOR Sell
//  - Sells werden FIFO gegen Buys gematcht
//  - pnl = sellRevenue − costBasis − tax (Steuer MIT Vorzeichen)
// ------------------------------------------------------------
export function fifoMatch(rows, existingOpenLots, applyKnockoutFilter = false) {
  // Sortierung: datetime + Buy-before-Sell-Tiebreak
  const sorted = rows.slice().sort((a, b) => {
    const da = normalizeXlsxDate(a.date);
    const db = normalizeXlsxDate(b.date);
    const ta = da + String(a.time) + (a.type === 'Buy' ? '0' : '1');
    const tb = db + String(b.time) + (b.type === 'Buy' ? '0' : '1');
    return ta.localeCompare(tb);
  });

  // Gesamt-Kaufkosten je ISIN (für Knockout-Filter der offenen Lots)
  const isinBuyCost = {};
  sorted.filter(r => r.type === 'Buy').forEach(r => {
    const isin = r.isin;
    const amt = Math.abs(parseFloat(r.amount) || 0);
    isinBuyCost[isin] = (isinBuyCost[isin] || 0) + amt;
  });

  // Buy-Pools mit bestehenden offenen Lots starten (für Teilschließungen über Importe)
  const buyPools = {};
  withOpenLotIds(existingOpenLots).forEach(lot => {
    if (!buyPools[lot.isin]) buyPools[lot.isin] = [];
    buyPools[lot.isin].push({ shares: lot.shares, amount: lot.amount, date: lot.date, time: lot.time || '', desc: lot.desc, isin: lot.isin, openLotId: lot.openLotId });
  });

  const closed = [];
  const errors = [];
  sorted.forEach(row => {
    const isin = row.isin;
    const shares = parseFloat(row.shares) || 0;
    const amount = parseFloat(row.amount) || 0;
    const tax = parseFloat(row.tax) || 0;
    const dateRaw = row.date;
    const dateStr = normalizeXlsxDate(dateRaw);

    if (row.type === 'Buy' && shares > 0) {
      if (!buyPools[isin]) buyPools[isin] = [];
      const lot = { shares, amount: Math.abs(amount), date: dateStr, time: String(row.time || ''), desc: row.description, isin };
      lot.openLotId = row.openLotId || row.sourceRowId || openLotId(lot);
      buyPools[isin].push(lot);
    } else if (row.type === 'Sell' && shares > 0) {
      const pool = buyPools[isin] || [];
      const availableShares = pool.reduce((sum, lot) => sum + lot.shares, 0);
      // Ein Ueberverkauf darf nicht teilweise gegen vorhandene Lots gerechnet
      // werden: Das wuerde einen zu kleinen Einstand und damit falsches P&L
      // persistieren. Erst pruefen, dann das Pool mutieren.
      if (shares - availableShares > 0.001) {
        errors.push({
          isin,
          date: dateStr,
          time: String(row.time || ''),
          requestedShares: +shares.toFixed(3),
          availableShares: +availableShares.toFixed(3),
          unmatchedShares: +(shares - availableShares).toFixed(3)
        });
        return;
      }
      // Positionseroeffnung = aeltestes Lot (FIFO): Einstiegszeitpunkt des Trades
      const firstLot = pool.length > 0 ? { date: pool[0].date, time: pool[0].time || '' } : null;
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
      const pnl = +(sellRev - cost - tax).toFixed(2); // Steuer MIT Vorzeichen
      const uid = isin + '_' + dateStr + '_' + sellRev.toFixed(2) + '_' + shares.toFixed(3);
      closed.push({
        uid, date: dateStr, time: String(row.time || ''), isin, desc: row.description, broker: 'scalable',
        buyDate: firstLot ? firstLot.date : '', buyTime: firstLot ? firstLot.time : '',
        shares, buy: +cost.toFixed(2), sell: +sellRev.toFixed(2), tax: +tax.toFixed(2), pnl,
        sourceRowId: row.sourceRowId || null
      });
    }
  });

  // Übrige Lots = neue offene Positionen.
  // Knockout-Filter nur wenn ausdrücklich gewünscht (default: alle behalten,
  // damit ausgeknockte Positionen manuell geschlossen werden können).
  const openLots = [];
  Object.values(buyPools).forEach(pool => pool.forEach(lot => {
    if (lot.shares <= 0.001) return;
    if (applyKnockoutFilter && (isinBuyCost[lot.isin] || 0) < KNOCKOUT_THRESHOLD) return;
    openLots.push(lot);
  }));

  return { closed, openLots, errors };
}

// Spielt alle seit Einfuehrung des Ledgers gespeicherten Brokerzeilen gegen den unveraenderten
// Legacy-Bestand ab. Trades und offene Lots sind damit abgeleitete Daten und
// nach dem Loeschen einer Importzeile jederzeit reproduzierbar.
export function replayImportLedger(importRows, importBaseOpenLots) {
  const result = fifoMatch(importRows || [], importBaseOpenLots || [], false);
  return {
    trades: result.closed.map(trade => Object.assign({}, trade, { source: 'import' })),
    openLots: result.openLots,
    errors: result.errors
  };
}
