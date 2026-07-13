# App-Backlog

Diese Liste ist die gemeinsame Arbeitsgrundlage fuer die weitere Entwicklung.
Ein Punkt wird erst nach Test, Dokumentation und Verifikation auf erledigt
gesetzt. `P1` betrifft Daten oder Sicherheit, `P2` den Produktfluss und `P3`
Wartbarkeit bzw. Komfort.

## Prioritaet 1

### Git-Historie von Finanzdaten bereinigen

- **Status:** Git-Historie in v45 bereinigt; serverseitige GitHub-Bereinigung
  noch offen.
- **Loesung:** Die Git-Historie wurde neu geschrieben. Der historische
  `trade-kalender.json`-Snapshot, die echte Broker-Test-Fixture und die daraus
  abgeleiteten Kennzahlen sind aus allen normalen Branch-Referenzen entfernt.
- **Sicherung:** Die eingecheckte Golden-Fixture ist vollstaendig synthetisch.
  Tests erzwingen kuenftig synthetische IDs, Beschreibungen und Zukunftsdaten;
  `trade-kalender.json` bleibt ignoriert und ausserhalb des Git-Index.
- **Hinweis:** Alte Klone duerfen nicht mehr auf `main` pushen, weil sie die
  verworfene Historie erneut veroeffentlichen koennten.
- **Restschritt:** GitHub liefert den alten, nicht mehr referenzierten Commit
  weiterhin direkt per SHA. GitHub Support muss die gecachten Ansichten und
  verwaisten Objekte serverseitig entfernen.

### Drive-Konflikte zwischen Tabs und Geraeten erkennen

- **Status:** Erledigt in v42.
- **Loesung:** Die App laedt eine starke Drive-Versionskennung vor dem
  Dateninhalt und aktualisiert die Datei atomar mit `If-Match`. HTTP 412 wird
  als Konflikt behandelt: Der Schreibvorgang bleibt verworfen, der neueste
  Drive-Stand wird geladen und der Nutzer wird zum Wiederholen seiner Aktion
  aufgefordert.
- **Entscheidung:** Der ETag-Vertrag der offiziellen Drive API v2 wird gezielt
  fuer Versionsabruf und Update verwendet, weil v3 nur eine monotone `version`,
  aber keinen dokumentierten atomaren Compare-and-Set-Vertrag anbietet.

### Legacy-Daten vollstaendig neu aufbauen

- **Status:** Verworfen in v43.
- **Entscheidung:** Der Broker-Export ist keine vollstaendige Quelle fuer
  manuelle Korrekturen. Ein Neuaufbau wuerde deshalb fachlich gueltige Legacy-
  Daten ersetzen, insbesondere die manuellen Anpassungen aus Januar und Februar.
- **Sicherung:** Der ausfuehrbare Komplett-Neuaufbau wurde aus UI, App-Modul und
  Offline-Cache entfernt. Inkrementelle CSV-Imports bleiben unveraendert aktiv.

## Prioritaet 2

### Importierte Trades im Ledger bearbeiten

- **Status:** Erledigt in v43.
- **Loesung:** Der Editor aendert bei importierten Trades die zugehoerige Sell-
  Rohzeile, erzeugt deren Quell-ID neu und spielt anschliessend das gesamte
  Import-Ledger erneut ab. Einstand, offene Lots und P&L bleiben dadurch reine
  FIFO-Ableitungen.
- **Sicherung:** Kaufbetrag und Broker sind fuer Import-Trades schreibgeschuetzt.
  Ungueltige Rohdaten, ID-Kollisionen und FIFO-Ueberverkaeufe werden vor dem
  Speichern abgelehnt.

### Position ohne P&L dauerhaft aus dem Tracking ausblenden

- **Status:** Erledigt in v44.
- **Loesung:** "Position entfernen" speichert ein versioniertes Ereignis fuer
  die stabilen IDs der aktuell offenen Lots. Brokerzeilen, P&L und Steuer werden
  nicht veraendert; der Ausschluss bleibt auch nach einem Ledger-Replay aktiv.
- **Verhalten:** Neue Kaeufe derselben ISIN besitzen andere Lot-IDs und bleiben
  sichtbar. Unter "Entfernte Positionen" kann jeder aktive Ausschluss dauerhaft
  rueckgaengig gemacht werden; geschlossene Lots erzeugen keinen veralteten Eintrag.

### Wochen-Tab nach ISO-Kalenderwochen

- **Status:** Erledigt in v46.
- **Loesung:** Wochen laufen nach ISO 8601 von Montag bis Sonntag und tragen
  Kalenderwochennummer, ISO-Wochenjahr sowie den vollstaendigen Zeitraum, zum
  Beispiel `KW 01 · 29.12.2025–04.01.2026`.
- **Sicherung:** Der Jahreswechsel, die gemeinsame Aggregation von Montag und
  Sonntag sowie die Sortierung mit der neuesten KW zuerst sind permanent
  getestet. Die UI erhaelt ihr fertiges Label aus der puren Fachlogik.

### Equity-Kurve und Drawdown

- **Status:** Offen; naechstes groesseres Statistik-Feature.
- **Ziel:** Kapitalentwicklung, bisheriger Hoechststand, aktueller und maximaler
  Drawdown sowie die Erholungsdauer nachvollziehbar darstellen.

### Wochentagsstatistik Long/Short

- **Status:** Offen; hohe Prioritaet nach Equity-Kurve und Drawdown.
- **Ziel:** Long/Call und Short/Put pro Wochentag nach Anzahl, Netto-P&L,
  Durchschnitt, Median, Winrate und Profit Factor vergleichen. Aussagen gelten
  erst ab einer ausreichenden Stichprobe; Einstiegstag ist der Standard,
  Ausstiegstag bleibt umschaltbar.

### Trades suchen und filtern

- **Status:** Offen; hohe Prioritaet nach den Statistik-Features.
- **Ziel:** Zeitraum, Richtung, Produkt, Ergebnis und Haltedauer kombinierbar
  filtern, ohne die gespeicherten Trades zu veraendern.

### Import-Migration in der UI erklaeren

- **Status:** Offen.
- **Warum:** Der erste Ledger-Import akzeptiert bewusst nur neue Brokerzeilen.
- **Ziel:** Dialog mit erklaertem Stichtag, erkannter Historie und klarer
  Handlungsanweisung statt einer reinen Fehlermeldung.

### CSV-Export gegen Tabellenformeln absichern

- **Status:** Offen.
- **Warum:** Produkttexte koennen beim Oeffnen einer CSV in Tabellenprogrammen
  als Formel interpretiert werden.
- **Ziel:** Gefaehrliche Zellpraefixe im Export neutralisieren und mit einem
  Regressionstest absichern.

### Import-Kontrollbericht

- **Status:** Offen; kleinere Prioritaet.
- **Ziel:** Nach jedem Import neue Zeilen, Duplikate, geschlossene Trades,
  offene Positionen, Ablehnungen sowie die Aenderung von P&L und Steuer
  verstaendlich zusammenfassen.

### Wochen- und Monatsreview

- **Status:** Offen; kleinere Prioritaet.
- **Ziel:** Regelmaessige Zusammenfassung der staerksten und schwaechsten
  Muster, Verlustursachen und auffaelligen Handelsphasen.

## Prioritaet 3

### PWA im echten Browser offline pruefen

- **Status:** Offen.
- **Heute:** Asset-Liste und Offline-Fallback sind automatisiert geprueft.
- **Ziel:** Installieren, offline navigieren, Service-Worker-Update und erneute
  Online-Synchronisierung in einem echten Browser testen.

### Testlauf als Standardkommando und CI etablieren

- **Status:** Offen.
- **Ziel:** `npm test` als Einstiegspunkt sowie einen GitHub-Actions-Lauf bei
  jedem Push und Pull Request einrichten.

### Node-ESM-Warnung im Testlauf beseitigen

- **Status:** Offen.
- **Warum:** Die dynamisch importierten Browser-Module verursachen aktuell eine
  harmlose Node-Warnung zur automatischen ESM-Erkennung.
- **Ziel:** Test-Harness und Paketmetadaten ohne Warnung kompatibel machen, ohne
  den CommonJS-Harness zu brechen.

### UI-Controller weiter aufteilen

- **Status:** Offen.
- **Warum:** `js/app.js` enthaelt weiterhin State, Rendering und Event-Logik.
- **Ziel:** Tabs und Dialoge in kleine Render-Module auslagern; pure Logik bleibt
  in den bestehenden Fachmodulen.

### Bedienbarkeit und Barrierefreiheit pruefen

- **Status:** Offen.
- **Ziel:** Fokusfuehrung in Dialogen, Escape-Taste, eindeutige Labels,
  Tastaturnavigation und Kontraste systematisch verbessern.

### Trading-Journal und Regel-Tracking

- **Status:** Warteliste.
- **Ziel:** Setups, Gruende, Fehler und eigene Handelsregeln pro Trade erfassen,
  wenn die automatisch ableitbaren Statistiken ausgebaut sind.

### Backup-Verlauf

- **Status:** Warteliste mit niedriger Prioritaet.
- **Ziel:** Wiederherstellbare Staende vor groesseren Importen verwalten.

### Dashboard konfigurierbar machen

- **Status:** Warteliste mit niedriger Prioritaet.
- **Ziel:** Kennzahlenkarten ausblenden und individuell anordnen.

## Erledigte Grundlagen

- Service Worker liegt im Root, Version und Cache sind testgleich.
- Test-Harness prueft Syntax, Modulvertraege, Struktur, Golden Values und
  Regressionen.
- HTML aus Import- und JSON-Daten wird vor DOM-Ausgabe escaped.
- FIFO-Ueberverkaeufe werden vor dem Speichern abgelehnt.
- Neue Importe werden als Roh-Ledger gespeichert und sind reproduzierbar.
- Drive-Fehler, korrupte JSON und parallele Schreibvorgaenge innerhalb eines
  Tabs sind abgesichert.
- Gleichzeitige Drive-Aenderungen aus mehreren Tabs oder Geraeten werden vor
  dem Ueberschreiben atomar erkannt.
