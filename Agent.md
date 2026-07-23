# Agent.md — Trade Kalender PWA

Hinterlegte Standards für dieses Repo. Gilt für jede Session, jeden Assistenten, jeden Menschen.

## Projekt

Persönlicher Trade-Kalender als PWA. Vanilla JS (ES-Module, kein Framework, keine Build-Pipeline), GitHub Pages. Datenquelle: Scalable-Capital-CSV (Semikolon, deutsches Zahlenformat). Persistenz: wahlweise IndexedDB auf einem Gerät oder `trade-kalender.json` in Google Drive (drive.file-Scope). Kernlogik: FIFO-Matching + deutsche Abgeltungsteuer (26,375%).

```
css/app.css     Gesamtes App-Layout inkl. mobiler Regeln
js/config.js    Konstanten + APP_VERSION
js/app-data.js  Kanonisches persistentes Datenmodell und Normalisierung (pure)
js/backup-crypto.js Versioniertes AES-GCM-Backupformat (pure, Web Crypto injizierbar)
js/performance-view.js  Gemeinsamer Renderer fuer Equity, Drawdown und Kapitaleinsatz
js/encrypted-backup-dialog.js Dialog fuer verschluesselte Datei-Backups
js/helpers.js   Formatierung, Datum (toLocalDateStr, normalizeXlsxDate)
js/fifo.js      FIFO-Matching, Steuer, buyDate/buyTime   [KERN — Golden Values!]
js/views.js     Aggregation, Statistik, Insights, Diagnosen (pure)
js/import.js    CSV-Parsing + Validierung (pure)
js/import-dialogs.js CSV-Auswahl, Importvorschau und Kontrollberichte
js/invis-view.js Prozentanzeige und Maskierung fuer den sitzungsweiten Nur-Ansehen-Modus (pure)
js/local-storage.js Lokale IndexedDB-Persistenz und Speichermodus
js/safety-backups.js Automatische Zustands-Snapshots (pure)
js/safety-backup-dialog.js Sicherungsverlauf und Wiederherstellungsdialog
js/navigation.js Haupttabs, Statistik-Untertabs und mobile Navigation
js/position-dialog.js Formular und Vorschau zum Schliessen einer Position
js/trade-dialogs.js Formulare und Vorschau fuer Hinzufuegen/Bearbeiten
js/trade-search.js Filterformular und rein lesende Suchergebnisse
js/storage.js   Google-Drive-API (zustandslos, Token als Parameter)
js/storage-migration.js Vergleich und sicherer Speicherwechsel (pure)
js/storage-migration-dialog.js Lokaler-Stand-vs.-Drive-Dialog
js/app.js       UI-Verdrahtung, Rendering, Auth-Flow
sw.js           Service Worker (CACHE-Name = Version)
sw-register.js  Unabhaengiger SW-Update-Starter vor dem Hauptmodul
test/           Test-Harness (siehe test/README.md)
docs/ARCHITECTURE.md Schichten, Datenfluss, APIs und Betriebsgrenzen
docs/DATA_MODEL.md Kanonischer persistenter Vertrag und Invarianten
docs/DESIGN-KONZEPT.md Unverbindliche visuelle Leitidee und UI-Entscheidungen
docs/anforderungen/ Programmiersprachenunabhaengige Produktanforderungen
docs/DOTNET-GUIDE.md Uebersetzung der Module in C#/.NET-Denkmodelle
docs/DOTNET-AGENT-LEARNING.md Moderner .NET-/VS-Code-Lernpfad mit Agents
CONTRIBUTING.md  Lokales Setup, Aenderungsworkflow und PR-Checkliste
SECURITY.md      Umgang mit Finanzdaten, OAuth, Backups und Vorfaellen
```

## Nicht verhandelbare Regeln

1. **Kein Deliverable ohne grünen Test.** Vor jeder Lieferung: `npm test` → muss mit „ALL GREEN — safe to deliver" enden.
2. **Jeder Bug wird permanenter Test.** Erst Test schreiben (rot), dann fixen (grün), dann Bug testweise wieder einbauen und den roten Lauf zeigen (Beweis).
3. **Logik pure, I/O getrennt.** Berechnung/Parsing/Validierung als pure functions in views/fifo/import/storage — Daten und Abhängigkeiten als Parameter, kein DOM, kein globaler Zustand. DOM-Code bleibt in den UI-Modulen; `app.js` verbindet sie mit State und I/O.
4. **Kleine Etappen.** Umbauten in einzeln getestete Schritte zerlegen; bei Richtungsentscheidungen Optionen anbieten (klein/sicher vs. groß/gründlich). Im Zweifel: klein.
5. **Root Cause.** Bugs erst mechanistisch erklären, dann fixen. Umgebungsabhängige Fixes (Zeitzone, Locale) in mehreren Umgebungen beweisen, sonst gilt: nicht gefixt.
6. **Version:** Jede Lieferung bumpt die statische HTML-Anzeige, die
   Hauptmodul-URL, `APP_VERSION` in js/config.js, `RELEASE` in sw-register.js
   **UND** `CACHE` in sw.js — Gleichheit ist testerzwungen.
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
- **Eingesetztes Kapital:** Nicht Kaufumsatz summieren. Je Kalendertag den
  höchsten gleichzeitig offenen Einstand verwenden und offene Positionen über
  Overnight- und ereignisfreie Tage fortschreiben. Ab dem ersten Importtag
  gelten `importRows` plus `importBaseOpenLots` als exakte FIFO-Quelle; den
  davorliegenden Zeitraum aus Legacy-Einstand und Haltedauer nur sichtbar
  gekennzeichnet schätzen. Der angezeigte Einstand darf in diesem Cash-Konto
  nie über der an diesem Tag verfügbaren realisierten Equity liegen.
- **Wochentage:** Einstieg und Ausstieg nie vermischen; der Einstiegstag ist
  Standard. Fehlende Datumswerte und neutrale Produkte ehrlich ausschliessen.
  Eine Long-/Short-Tendenz erst ab n>=8 je Richtung und Wochentag ausweisen und
  dafuer das durchschnittliche Netto-P&L pro Trade vergleichen.
- **Statistik-UI:** Neue Analysen einem der internen Bereiche `Kennzahlen`,
  `Performance`, `Timing` oder `Verhalten` zuordnen. Keine weitere lange
  Statistikseite und keine zusaetzlichen Haupttabs fuer einzelne Auswertungen
  einfuehren. `Kennzahlen` bleibt die kompakte Einstiegsansicht; tiefe Analysen
  gehoeren in die drei fachlichen Folgebereiche.
- **Trade-Filter:** Suche bleibt rein lesend und verwendet die pure
  `views.filterTrades`-Logik. Zeitraum bedeutet Ausstiegstag; unbekannte
  Haltedauer bei Legacy-Daten muss sichtbar filterbar bleiben und darf nicht
  stillschweigend als Intraday einsortiert werden.
- **Steuer:** immer MIT Vorzeichen rechnen (negativ = Erstattung). NIE `Math.abs(tax)` in P&L-Mathematik (nur in Anzeige-Strings erlaubt).
- **FIFO:** Sortierung Datum+Zeit mit Buy-vor-Sell-Tiebreak bei gleichem Timestamp.
- **UIDs:** kanonisches Format `ISIN_DATUM_SELL_SHARES` — Duplikat-Erkennung bei Re-Imports hängt daran.
- **Deploy ist atomar:** ALLE js/-Dateien + index.html + sw.js zusammen pushen. Eine veraltete Datei bricht die ganze ES-Modul-Kette (Symptome: „does not provide an export", `gisLoaded is not defined`).
- **HTML-Einbau:** Tabs sind `<div class="section" id="tab-*">`-Geschwister in EINEM Container. Neue Sektionen dort einhängen; Struktur-Checks (DOCTYPE, Geschwister, kein Streutext) sind in der Suite.
- **Script-CSP:** Inline-Event-Handler sind verboten. UI-Ereignisse werden in
  `app.js` per `addEventListener` verdrahtet; `script-src-attr 'none'` und die
  Security-Tests sperren Rueckfaelle.
- **Speichermodus:** IndexedDB und Drive verwenden immer `app-data.js` als
  gemeinsamen Datenvertrag. Ein lokaler Stand wird nie still mit Drive
  zusammengefuehrt; erst vergleichen, dann genau einen fuehrenden Stand
  waehlen und den ersetzten Stand als Safety-Snapshot sichern.
- **Lokale Daten:** `navigator.storage.persist()` reduziert nur das Risiko
  automatischer Browser-Bereinigung. Es ersetzt kein externes Backup und
  synchronisiert weder andere Browser noch andere Geraete. Gleichzeitige
  lokale Tabs besitzen noch keinen Versionsvergleich.
- **Verschluesselte Backups:** Passphrasen werden nie gespeichert. Dateien nur
  ueber `backup-crypto.js` entschluesseln, Format und App-Daten vor Mutation
  validieren und den aktuellen Stand vor Restore als Safety-Snapshot sichern.
- **PWA-App-Shell:** Vorab gecachte lokale ES-Module werden Cache-first geladen.
  Updates laufen ueber die gemeinsame neue App-/Cache-Version. Network-first
  fuer `index.html` oder `js/app.js` kann HTML und Module verschiedener
  Releases mischen beziehungsweise den Offline-Start verhindern und ist durch
  ausgefuehrte Service-Worker-Tests gesperrt. JavaScript-Antworten mit
  `text/plain` duerfen weder als brauchbarer Cache gelten noch erneut
  persistiert werden; der Online-Pfad repariert solche Alt-Eintraege. Der
  Starter darf dabei nur versionsgebundene `trade-kalender-*`-Caches loeschen,
  nie IndexedDB oder andere Nutzerdaten, und erst nachdem eine direkte HEAD-
  Anfrage korrektes JavaScript vom Server bestaetigt hat.
- **Live-Server-CSP:** VS Code Live Server injiziert ein Inline-Skript fuer
  Live-Reload. Dass die CSP dieses Skript blockiert, ist beabsichtigt und kein
  Grund fuer `unsafe-inline`, Nonces oder wechselnde Development-Hashes.
- **Skript-Einfügungen:** Rückgabewerte von find/match IMMER prüfen (`assert`) bevor sie weiterverwendet werden.

## Konventionen

- Kommentare auf Deutsch, erklären WARUM (nicht was); gefixte Bugs hinterlassen Warnschilder im Code.
- Neue Statistik/Analyse: Berechnung nach views.js (pure, mit Tests gegen Handwerte), Rendering nach app.js, Mindest-Stichprobe für Befunde (n≥8).
- Datenmodell-Erweiterungen abwärtskompatibel (neue Felder optional; fehlende Felder → ehrlicher Hinweis statt falscher Anzeige).
- Bestandsdaten-Korrekturen: Invarianten (Anzahl, P&L, Steuer) vorher definieren, nachher exakt ausweisen; Original sichern; Dedup-Probe fahren.

## Workflow

Lokal: VS Code + statischer Server
(`http://127.0.0.1:5500/index.html`). Einstieg und Setup stehen in
[README.md](README.md), der vollstaendige Aenderungsworkflow in
[CONTRIBUTING.md](CONTRIBUTING.md). Architekturentscheidungen und persistente
Felder werden gleichzeitig in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
beziehungsweise [docs/DATA_MODEL.md](docs/DATA_MODEL.md) aktualisiert.
Der fachliche Sollzustand steht getrennt davon in der
[Anforderungsanalyse](docs/anforderungen/README.md).
Fuer den Einstieg aus C#/.NET-Sicht gilt
[docs/DOTNET-GUIDE.md](docs/DOTNET-GUIDE.md).
Der praktische Modernisierungs- und Agenten-Lernpfad steht in
[docs/DOTNET-AGENT-LEARNING.md](docs/DOTNET-AGENT-LEARNING.md).
Sicherheitsgrenzen stehen in [SECURITY.md](SECURITY.md).

Test: `npm test` (Details siehe [test/README.md](test/README.md)). Deploy:
`git add . && git commit && git push` → GitHub Pages. Danach: Hard-Reload,
Versionsnummer im Header verifizieren.
