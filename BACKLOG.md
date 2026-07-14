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

- **Status:** Erledigt in v47.
- **Loesung:** Der Statistik-Tab zeigt die realisierte Equity-Kurve nach
  Handelstagen, aktuellen Stand, bisherigen Hoechststand, aktuellen und
  maximalen Drawdown sowie aktuelle und laengste Drawdown-Dauer.
- **Berechnung:** Mehrere Trades eines Tages werden zu einem Tagesendstand
  zusammengefasst. Offene Positionen bleiben unberuecksichtigt; Prozentwerte
  erscheinen nur mit gesetztem Startkapital. Betrag und Prozent des maximalen
  Drawdowns stammen garantiert aus derselben Phase.
- **Darstellung:** Ein responsives SVG ohne zusaetzliche Laufzeitbibliothek
  markiert den tiefsten Drawdown und bleibt auch auf kleinen Displays lesbar.

### Wochentagsstatistik Long/Short

- **Status:** Erledigt in v48.
- **Loesung:** Der Statistik-Tab vergleicht Long/Call und Short/Put von Montag
  bis Freitag nach Anzahl, Netto-P&L, Durchschnitt, Median, Winrate und Profit
  Factor. Standard ist der Einstiegstag als Tag der Handelsentscheidung; der
  Ausstiegstag ist direkt umschaltbar.
- **Belastbarkeit:** Eine Tendenz erscheint erst, wenn am jeweiligen Wochentag
  beide Richtungen mindestens acht Trades enthalten. Verglichen wird dann das
  durchschnittliche Netto-P&L pro Trade. Fehlende Datumswerte, neutrale
  Produkte und Wochenend-Trades werden sichtbar als ausgeschlossen gemeldet.

### Statistik-Tab in Themenbereiche gliedern

- **Status:** Erledigt in v49.
- **Loesung:** Eine interne Navigation trennt den Statistik-Tab in
  `Performance`, `Timing` und `Verhalten`. Es ist immer nur ein Themenbereich
  sichtbar; die Auswahl bleibt beim Wechsel zwischen den Haupttabs erhalten.
- **Entscheidung:** Interne Bereiche statt weiterer Haupttabs oder Akkordeons.
  So bleibt die Hauptnavigation kompakt, zusammengehoerige Analysen bleiben
  beieinander und die mobile Ansicht vermeidet eine einzige lange Seite.

### Trades suchen und filtern

- **Status:** Erledigt in v50.
- **Loesung:** Eine von Desktop- und Mobilaktionen erreichbare Suchansicht
  filtert geschlossene Trades kombinierbar nach Ausstiegszeitraum,
  Produktbeschreibung oder ISIN, Richtung, Ergebnis und Haltedauer. Treffer
  erscheinen neueste zuerst mit Anzahl, Netto-P&L und direktem Sprung zum
  vorhandenen Tagesdialog.
- **Datenintegritaet:** Die Filterung ist eine pure, rein lesende Operation und
  veraendert weder `DATA.trades` noch die Drive-Datei. Haltezeitklassen sind
  ueberschneidungsfrei; Legacy-Trades ohne vollstaendige Einstiegstimestamps
  bleiben als `Unbekannt / Alt-Daten` auffindbar.

### Import-Migration in der UI erklaeren

- **Status:** Erledigt in v51.
- **Loesung:** Erkennt der erste Ledger-Import bereits vorhandene Historie,
  wird er vor dem Speichern angehalten. Ein eigener Dialog zeigt Bestand,
  Historienbereich, Ueberschneidungen und die Aufteilung der CSV-Zeilen am
  ermittelten Stichtag. Eine Schrittfolge erklaert den sicheren CSV-Zuschnitt;
  ein unsicherer Bypass wird bewusst nicht angeboten.
- **Stichtag:** Fuer den letzten bereits erfassten Tag werden sowohl Kauf- und
  Verkaufsdaten der Legacy-Trades als auch die Kaufdaten vorhandener offener
  Lots beruecksichtigt. Dadurch kann auch eine offene Position nicht durch ihre
  alte Kaufzeile doppelt angelegt werden. Buchungen am selben Stichtag bleiben
  als manuell zu pruefender Sonderfall sichtbar.
- **Datenintegritaet:** Diagnose und Stichtagsberechnung sind pure Funktionen.
  Beim angehaltenen Import werden weder App-Daten noch Drive-Daten veraendert.

### CSV-Export gegen Tabellenformeln absichern

- **Status:** Erledigt in v52.
- **Loesung:** Jede exportierte Datenzelle laeuft durch eine pure zentrale
  Absicherung. Textwerte mit `=`, `+`, `-` oder `@` am Zellanfang werden durch
  ein vorangestelltes Apostroph als Text neutralisiert; fuehrender Leerraum,
  Tabs und Zeilenumbrueche koennen die Erkennung nicht umgehen.
- **CSV-Struktur:** Semikolons, Anfuehrungszeichen und Steuerzeichen werden
  korrekt gequotet und interne Anfuehrungszeichen verdoppelt. Dadurch bleiben
  auch ungewoehnliche Produkttexte innerhalb genau einer Zelle.
- **Zahlen:** Echte numerische Werte bleiben unveraendert, damit insbesondere
  negative P&L- und Steuerwerte in Tabellenprogrammen weiter berechenbar sind.

### Import-Kontrollbericht

- **Status:** Erledigt in v53.
- **Loesung:** Die Import-Vorschau enthaelt einen strukturierten Kontrollbericht
  fuer neue und doppelte Brokerzeilen, ignorierte Zeilen, neue und bereits
  bekannte geschlossene Trades sowie den Stand sichtbarer offener Positionen.
- **Finanzwirkung:** Netto-P&L und Steuer werden jeweils als vorheriger Stand,
  erwarteter Stand und Aenderung auf den Cent ausgewiesen. Der Bericht basiert
  auf dem vollstaendigen FIFO-Replay und nicht nur auf den neu angezeigten
  Trades.
- **Bestaetigung:** Vor dem Speichern ist der Bericht klar als Vorschau
  markiert. Nach erfolgreichem Drive-Update bleibt er geoeffnet und wechselt
  auf `Gespeichert`; ein Reimport ohne neue Brokerzeilen wird als unveraendert
  ausgewiesen.
- **Datenintegritaet:** Die Berechnung ist pure und mutiert keine Eingaben.
  Ablehnungszahlen stammen direkt aus der Parser-Diagnose; ausgeblendete offene
  Lots werden auch im Bericht nicht faelschlich als sichtbare Position gezaehlt.

### Wochen- und Monatsreview

- **Status:** Erledigt in v54.
- **Ziel:** Regelmaessige Zusammenfassung der staerksten und schwaechsten
  Muster, Verlustursachen und auffaelligen Handelsphasen.
- **Umsetzung:** Wochen- und Monats-Tab besitzen jeweils ein kompaktes Review
  mit Periodenauswahl. Es zeigt Netto-P&L, Steuer, Trefferquote, Durchschnitt
  je Trade, staerkstes und schwaechstes Muster sowie die groessten
  Verlusttreiber inklusive schlimmstem Trade, Einstiegsphase und Overnight.
- **Belastbarkeit:** Wochenmuster werden ab drei, Monatsmuster ab fuenf
  gleichartigen Trades bewertet. Einzelne Ausreisser bleiben separat sichtbar,
  gelten aber nicht voreilig als Muster.
- **Zeitraum:** Die Zuordnung folgt wie die vorhandenen Tabellen dem
  Ausstiegsdatum; Wochen sind ISO-Kalenderwochen von Montag bis Sonntag.

## Prioritaet 3

### PWA im echten Browser offline pruefen

- **Status:** Offen.
- **Heute:** Asset-Liste und Offline-Fallback sind automatisiert geprueft.
- **Ziel:** Installieren, offline navigieren, Service-Worker-Update und erneute
  Online-Synchronisierung in einem echten Browser testen.

### Testlauf als Standardkommando und CI etablieren

- **Status:** Erledigt in v55.
- **Ziel:** `npm test` als Einstiegspunkt sowie einen GitHub-Actions-Lauf bei
  jedem Push und Pull Request einrichten.
- **Umsetzung:** `package.json` definiert den lokalen Standardeinstieg. Der
  Workflow installiert den Lockfile-Stand reproduzierbar mit `npm ci` unter
  Node 24 und startet anschliessend dieselbe vollstaendige Testsuite.
- **Sicherheit:** Der Workflow besitzt nur lesenden Repository-Zugriff, setzt
  ein Zeitlimit und verwendet die offiziellen GitHub-Actions in Version 6.

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
