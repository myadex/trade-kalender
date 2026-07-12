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
// Liefert: { closed: [...Trades], openLots: [...Lots] }
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
  (existingOpenLots || []).forEach(lot => {
    if (!buyPools[lot.isin]) buyPools[lot.isin] = [];
    buyPools[lot.isin].push({ shares: lot.shares, amount: lot.amount, date: lot.date, time: lot.time || '', desc: lot.desc, isin: lot.isin });
  });

  const closed = [];
  sorted.forEach(row => {
    const isin = row.isin;
    const shares = parseFloat(row.shares) || 0;
    const amount = parseFloat(row.amount) || 0;
    const tax = parseFloat(row.tax) || 0;
    const dateRaw = row.date;
    const dateStr = normalizeXlsxDate(dateRaw);

    if (row.type === 'Buy' && shares > 0) {
      if (!buyPools[isin]) buyPools[isin] = [];
      buyPools[isin].push({ shares, amount: Math.abs(amount), date: dateStr, time: String(row.time || ''), desc: row.description, isin });
    } else if (row.type === 'Sell' && shares > 0) {
      const pool = buyPools[isin] || [];
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
        shares, buy: +cost.toFixed(2), sell: +sellRev.toFixed(2), tax: +tax.toFixed(2), pnl
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

  return { closed, openLots };
}
