# CLAUDE.md — Trade Kalender PWA

Hinterlegte Standards für dieses Repo. Gilt für jede Session, jeden Assistenten, jeden Menschen.

## Projekt

Persönlicher Trade-Kalender als PWA. Vanilla JS (ES-Module, kein Framework, keine Build-Pipeline), GitHub Pages. Datenquelle: Scalable-Capital-CSV (Semikolon, deutsches Zahlenformat). Persistenz: `trade-kalender.json` in Google Drive (drive.file-Scope). Kernlogik: FIFO-Matching + deutsche Abgeltungsteuer (26,375%).

```
js/config.js    Konstanten + APP_VERSION
js/helpers.js   Formatierung, Datum (toLocalDateStr, normalizeXlsxDate)
js/fifo.js      FIFO-Matching, Steuer, buyDate/buyTime   [KERN — Golden Values!]
js/views.js     Aggregation, Statistik, Insights, Diagnosen (pure)
js/import.js    CSV-Parsing + Validierung (pure)
js/storage.js   Google-Drive-API (zustandslos, Token als Parameter)
js/app.js       UI-Verdrahtung, Rendering, Auth-Flow
sw.js           Service Worker (CACHE-Name = Version)
test/           Test-Harness (siehe test/README.md)
```

## Nicht verhandelbare Regeln

1. **Kein Deliverable ohne grünen Test.** Vor jeder Lieferung: `node test/test_pwa.js` → muss mit „ALL GREEN — safe to deliver" enden.
2. **Jeder Bug wird permanenter Test.** Erst Test schreiben (rot), dann fixen (grün), dann Bug testweise wieder einbauen und den roten Lauf zeigen (Beweis).
3. **Logik pure, I/O getrennt.** Berechnung/Parsing/Validierung als pure functions in views/fifo/import/storage — Daten und Abhängigkeiten als Parameter, kein DOM, kein globaler Zustand. UI-Code nur in app.js.
4. **Kleine Etappen.** Umbauten in einzeln getestete Schritte zerlegen; bei Richtungsentscheidungen Optionen anbieten (klein/sicher vs. groß/gründlich). Im Zweifel: klein.
5. **Root Cause.** Bugs erst mechanistisch erklären, dann fixen. Umgebungsabhängige Fixes (Zeitzone, Locale) in mehreren Umgebungen beweisen, sonst gilt: nicht gefixt.
6. **Version:** Jede Lieferung bumpt `APP_VERSION` in js/config.js **UND** `CACHE` in sw.js — Gleichheit ist testerzwungen.
7. **Ehrlicher Bericht:** geändert / verifiziert (Zahlen) / bekannte Grenzen.

## Golden Values (testerzwungen — niemals „anpassen", um grün zu werden)

Die öffentliche Referenz `test/gold_rows.json` enthält ausschließlich 19 klar
markierte synthetische Zeilen aus dem Jahr 2099. Erwartet werden exakt
**10 Trades, P&L 1.115,44 €, Steuer 460,00 €, 3 offene Lots und
1.525,00 € offener Einstand**. Weicht die FIFO-Logik davon ab, ist zuerst der
Code oder die fachliche Handrechnung zu prüfen — der Goldwert wird niemals nur
angepasst, um einen Test grün zu machen. Persönliche Broker-Exporte dürfen nicht
als Test-Fixture eingecheckt werden.

## Bekannte Fallen (alle testgesperrt — nicht wieder einführen)

- **Datum:** NIE `toISOString()` zur Datumsspeicherung (UTC-Verschiebung). XLSX-Dates = UTC-Mitternacht → `normalizeXlsxDate` (UTC-Komponenten). CSV-Datum bleibt String, kein Date-Objekt.
- **Kalenderwochen:** ISO 8601 bedeutet Montag bis Sonntag; am Jahreswechsel
  entscheidet der Donnerstag über das ISO-Wochenjahr. Die Berechnung bleibt in
  `views.isoWeekInfo`, nicht als zweite Datumslogik in der UI.
- **Equity/Drawdown:** Nur realisiertes Netto-P&L pro Tagesende verwenden;
  offene Positionen sind keine Equity-Daten. Prozentwerte nur mit positivem
  Startkapital anzeigen. Maximalbetrag und zugehörige Quote müssen vom selben
  Drawdown-Punkt stammen.
- **Steuer:** immer MIT Vorzeichen rechnen (negativ = Erstattung). NIE `Math.abs(tax)` in P&L-Mathematik (nur in Anzeige-Strings erlaubt).
- **FIFO:** Sortierung Datum+Zeit mit Buy-vor-Sell-Tiebreak bei gleichem Timestamp.
- **UIDs:** kanonisches Format `ISIN_DATUM_SELL_SHARES` — Duplikat-Erkennung bei Re-Imports hängt daran.
- **Deploy ist atomar:** ALLE js/-Dateien + index.html + sw.js zusammen pushen. Eine veraltete Datei bricht die ganze ES-Modul-Kette (Symptome: „does not provide an export", `gisLoaded is not defined`).
- **HTML-Einbau:** Tabs sind `<div class="section" id="tab-*">`-Geschwister in EINEM Container. Neue Sektionen dort einhängen; Struktur-Checks (DOCTYPE, Geschwister, kein Streutext) sind in der Suite.
- **Inline-Handler:** in HTML referenzierte Funktionen müssen auf `window` exponiert sein (ES-Module!) — testgeprüft.
- **Skript-Einfügungen:** Rückgabewerte von find/match IMMER prüfen (`assert`) bevor sie weiterverwendet werden.

## Konventionen

- Kommentare auf Deutsch, erklären WARUM (nicht was); gefixte Bugs hinterlassen Warnschilder im Code.
- Neue Statistik/Analyse: Berechnung nach views.js (pure, mit Tests gegen Handwerte), Rendering nach app.js, Mindest-Stichprobe für Befunde (n≥8).
- Datenmodell-Erweiterungen abwärtskompatibel (neue Felder optional; fehlende Felder → ehrlicher Hinweis statt falscher Anzeige).
- Bestandsdaten-Korrekturen: Invarianten (Anzahl, P&L, Steuer) vorher definieren, nachher exakt ausweisen; Original sichern; Dedup-Probe fahren.

## Workflow

Lokal: VS Code + Live Server (`http://127.0.0.1:5500/index.html`). Test: `node test/test_pwa.js` (Setup siehe test/README.md). Deploy: `git add . && git commit && git push` → GitHub Pages. Danach: Hard-Reload, Versionsnummer im Header verifizieren.
