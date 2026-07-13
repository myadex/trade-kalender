# Test-Harness — Trade Kalender PWA

Ein Skript, alle Checks. Vor JEDEM Push laufen lassen — nur bei
"ALL GREEN — safe to deliver" wird deployed.

## Setup (einmalig, im Projekt-Root)

```
npm install acorn jsdom
```

Das legt `node_modules/` im Projektordner an (in `.gitignore` aufnehmen).
`require('acorn')` in test_pwa.js findet sie automatisch über die
Node-Auflösung (test/ -> Projektroot).

## Ausführen (aus dem Projekt-Root)

```
node test/test_pwa.js
```

Erwartetes Ende: `ALL GREEN — safe to deliver`. Bei Rot: Fehlerliste
lesen, erst verstehen (Test falsch oder Code falsch?), dann fixen.

## Was geprüft wird (Kategorien)

1.  **Syntax/Parse** — jede js/-Datei + sw.js wird per acorn geparst
1b. **Modul-Verträge** — jeder `import { X } from './y.js'` hat ein
    passendes `export` (per AST; fängt Teil-Deploy-Fehler)
2.  **ID-Referenzen** — im Code benutzte Element-IDs existieren im HTML
3.  **Event-Handler** — Inline-Handler aus dem HTML sind auf `window`
    exponiert (ES-Modul-Pflicht)
4.  **CSS-Reihenfolge** — Desktop-Regeln vor Mobile-Media-Query
5.  **Bekannte-Bugs-Sperre** — je gefixter Bug ein Verbots-Check
    (kein toISOString fürs Datum, kein Math.abs(tax) in P&L, ...)
6.  **Golden Values** — die synthetische gold_rows.json durch die ECHTE
    fifoMatch: exakt 10 Trades / 1115.44 P&L / 460 Steuer / 3 offene Lots /
    1525 offener Einstand (golden.json)
6b. **Feature-Rechnungen** — Close/Totalverlust/Steuer gegen Handwerte
7.  **DOM/Struktur** — jsdom: Tabs vollständig, Sektionen sind
    Geschwister im selben Container, DOCTYPE intakt, kein Streutext
+   **Echte Module** — views/fifo/import/helpers werden dynamisch
    importiert und mit Randfällen gefüttert (CSV-Parsing, TimeStats,
    Insights, Diagnosen, Haltedauern, Monats-Disziplin)

## Dateien

- `test_pwa.js`   der Harness (Node, kein Framework)
- `gold_rows.json` synthetische Referenz-Rohdaten (19 Buy/Sell-Zeilen)
- `golden.json`    von Hand verifizierte synthetische Soll-Werte

## Regeln für neue Checks

1. Jedes neue Feature bekommt min. 3 Checks (Kernlogik gegen Handwerte,
   Randfall, Struktur/Statik).
2. Jeder gefixte Bug bekommt einen permanenten Sperr-Check.
3. Kritische neue Checks einmal BEWEISEN: Fehler absichtlich einbauen,
   roten Lauf zeigen, Fehler entfernen.
4. Golden Values werden NIE angepasst, um grün zu werden — weicht die
   Rechnung ab, sind Code und fachliche Handrechnung zu prüfen. Persönliche
   Broker-Exporte dürfen nie als Test-Fixture eingecheckt werden.
5. Versionsbump-Pflicht: APP_VERSION (js/config.js) == CACHE (sw.js),
   der Check erzwingt es.
