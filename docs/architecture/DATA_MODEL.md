# Datenmodell

Dieses Dokument beschreibt die persistente Repräsentation der aktuellen
Referenzimplementierung. Die programmiersprachenunabhängigen Anforderungen an
Datenhaltung und Konsistenz stehen unter
[Datenhaltung](../anforderungen/03-DATENHALTUNG.md).

Dieses Dokument beschreibt den persistenten Vertrag der App. Verbindliche
Implementierung ist [`js/app-data.js`](../../js/app-data.js). IndexedDB, Google
Drive, interne Sicherungen und verschlüsselte Datei-Backups müssen denselben
Vertrag verwenden.

## Kanonisches Dokument

Ein leerer Zustand hat exakt diese Top-Level-Struktur:

```json
{
  "trades": [],
  "openLots": [],
  "capital": 0,
  "importRows": [],
  "importBaseOpenLots": null,
  "hiddenOpenPositions": [],
  "safetyBackups": []
}
```

`normalizeAppData` erzeugt aus alten oder teilweise gefüllten Dokumenten immer
diese Form. Arrays werden tief kopiert, ungültige Werte bekommen sichere
Fallbacks, und unbekannte Top-Level-Felder werden nicht weitergetragen. Ein
ladbares App-Dokument muss mindestens ein Objekt mit einem Array `trades` sein.

## Top-Level-Felder

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `trades` | Array | Persistierte geschlossene Trades. Enthält Legacy-/manuelle Trades und die aktuell aus dem Import-Ledger abgeleitete Sicht. |
| `openLots` | Array | Einzelne noch nicht vollständig verkaufte Kauf-Lots nach FIFO. Offene Positionen in der UI werden daraus je ISIN aggregiert. |
| `capital` | Number | Vom Nutzer gesetzter Einstand beziehungsweise Startkapital als Nenner der Rendite. Standard ist `0`. |
| `importRows` | Array | Unveränderte, normalisierte Broker-Buy-/Sell-Zeilen mit stabiler `sourceRowId`. Primärquelle für neue importierte Trades. |
| `importBaseOpenLots` | Array oder `null` | Einmaliger Snapshot der vor dem ersten Ledger-Import bestehenden offenen Lots. `null` bedeutet, dass das Ledger noch nicht initialisiert wurde. |
| `hiddenOpenPositions` | Array | Versionierte Ausschlussereignisse für konkrete offene Lot-IDs. Es werden keine Brokerzeilen gelöscht. |
| `safetyBackups` | Array | Bis zu zehn interne, neueste zuerst sortierte Sicherungen des fachlichen Zustands. |

## Geschlossener Trade

Ein von FIFO erzeugter Trade besitzt typischerweise diese Felder:

| Feld | Typ | Regel |
| --- | --- | --- |
| `uid` | String | Stabile fachliche ID aus ISIN, Ausstiegsdatum, Verkaufserlös und Stückzahl. |
| `date` | String | Ausstiegstag im Format `YYYY-MM-DD`. |
| `time` | String | Ausstiegszeit aus der Brokerzeile, falls vorhanden. |
| `buyDate` | String | Datum des ältesten beteiligten FIFO-Lots. Bei Legacy-Daten optional. |
| `buyTime` | String | Zeit des ältesten beteiligten FIFO-Lots. Bei Legacy-Daten optional. |
| `isin` | String | Instrumentenkennung. |
| `desc` | String | Produktbeschreibung; nicht vertrauenswürdiger Importtext. |
| `broker` | String | Bei Brokerimport derzeit `scalable`. |
| `shares` | Number | Geschlossene Stückzahl. |
| `buy` | Number | FIFO-Einstand der geschlossenen Stücke. |
| `sell` | Number | Positiver Verkaufserlös. |
| `tax` | Number | Steuer mit Vorzeichen: positiv abgeführt, negativ Erstattung. |
| `pnl` | Number | Netto-P&L: `sell - buy - tax`, auf Cent gerundet. |
| `sourceRowId` | String oder `null` | Verknüpfung zur Broker-Verkaufszeile. |
| `source` | String, optional | `import` kennzeichnet eine aus dem Ledger abgeleitete Sicht. |

Manuell erfasste und ältere Trades dürfen optionale Import- oder
Einstiegsfelder nicht besitzen. Auswertungen müssen fehlende Daten ehrlich
ausweisen und dürfen sie nicht erfinden.

## Offenes Lot

Ein offenes Lot repräsentiert den unverbrauchten Anteil genau eines Kaufs:

```json
{
  "isin": "SYNTHETIC0001",
  "desc": "Synthetisches Long-Produkt",
  "shares": 2.5,
  "amount": 1250,
  "date": "2099-01-10",
  "time": "09:15:00",
  "openLotId": "stabile-lot-id"
}
```

`amount` ist der noch offene positive Einstand. `openLotId` stammt bevorzugt
aus der Broker-`sourceRowId`; für Legacy-Lots wird sie deterministisch aus den
Lotfeldern abgeleitet. Bei Teilverkäufen bleibt die ID stabil. Die UI fasst
sichtbare Lots gleicher ISIN zu einer Position zusammen, persistiert diese
Aggregation aber nicht.

## Import-Ledger

Eine `importRows`-Zeile enthält die Brokerfelder `type`, `status`, `date`,
`time`, `isin`, `shares`, `amount`, `tax` und `description` sowie
`sourceRowId`. Akzeptiert werden nur `Buy` oder `Sell` mit Status `Executed`.
Deutsche Zahlen werden beim Parsen in Number umgewandelt; das Datum bleibt ein
kalenderbezogener String.

`sourceRowId` wird deterministisch aus allen relevanten Rohfeldern gebildet.
Dadurch ist ein erneuter Import desselben historischen Exports idempotent.
`replayImportLedger(importRows, importBaseOpenLots)` erzeugt:

- geschlossene Trades mit `source: "import"`,
- die verbleibenden `openLots`,
- sichtbare Fehler bei FIFO-Überverkäufen.

Importierte Trades werden nicht unabhängig von der Rohzeile editiert. Der
Editor ersetzt die verknüpfte Sell-Zeile, berechnet deren `sourceRowId` neu und
spielt anschließend das gesamte Ledger erneut ab.

## Ausgeblendete offene Positionen

Ein Eintrag in `hiddenOpenPositions` hat Schema-Version 1:

```json
{
  "version": 1,
  "id": "hide-123",
  "hiddenAt": 4070908800000,
  "isin": "SYNTHETIC0001",
  "desc": "Synthetisches Produkt",
  "lotIds": ["stabile-lot-id"],
  "shares": 2.5,
  "cost": 1250
}
```

Nur `lotIds` steuern die Sichtbarkeit. ISIN, Beschreibung, Stückzahl und
Einstand dienen der nachvollziehbaren Anzeige. Spätere Käufe derselben ISIN
erhalten andere Lot-IDs und bleiben sichtbar. Unbekannte zukünftige
Ereignisversionen werden ignoriert, damit ein alter Client keine ihm
unbekannten Regeln ausführt.

## Interne Sicherungen

Ein Eintrag in `safetyBackups` enthält:

- `schemaVersion: 1`,
- eine eindeutige `id`,
- `createdAt` als Millisekunden-Zeitstempel,
- einen kontrollierten `reason`,
- `data` als Snapshot aller fachlichen Felder außer `safetyBackups`.

Sicherungen enthalten sich nie rekursiv. Zulässige Gründe sind CSV-Import,
JSON-Restore, Reset, Backup-Restore, ersetzter Drive-/Lokaldatenstand und
verschlüsselter Restore. Normalisierung behält maximal zehn gültige,
eindeutige Sicherungen.

## Datum, Geld und Steuer

- Persistente Kalendertage verwenden `YYYY-MM-DD`.
- CSV-Daten bleiben Strings; XLSX-Datumswerte werden über UTC-Komponenten
  normalisiert. `toISOString()` ist für Datumsschlüssel verboten.
- Geldwerte sind Numbers und werden an fachlichen Ergebnisgrenzen auf Cent
  gerundet.
- Die Steuer behält ihr Vorzeichen. Eine Erstattung ist negativ.
- Der automatische Steuersatz ist 26,375 Prozent ohne Kirchensteuer.
- Equity und Drawdown verwenden nur realisiertes Netto-P&L, keine offenen Lots.
- Der Kapitalnutzungsverlauf ist eine nicht persistierte Ableitung aus
  `trades`, `importRows` und `importBaseOpenLots`. Vor dem ersten Ledger-Tag
  werden Legacy-Einstand und Haltedauer als gekennzeichnete Schätzung verwendet;
  danach bilden Brokerzeilen und Anfangsbestand die exakte FIFO-Quelle.
- Jeder abgeleitete Kapitalpunkt enthält zusätzlich die an diesem Tag
  verfügbare realisierte Equity. Der sichtbare Einstand wird für das Konto ohne
  Margin darauf begrenzt; Rohwert und Begrenzungskennzeichen bleiben nur im
  flüchtigen Berechnungsergebnis und werden nicht gespeichert.

## Persistenzvarianten

Im lokalen Modus speichert IndexedDB unter `data` das normalisierte Dokument
und unter `storage-mode` separat `local` oder `drive`. In Google Drive heißt die
Datei `trade-kalender.json`; die App sieht sie über den Scope `drive.file`.
Beide Pfade rufen vor dem Schreiben `normalizeAppData` auf.

Das verschlüsselte Backup umschließt das komplette App-Dokument in einem
versionierten Kryptografie-Envelope. Nach dem Entschlüsseln wird das Dokument
vor jeder Mutation erneut als App-Daten validiert.

## Schema erweitern

Ein neues persistentes Feld braucht in derselben Etappe:

1. einen sicheren Default in `emptyAppData`,
2. Normalisierung und defensive Kopie in `normalizeAppData`,
3. eine Entscheidung, ob es in Safety-Snapshots enthalten sein muss,
4. Tests für alte Dokumente ohne das Feld sowie ungültige Werte,
5. Prüfungen für IndexedDB, Drive und verschlüsselte Backups,
6. eine Aktualisierung dieses Dokuments.

Eine Migration darf vorhandene Finanzdaten niemals still neu interpretieren.
Vor einer Bestandskorrektur werden Trade-Anzahl, P&L, Steuer und offene Lots
als Invarianten festgelegt und nachher exakt verglichen.
