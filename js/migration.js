// ============================================================
// migration.js — vollständiger, reproduzierbarer CSV-Neuaufbau
// ============================================================
// Dieser Pfad ersetzt bewusst den gesamten Legacy-Bestand. Er arbeitet nur
// mit Broker-Rohzeilen, damit Trades und offene Lots jederzeit erneut aus
// derselben Quelle abgeleitet werden koennen.

import { mergeImportRows } from './import.js';
import { replayImportLedger } from './fifo.js';

// Baut einen neuen App-Zustand ausschliesslich aus dem Broker-Export auf.
// Der Kapitalwert bleibt eine vom Nutzer gepflegte Zielgroesse und ist kein
// Brokerereignis; deshalb wird er unveraendert uebernommen.
export function buildFullRebuild(rows, capital) {
  const importRows = mergeImportRows([], rows || []);
  const replay = replayImportLedger(importRows, []);
  if (replay.errors.length > 0) {
    return { error: replay.errors[0] };
  }

  return {
    data: {
      trades: replay.trades,
      openLots: replay.openLots,
      capital: Number.isFinite(Number(capital)) ? Number(capital) : 0,
      importRows,
      // Ein leeres Array markiert bewusst: Es gibt keine Legacy-Lots mehr.
      importBaseOpenLots: []
    }
  };
}
