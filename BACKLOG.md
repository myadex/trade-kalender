# App-Backlog

Diese Liste ist die gemeinsame Arbeitsgrundlage fuer die weitere Entwicklung.
Ein Punkt wird erst nach Test, Dokumentation und Verifikation auf erledigt
gesetzt. `P1` betrifft Daten oder Sicherheit, `P2` den Produktfluss und `P3`
Wartbarkeit bzw. Komfort.

## Aktuell offen

- **P1 – Git-Historie von Finanzdaten bereinigen:** Die normalen Branches sind
  bereinigt; GitHub Support muss den noch direkt per alter SHA erreichbaren
  Server-Cache entfernen.
- **P3 – Projektstruktur schrittweise ordnen:** Nach externem CSS und dem
  Entwickler-Onboarding folgen die pure Aufteilung von `views.js` und danach
  die Kalender-/Statistik-Renderer aus `app.js`.
- **Warteliste – Dashboard konfigurierbar machen:** Kennzahlenkarten optional
  ausblenden oder anordnen; derzeit bewusst niedrige Prioritaet.

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

### Web-Haertung und Content Security Policy

- **Status:** Erledigt in v71.
- **Loesung:** Eine frueh im Dokument gesetzte Content Security Policy erlaubt
  App-Skripte nur noch aus der eigenen Herkunft und vom offiziellen Google-
  Identity-Endpunkt. `unsafe-inline` und `unsafe-eval` sind fuer Skripte
  gesperrt; Objekte, fremde Basis-URLs, Formularziele und nicht benoetigte
  Medienquellen sind ebenfalls blockiert.
- **UI-Verdrahtung:** Alle HTML-Eventhandler wurden entfernt und zentral in
  `app.js` per `addEventListener` angebunden. Dadurch kann
  `script-src-attr 'none'` aktiv bleiben, ohne Funktionen global auf `window`
  freizugeben.
- **Google-Kompatibilitaet:** Drive-, OAuth- und Google-Identity-Verbindungen
  sind explizit freigegeben. Die Referrer-Policy bleibt mit dem lokalen
  HTTP-Test und Google Identity Services kompatibel.
- **Sicherung:** Tests pruefen Position und Inhalt der CSP, verbotene Inline-
  Handler, die zentrale Ereignisverdrahtung und das Ausbleiben global
  exponierter UI-Funktionen.
- **Bekannte Grenzen:** Vorhandene Inline-Styles erfordern vorerst
  `style-src 'unsafe-inline'`. Die Meta-CSP kann keine Response-Header wie
  `frame-ancestors`, `Permissions-Policy`, `X-Content-Type-Options` oder eine
  Report-Only-CSP setzen; dafuer waere eine Hosting-Schicht mit konfigurierbaren
  HTTP-Headern erforderlich. Der angemeldete Google-Popup- und Drive-Ablauf
  bleibt nach dem Deploy einmal manuell im echten Browser zu pruefen.

### Lokaler Geraetemodus und sicherer Wechsel zu Google Drive

- **Status:** Erledigt in v72.
- **Ziel:** Die App kann ohne Google-Konto vollstaendig auf genau einem Geraet
  verwendet werden. Fachlogik und Datenformat bleiben identisch; nur die
  Persistenz wechselt zwischen lokalem Browser-Speicher und Google Drive.
- **Lokaler Speicher:** Der vollstaendige App-Zustand wird asynchron in
  IndexedDB gespeichert. Die App fordert, soweit vom Browser unterstuetzt,
  persistenten Speicher an. Das verringert automatische Bereinigung, ersetzt
  aber kein externes Backup: Browserdaten, App-Deinstallation oder ein
  Geraetedefekt koennen den lokalen Stand weiterhin entfernen.
- **Startauswahl:** Beim ersten Start stehen `Mit Google Drive starten` und
  `Nur auf diesem Geraet` gleichwertig zur Auswahl. Ein bereits gewaehlter
  lokaler Modus startet ohne Anmeldung und funktioniert offline.
- **Drive-Verbindung:** Im lokalen Modus fuehrt `Mit Google Drive verbinden`
  zuerst eine rein lesende Bestandsaufnahme beider Seiten durch. Sind lokal
  und in Drive Daten vorhanden, zeigt ein Dialog Zeitraum, Trade-Anzahl,
  Netto-P&L, offene Positionen und letzte bekannte Sicherung beider Staende.
- **Keine stille Zusammenfuehrung:** Der Nutzer waehlt ausdruecklich, ob der
  lokale oder der Drive-Stand weitergefuehrt wird. Ein automatischer Merge ist
  wegen Import-Ledger, manuellen Trades, offenen Lots und Ausschlussereignissen
  verboten, bis dafuer eine eigene fachliche Merge-Logik existiert.
- **Rueckweg und Konfliktschutz:** Vor dem Ersetzen wird der verworfene Stand
  als Safety-Snapshot in den Zielbestand aufgenommen. Drive-Schreibvorgaenge
  verwenden weiterhin das geladene starke ETag; bei einer parallelen Aenderung
  wird die Migration abgebrochen. Der bisherige lokale Stand bleibt zusaetzlich
  als Geraete-Rueckfall erhalten.
- **Sicherung:** Lokale Persistenz, gemeinsames Datenmodell, Vergleich und
  Dialog sind getrennte Module. Tests pruefen echte IndexedDB-Lese- und
  Schreibgrenzen, korrupte lokale Daten, beide Uebernahmerichtungen,
  ausgeblendete offene Positionen, den ETag-Schreibschutz und die mobile UI.
- **Bekannte Grenze:** Der lokale Modus ist fuer einen aktiven App-Stand auf
  einem Geraet gedacht. Mehrere gleichzeitig geoeffnete lokale Tabs besitzen
  noch keinen tabuebergreifenden Versionsvergleich; innerhalb eines Tabs
  bleiben Schreibauftraege geordnet. Fuer Desktop-Handy-Sync ist Drive oder
  der manuelle verschluesselte Datei-Transfer erforderlich.

### Verschluesselte externe Backups

- **Status:** Erledigt in v72.
- **Ziel:** Der komplette Datenstand kann auf Desktop und Handy als
  passwortgeschuetzte Datei exportiert und wiederhergestellt werden. Die Datei
  ist ein manuelles Backup beziehungsweise Transportmittel, kein automatisch
  synchronisierter Hauptspeicher.
- **Format:** Authentifizierte AES-GCM-Verschluesselung mit zufaelligem Salt und
  Nonce. Der Schluessel wird im Browser aus einer Passphrase abgeleitet; weder
  Passwort noch Klartextdaten werden in der Backup-Datei gespeichert.
- **Wiederherstellung:** Falsches Passwort, manipulierte Datei, unbekannte
  Formatversion und ungueltige App-Daten werden vor jeder Mutation abgelehnt.
  Vor erfolgreichem Restore wird der aktuelle Stand automatisch gesichert.
- **Grenze:** Ein vergessenes Passwort kann technisch nicht zurueckgesetzt
  werden. Die vorhandene unverschluesselte JSON-Wiederherstellung bleibt fuer
  alte Sicherungen verfuegbar, wird aber klar als unverschluesselt bezeichnet.
- **Umsetzung:** Das versionierte Dateiformat verwendet PBKDF2-HMAC-SHA-256 mit
  600.000 Iterationen, zufaelligem 16-Byte-Salt sowie AES-256-GCM mit
  zufaelliger 12-Byte-Nonce. Metadaten sind authentifiziert; Passwortfehler,
  Manipulationen, unbekannte Versionen und ungueltige App-Daten werden vor dem
  Speichern abgelehnt. Export und Restore stehen auf Desktop und Mobil bereit.

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

### Google-Anmeldung beim ersten Versuch stabilisieren

- **Status:** Erledigt in v80.
- **Root Cause:** Der Drive-Button war bereits vor der Initialisierung von
  Google Identity Services bedienbar. Zusaetzlich konnte die Aktivierung eines
  aktualisierten Service Workers die Seite waehrend des OAuth-Popups neu laden;
  das nur im Arbeitsspeicher vorhandene Token ging dabei verloren und die App
  verlangte unmittelbar eine zweite Anmeldung.
- **Loesung:** Der Button bleibt bis zum fertigen Token-Client deaktiviert und
  zeigt den Lade- beziehungsweise Anmeldestatus. Laufende Token-Anfragen sind
  gegen Doppelklick gesperrt; OAuth- und Popup-Fehler geben den Button wieder
  frei und werden sichtbar gemeldet.
- **Update-Verhalten:** Ein unberuehrter Start darf nach einem Worker-Wechsel
  weiterhin atomar neu laden. Nach der ersten Zeiger- oder Tastaturinteraktion
  wird ein automatischer Reload dagegen bis zum naechsten natuerlichen
  App-Start verschoben, damit kein begonnener Login unterbrochen wird.
- **Sicherung:** Drei Regressionen pruefen GIS-Bereitschaft, Token-Doppelklick
  samt Popup-Abbruch und den Worker-Wechsel waehrend eines aktiven Starts.

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

### Kompakter Ergebnis-Header

- **Status:** Erledigt in v78, mobile Hoehenkorrektur in v79 und einheitliches
  Kennzahlen-Alignment in v82.
- **Loesung:** Die globale Tagesstatistikleiste ist entfernt. Im Kopf jeder
  Ansicht bleiben ausschliesslich realisiertes Gesamt-P&L (netto), abgefuehrte
  Steuern und Rendite sichtbar; tiefergehende Kennzahlen gehoeren in den
  Statistik-Tab.
- **Bedienung:** Die Rendite bleibt ein echtes Bedienelement und oeffnet die
  Einstandsbearbeitung. Desktop ordnet die drei Werte neben dem App-Titel an,
  mobil stehen sie ohne horizontales Kartenkarussell in einer kompakten Zeile.
- **Sicherung:** Strukturtests erzwingen genau diese drei Headerwerte, das
  Fehlen der alten Tageskarten und den weiterhin erreichbaren Einstandseditor.
- **Mobile-Korrektur:** Im mobilen Spaltenlayout setzt v79 die Desktop-Flexbasis
  explizit zurueck. Dadurch entstehen unter den drei Kennzahlen keine hohen
  Leerflaechen oder bis zum Kalender reichenden Trennlinien mehr.

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

### Sachlicher Kennzahlenbereich

- **Status:** Erledigt in v81.
- **Entscheidung:** Der Statistikbereich bleibt bewusst dezent und zeigt nur
  fachliche Kennzahlen. Spielerische Fortschrittskarten, Grafiken, Kataloge,
  Zeitstrahlen sowie deren Berechnungs- und UI-Code sind vollstaendig entfernt.
- **Sicherung:** Ein permanenter Strukturtest verhindert, dass diese Elemente
  oder ihre ungenutzte Berechnungslogik versehentlich zurueckkehren.

### PWA im echten Browser offline pruefen

- **Status:** Erledigt in v77.
- **Verifiziert:** Manifest, Service-Worker-Registrierung, App-Shell-Cache und
  Navigations-Fallback sind im Browser vorhanden. Google-Anmeldung und
  Drive-Synchronisierung bleiben bewusst onlineabhaengig. Der lokale Modus
  benoetigt nach geladener App-Huelle dagegen weder Google noch Netzwerk.
- **Manueller Abschluss:** v77 wurde online mit korrektem JavaScript-MIME-Typ
  gestartet und anschliessend im lokalen Geraetemodus erfolgreich offline neu
  geladen. Damit ist der zuvor offene echte Browser-Nachtest abgeschlossen.
- **Nebenfund in v56 behoben:** Das asynchrone Google-Script konnte beim Reload
  vor dem ES-Modul fertig sein und `gisLoaded is not defined` ausloesen. Der
  HTML-Callback ist jetzt fruehstart-sicher; die vorhandene Modulpruefung holt
  die Auth-Initialisierung weiterhin nach.
- **Offline-Fund in v74 behoben:** Lokale ES-Module wurden trotz installiertem
  App-Shell-Cache zuerst aus dem Netz angefordert. Im Offline-Modus konnte der
  fehlgeschlagene Service-Worker-Pfad dadurch fuer `js/app.js` eine ungueltige
  Antwort liefern und den gesamten Modulstart verhindern. Vorab gecachte,
  versionsgebundene App-Dateien werden jetzt Cache-first und ohne Netzversuch
  ausgeliefert; Suchparameter werden beim Cacheabgleich ignoriert. Updates
  bleiben ueber den neuen Cache-Namen jeder App-Version atomar.
- **Sicherung:** Ein isolierter Service-Worker-Test simuliert vorhandenen Cache
  und ausgefallenes Netz. Er erzwingt, dass `js/app.js` aus dem Cache kommt und
  kein Fetch gestartet wird. Der alte Network-first-Code macht diesen Test
  reproduzierbar rot.
- **Startdiagnose in v75:** Login und App-Header enthalten die Versionsnummer
  bereits statisch im HTML. So bleibt der geladene App-Shell-Stand auch dann
  erkennbar, wenn das Hauptmodul nicht startet. Der Modul-Boot ueberschreibt
  denselben Wert weiterhin; Tests erzwingen die Gleichheit von HTML,
  `APP_VERSION` und Service-Worker-Cache.
- **MIME-Reparatur in v76:** Ein zuvor von einem ungeeigneten lokalen Server
  als `text/plain` gecachtes JavaScript-Modul wird nicht mehr blind
  ausgeliefert. Der Service Worker validiert JavaScript-Content-Types, laedt
  einen unbrauchbaren Cache-Eintrag online neu und ersetzt den kanonischen
  Cache-Key nur mit einer gueltigen JavaScript-Antwort. Offline bleibt ein
  bereits gueltiger Cache weiterhin vollstaendig ohne Netzversuch nutzbar.
- **Unabhaengiger Wiederanlauf in v76:** `sw-register.js` wird vor dem
  Hauptmodul geladen und enthaelt ausschliesslich Registrierung und Update des
  Service Workers. Weil ein alter Cache diese neue Datei nicht kennt, kann sie
  online vom Server kommen und den reparierenden Worker installieren, selbst
  wenn der alte `app.js`-Eintrag wegen seines MIME-Typs nicht startet.
- **Gezielte Alt-Cache-Reparatur in v77:** Der unabhaengige Starter prueft den
  echten Server per nicht vom Worker behandelter HEAD-Anfrage und vergleicht
  sie mit dem durch den aktiven Worker laufenden Modulabruf. Nur wenn der Server
  korrektes JavaScript und der Altpfad weiterhin `text/plain` liefert, werden
  ausschliesslich `trade-kalender-*`-Caches entfernt und die Seite einmal neu
  geladen. IndexedDB-, Local-Storage- und Drive-Daten bleiben erhalten. Der
  Service-Worker-Updatecheck umgeht dabei den HTTP-Cache explizit.
- **Entwicklungsserver-Grenze:** VS Code Live Server injiziert ein Inline-
  Live-Reload-Skript, das die produktionsnahe CSP absichtlich blockiert. Die
  Meldung ist kein App-Skriptfehler; `unsafe-inline` oder ein wechselnder Hash
  werden dafuer nicht in die CSP aufgenommen.
- **Abschluss:** Online-Start, Service-Worker-Updatepfad und Offline-Navigation
  sind automatisiert beziehungsweise manuell abgesichert.

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

- **Status:** Erledigt in v73.
- **Loesung:** `package.json` kennzeichnet die Browserdateien explizit als
  ES-Module. Der bestehende Node-Harness bleibt durch die Endung `.cjs`
  eindeutig CommonJS und kann seine bisherigen `require(...)`-Abhaengigkeiten
  unveraendert verwenden.
- **Sicherung:** Der Standardtest erzwingt Pakettyp, Harness-Endung und
  Testkommando gemeinsam. Ein Gegenlauf ohne `type: module` macht den Check rot
  und reproduziert die `MODULE_TYPELESS_PACKAGE_JSON`-Warnung; der finale
  Komplettlauf ist warnungsfrei.

### Projektstruktur schrittweise ordnen

- **Status:** In Arbeit; Etappe 1 in v83 und Entwickler-Onboarding in v84
  abgeschlossen.
- **Ziel:** Fachlogik, Infrastruktur, UI und gemeinsame Hilfen klarer ordnen,
  ohne Framework oder Build-Pipeline einzufuehren.
- **Etappe 1:** Das vollstaendige App-CSS liegt in `css/app.css` statt im
  mehr als tausend Zeilen langen `index.html`. Das Stylesheet bleibt Teil der
  versionierten Offline-App-Shell.
- **Dokumentation:** `README.md` bietet einen ausfuehrbaren Schnellstart und
  einen Dokumentationsindex. Architektur, persistentes Datenmodell,
  Beitragsworkflow und Security-Grenzen stehen in eigenen, verlinkten
  Dokumenten. Permanente Tests sichern Inhalte, lokale Links, Textkodierung
  und die kurze Uebersicht tatsaechlich offener Arbeit.
- **Sicherung:** Strukturtests erzwingen externen CSS-Link, fehlenden
  eingebetteten Styleblock und den Service-Worker-Cacheeintrag. Alle bisherigen
  CSS-Vertraege pruefen jetzt direkt die externe Datei.
- **Naechste Etappen:** Die pure Statistiklogik aus `views.js` fachlich
  aufteilen, danach Kalender- und Statistik-Renderer aus `app.js` loesen.
  Jede Etappe bleibt ein eigener, vollstaendig getesteter Schnitt.

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

- **Status:** Erledigt in v69 fuer Desktop-Web und mobile PWA.
- **Ziel:** Fokusfuehrung in Dialogen, Escape-Taste, eindeutige Labels,
  Tastaturnavigation und Kontraste systematisch verbessern.
- **Dialoge:** Alle elf Dialoge besitzen Rolle, Modalstatus und einen
  erreichbaren Titel. Eine gemeinsame Steuerung setzt den Startfokus, haelt
  Tab und Umschalt+Tab im obersten Dialog, schliesst per Escape, sperrt den
  Hintergrund-Scroll und gibt den Fokus an den Ausloeser zurueck.
- **Formulare und Navigation:** Sichtbare Labels sind technisch mit ihren
  Feldern verbunden. Haupt- und Statistik-Tabs unterstuetzen ARIA-Zustaende
  sowie Pfeil-, Pos1- und Ende-Tasten. Kalendertage und CSV-Auswahl sind echte
  Tastatur-Bedienelemente; reine Symbolbuttons besitzen zugängliche Namen.
- **Mobile PWA:** Touchziele sind mindestens 44 Pixel hoch, Eingaben verhindern
  den automatischen iOS-Zoom und Bottom-Bar, Aktionsmenue sowie Bottom-Sheets
  beruecksichtigen die Safe-Area. Das Aktionsmenue meldet seinen offenen Zustand
  und kann per Escape geschlossen werden. Es bleibt bei geringer Displayhoehe
  scrollbar und verwendet den kontrastreichen App-Hintergrund.
- **Lesbarkeit:** Der gedimmte Textkontrast wurde angehoben, Formularfelder
  verwenden den dunklen App-Hintergrund und alle interaktiven Elemente erhalten
  einen sichtbaren Tastaturfokus. Status- und Ergebniswechsel werden als
  Live-Regionen angekuendigt.

### Backup-Verlauf

- **Status:** Erledigt in v70.
- **Loesung:** Vor CSV-Import, JSON-Wiederherstellung, komplettem Reset und
  Wiederherstellung einer aelteren Sicherung wird automatisch der aktuelle
  Datenstand eingefroren. Desktop-Web und mobile PWA zeigen die maximal zehn
  neuesten Staende mit Zeitpunkt, Anlass, Trade-Anzahl und Netto-P&L; jeder
  Stand kann nach einer Sicherheitsabfrage wiederhergestellt werden.
- **Datenintegritaet:** Snapshots enthalten Trades, offene Lots, Kapital,
  Import-Ledger und ausgeblendete Positionen, aber niemals rekursiv weitere
  Snapshots. Datenwechsel und neue Sicherung werden gemeinsam im aktiven
  Speichermodus gespeichert; Drive nutzt dabei den bestehenden ETag-Schutz.
- **Bekannte Grenze:** Die Sicherungen liegen im selben Datenbestand. Sie
  schuetzen vor fehlerhaftem Import, Restore und Reset, aber nicht vor dem
  Verlust des lokalen Browser-Speichers, dem Loeschen der gesamten Drive-Datei
  oder dem Verlust des Google-Kontos. Dagegen hilft das externe verschluesselte
  Backup aus v72.

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
