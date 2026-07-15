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

### Typische Trading-Kennzahlen

- **Status:** Erledigt in v61.
- **Ziel:** Einen kompakten Kennzahlenbereich fuer die Gesamtperformance und
  frei waehlbare Zeitraeume bereitstellen. Vorhandene Werte werden
  wiederverwendet und nicht mit abweichender Berechnung doppelt eingefuehrt.
- **Kennzahlen:** Trefferquote, Profit Factor, durchschnittlicher Gewinn und
  Verlust, Payoff-Ratio, Erwartungswert je Trade, bester und schlechtester
  Trade, Gewinn-/Verlustserien, maximaler Drawdown und Recovery Factor.
  Sharpe- und Sortino-Ratio kommen nur hinzu, wenn die verwendete periodische
  Renditereihe fachlich eindeutig definiert und in der UI erklaert ist.
- **Datenluecken:** R-Multiples und regelbasiertes Risiko pro Trade sind mit dem
  aktuellen Datenmodell nicht serioes berechenbar, weil Stop-Abstand und
  geplantes Risiko fehlen. Diese Werte duerfen erst mit entsprechenden
  Eingabedaten erscheinen.
- **Belastbarkeit:** Zeitraum, Anzahl Trades und Datenabdeckung stehen sichtbar
  neben den Kennzahlen. Leere oder zu kleine Stichproben liefern einen
  ehrlichen Hinweis statt einer scheinbar praezisen Bewertung.
- **Sicherung:** Pure Berechnung in `views.js` mit Handwerten fuer Gewinn,
  Verlust, Nullergebnis, leere Eingabe und mehrere Zeitraeume. Bestehende
  Golden Values und Drawdown-Ergebnisse muessen unveraendert bleiben.
- **Umsetzung:** `Kennzahlen` ist der erste interne Bereich des vorhandenen
  Statistik-Tabs. Ein frei waehlbarer Von-/Bis-Zeitraum filtert nach dem
  realisierten Ausstiegstag. Angezeigt werden Netto-P&L, Trade-Winrate, Profit
  Factor, Erwartungswert, durchschnittlicher Gewinn/Verlust, Payoff-Ratio,
  bester/schlechtester Trade, Gewinn-/Verlustserien, maximaler Drawdown und
  Recovery Factor. Anzahl, Nullergebnisse, ausgeschlossene Daten und kleine
  Stichproben bleiben sichtbar. Die bisherige Header-Quote heisst nun
  eindeutig `Win-Tage-Quote`, weil sie profitable Tage statt Trades zaehlt.
- **Bewusste Grenze:** Sharpe/Sortino bleiben aus, bis eine fachlich eindeutige
  periodische Renditereihe festgelegt ist. R-Multiples bleiben ohne geplantes
  Risiko bzw. Stop-Abstand nicht berechenbar.

## Prioritaet 3

### Pixel-Trading-Level und Waffenentwicklung

- **Status:** Erledigt in v62, erweitert in v63 und risikobasiert nachgeschaerft
  in v67; baut nur auf den eigenen Kennzahlen auf.
- **Ziel:** Eine kleine Pixelgrafik entwickelt sich mit der Trading-Performance
  und macht Fortschritt spielerisch sichtbar, ohne Finanzrisiko oder haeufiges
  Handeln zu belohnen.
- **Stufen:** `Schmiede im Pre-Opening` -> `Holzloeffel der Liquiditaet` ->
  `Break-even-Butterbrotmesser` -> `Kerzendolch` -> `Trendklinge` ->
  `Drawdown-Baendiger` -> `Runenschwert der Geduld` ->
  `Bullen-und-Baeren-Spalter` -> `Heilige Klinge der gruenen Kerze`.
- **Bewertung:** Rendite ist ein sichtbarer Bestandteil, reicht allein aber
  nicht fuer einen Aufstieg. Level und Fortschrittsbalken beruecksichtigen auch
  Profit Factor, Recovery Factor, Konstanz und Mindestanzahl an Trades. Der
  maximale Drawdown fliesst ueber den Recovery Factor ein, sperrt nach einer
  ausreichend starken Erholung aber kein Level dauerhaft.
- **Zeitraum:** Standard ist das laufende Kalenderjahr; optional kann auf
  Gesamtzeitraum umgeschaltet werden. Ein neues Jahr startet als neue Saison,
  waehrend das bisher hoechste Level als persoenlicher Rekord erhalten bleibt.
- **Pixelgrafik:** Pro Stufe wird ein kleines eigenes Pixel-Art-Motiv ohne
  externe Bild-API verwendet. Hoehere Stufen erhalten dezente Effekte wie
  Runen, farbige Aura oder Funken; Animationen muessen abschaltbar sein und
  `prefers-reduced-motion` respektieren.
- **Ton:** Keine abwertenden Meldungen bei Verlusten und keine Aufforderung,
  mehr Trades einzugehen. Der Zeitstrahl benennt Wechsel eindeutig als `Start`,
  `Aufstieg` oder `Abstieg`; die sachlichen Kennzahlen bleiben jederzeit
  wichtiger als das Gimmick.
- **Sicherung:** Levelberechnung als pure Funktion mit festen Grenzfaellen,
  unveraendertem Ergebnis bei gleicher Datenbasis und Tests gegen das
  Hochrisiko-Szenario `hohe Rendite plus unaufgeholter Drawdown`.
- **Umsetzung:** Die Levelkarte steht im Bereich `Kennzahlen` und startet mit
  dem laufenden Kalenderjahr. Optional kann auf den Gesamtzeitraum gewechselt
  werden. Vor 20 geschlossenen Trades oder ohne Startkapital bleibt die Karte
  ehrlich in `Schmiede im Pre-Opening`. Danach folgen acht eigenstaendige
  persoenliche Level mit zunehmend strengeren Ertrags- und Risikogrenzen.
- **Aufstiegsregeln:** Ab dem Break-even-Butterbrotmesser muessen Rendite,
  Profit Factor und Recovery Factor die jeweilige Stufe gemeinsam erfuellen.
  Der Recovery Factor teilt den Gesamtgewinn durch den maximalen Drawdown. Eine
  alte Verlustphase bleibt dadurch sichtbar und erschwert den Aufstieg, kann
  aber mit spaeteren stabilen Gewinnen aufgeholt werden. Der Erwartungswert
  bleibt als sachliche Kennzahl sichtbar, ist aber kein zusaetzliches
  Aufstiegstor, da ein positiver Wert bereits aus den anderen Bedingungen
  folgt. Die Grenzwerte sind persoenliche Spielregeln und ausdruecklich kein
  Vergleich oder Branchen-Benchmark.
- **Rekord:** Das historisch hoechste Level wird aus den Zwischenstaenden der
  vorhandenen Trades pure rekonstruiert. Es braucht kein zusaetzliches
  Speicherfeld und bleibt nach Importen oder Korrekturen konsistent.
- **Zeitstrahl:** Fuer jeden realisierten Tagesendstand wird das damalige Level
  pure berechnet. Die UI zeigt nur echte Wechsel, sowohl Aufstiege als auch
  Abstiege, chronologisch mit Datum und damaliger Pixelgrafik.
- **Darstellung:** Jede der neun Stufen besitzt ein eigenes 16x16-Pixelmotiv aus
  HTML/CSS. Das seltene Maximallevel verlangt mindestens 60 % Rendite, Profit
  Factor 2,5 und Recovery Factor 5 gemeinsam. Der Gesamtgewinn muss damit
  mindestens das Fuenffache des schlimmsten Drawdowns betragen. Das Level
  erhaelt Krone, Aura und Funken. Runen und Leuchteffekt kommen ohne externe
  Bildquelle aus; bei `prefers-reduced-motion` werden Animation und
  Fortschrittsuebergang deaktiviert.
- **Arsenal:** Der Button `Arsenal ansehen` oeffnet alle neun Stufen als
  nicht auswaehlbaren Katalog. Jede Karte zeigt Pixelmotiv, Beschreibung,
  Anforderungen und den Status `Aktuell`, `Erreicht` oder `Gesperrt`. Auf dem
  Desktop erscheint das Arsenal als Dialograster, mobil als Bottom-Sheet; es
  laesst sich per Schliessen-Button, Klick auf den Hintergrund oder Escape
  verlassen.

### PWA im echten Browser offline pruefen

- **Status:** Teilweise im echten Browser geprueft; vollstaendiger
  Offline-Reload bleibt offen.
- **Verifiziert:** Manifest, Service-Worker-Registrierung, App-Shell-Cache und
  Navigations-Fallback sind im Browser vorhanden. Google-Anmeldung und
  Drive-Synchronisierung bleiben bewusst onlineabhaengig.
- **Browsergrenze:** Der verwendete In-App-Browser bietet keinen echten
  Netzwerk-Offline-Schalter; ein Reload ohne Netz konnte deshalb noch nicht
  simuliert werden.
- **Nebenfund in v56 behoben:** Das asynchrone Google-Script konnte beim Reload
  vor dem ES-Modul fertig sein und `gisLoaded is not defined` ausloesen. Der
  HTML-Callback ist jetzt fruehstart-sicher; die vorhandene Modulpruefung holt
  die Auth-Initialisierung weiterhin nach.
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

- **Status:** Erledigt in v60.
- **Warum:** `js/app.js` enthaelt weiterhin State, Rendering und Event-Logik.
- **Ziel:** Tabs und Dialoge in kleine Render-Module auslagern; pure Logik bleibt
  in den bestehenden Fachmodulen.
- **Etappe 1:** Haupttabs, Statistik-Untertabs, Tastatursteuerung und mobile
  Navigation liegen jetzt in `js/navigation.js`. Das Modul kennt weder
  Finanzdaten noch Drive, Import oder Berechnungslogik.
- **Etappe 2:** Formulardaten, Feldzustaende und P&L-Vorschauen fuer die Dialoge
  zum Hinzufuegen und Bearbeiten liegen jetzt in `js/trade-dialogs.js`.
  Validierung, UID-Erzeugung, FIFO-Replay, Datenmutation und Persistenz bleiben
  im zentralen App-Controller.
- **Etappe 3:** Filterformular und Ergebnis-Rendering der rein lesenden
  Trade-Suche liegen jetzt in `js/trade-search.js`. Die aktuelle Trade-Liste
  und der Callback zum Oeffnen eines Tages werden explizit uebergeben; das
  Modul kennt weder globales `DATA` noch Persistenz.
- **Etappe 4:** Formular, Steuerautomatik und P&L-Vorschau zum Schliessen einer
  offenen Position liegen in `js/position-dialog.js`. Ledger-Buchung,
  Trade-Erzeugung und Persistenz bleiben im App-Controller.
- **Etappe 5:** CSV-Auswahl, Drag-and-drop, Fehleransicht, Importvorschau,
  Migrationshinweise und Kontrollbericht liegen in `js/import-dialogs.js`.
  Parsing, FIFO-Replay, Pending-State und Speichern bleiben in den bestehenden
  Fachmodulen und im App-Controller.
- **Sicherung:** Echte DOM-Tests pruefen Navigation, ARIA-Zustaende,
  Tastatursteuerung, beide Trade-Formulare einschliesslich der gesperrten
  Importfelder, Filter und Callback-Verhalten der Suche, Positionssteuer sowie
  den vollstaendigen Importdialog inklusive HTML-Sicherheit. Alle fuenf
  UI-Module sind Teil des Service-Worker-App-Shell-Caches.
- **Abschluss:** `app.js` bleibt bewusst der zentrale State- und I/O-Controller.
  Eine weitere Zerlegung der Kalender- und Statistik-Renderer waere ein eigener
  Refactoring-Punkt und braucht vorab eine neue Nutzen-/Risikoentscheidung.

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
