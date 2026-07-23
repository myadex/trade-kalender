# Architektur

Dieses Dokument beschreibt die **aktuelle technische Referenzimplementierung**.
Der programmiersprachenunabhängige fachliche Sollzustand steht in der
[Anforderungsanalyse](anforderungen/README.md). Architekturentscheidungen
dürfen die dort festgelegten Akzeptanzkriterien erfüllen, ohne den
Produktvertrag an eine konkrete Umsetzung zu binden.

Dieses Dokument beschreibt den technischen Aufbau des Trade Kalenders. Es ist
der Einstieg für Änderungen an Struktur, Datenfluss oder Infrastruktur. Die
verbindlichen Arbeitsregeln stehen ergänzend in [Agent.md](../Agent.md), der
fachliche Datenvertrag in [DATA_MODEL.md](DATA_MODEL.md). Eine Übersetzung der
Module und Muster in C#/.NET-Begriffe bietet der
[.NET-Leitfaden](DOTNET-GUIDE.md).

## Kontext und Leitplanken

Der Trade Kalender ist eine installierbare Progressive Web App für Desktop und
Smartphone. Sie verwendet Vanilla JavaScript als native ES-Module, HTML und
CSS. Es gibt kein UI-Framework, keinen Bundler und keinen Build-Schritt. Ein
statischer Webserver beziehungsweise GitHub Pages liefert die Dateien direkt
aus.

Die Architektur folgt vier Leitlinien:

- Finanzberechnungen, Parsing und Validierung bleiben pure Funktionen.
- DOM, Browser-APIs und Netzwerkzugriffe liegen außerhalb der Fachlogik.
- IndexedDB und Google Drive verwenden denselben kanonischen Datenvertrag.
- Jede ausgelieferte Version bildet eine atomare, offline-fähige App-Shell.

## Schichten

### Darstellung

`index.html` enthält die semantische App-Struktur. `css/app.css` enthält das
gesamte Layout einschließlich der mobilen Regeln. Kleine UI-Module wie
`navigation.js`, `trade-dialogs.js`, `position-dialog.js`,
`import-dialogs.js`, `metrics-view.js`, `performance-view.js` und
`trade-search.js` lesen oder schreiben ausschließlich DOM-Zustand. Sie erhalten
Fachdaten und Callbacks als Parameter und persistieren selbst nichts. Der
Performance-Renderer erhält insbesondere nur die fertigen Equity- und
Kapitalnutzungsergebnisse und kennt weder den App-Zustand noch die
FIFO-Berechnung.

`invis-view.js` ist eine DOM-freie Anzeigegrenze. Das Modul erhaelt Betrag,
Startkapital und den expliziten Sitzungsmodus als Parameter und liefert nur
formatierte Prozent- beziehungsweise Maskierungstexte. Es kennt weder `DATA`
noch Browser-Speicher. Dadurch bleibt die Datenschutzdarstellung isoliert
testbar und kann nicht versehentlich zu einem zweiten persistenten Datenmodell
werden.

### Anwendungssteuerung

[`js/app.js`](../js/app.js) ist der zentrale Controller. Das Modul hält den
aktuellen App-Zustand, den gewählten Speichermodus, den nur im Arbeitsspeicher
liegenden Google-Token sowie die Drive-Datei-ID und deren ETag. Es verbindet
UI-Ereignisse mit Fachfunktionen, führt Mutationen kontrolliert aus, stößt die
Persistenz an und rendert danach alle betroffenen Ansichten neu.

`app.js` ist mit rund 2.100 Zeilen weiterhin der größte Kopplungspunkt. Die
weitere Auslagerung von Kalender- und Statistik-Renderern ist deshalb als
eigene, testgesicherte Refactoring-Etappe vorgesehen. `views.js` ist mit rund
1.080 Zeilen der zweite geplante Schnitt.

### Fachlogik

Diese Module kennen weder DOM noch Netzwerk:

| Modul | Verantwortung |
| --- | --- |
| `app-data.js` | Kanonischen persistenten Zustand erzeugen, erkennen und normalisieren |
| `fifo.js` | FIFO-Matching, Steuer, P&L und sichtbare offene Lots |
| `import.js` | Scalable-CSV parsen, validieren, deduplizieren und Ledgerzeilen bearbeiten |
| `views.js` | Kalender-, Perioden- und Statistikberechnungen |
| `safety-backups.js` | Interne, versionierte Zustands-Snapshots |
| `storage-migration.js` | Lokalen und Drive-Stand vergleichen und einen Zielstand bilden |
| `helpers.js` | Datum, Ausgabeformatierung, HTML- und CSV-Sicherheit |
| `invis-view.js` | Geldwerte relativ zum Startkapital formatieren und ISIN/Stueckzahl maskieren |
| `backup-crypto.js` | Versioniertes verschlüsseltes Backupformat über Web Crypto |

Alle fachlichen Funktionen erhalten Daten und Abhängigkeiten als Parameter.
Neue Berechnungen gehören in diese Schicht und werden gegen nachvollziehbare
Handwerte getestet.

### Infrastruktur

[`js/local-storage.js`](../js/local-storage.js) kapselt IndexedDB. App-Daten und
der ausgewählte Speichermodus liegen als getrennte Schlüssel in der Datenbank
`trade-kalender-local`.

[`js/storage.js`](../js/storage.js) kapselt Google Drive zustandslos. Das Modul
bekommt den Access-Token als Parameter. Suche, Erstellung und Download
verwenden Drive API v3. Der starke ETag und das atomare Update mit `If-Match`
verwenden den dafür benötigten v2-Dateivertrag. HTTP 412 wird als fachlich
behandelbarer Konflikt zurückgegeben.

[`sw.js`](../sw.js) und [`sw-register.js`](../sw-register.js) bilden die
PWA-Infrastruktur. Der Service Worker cached die lokale App-Shell. Google
Identity Services und Google Drive werden nie gecacht. Der unabhängige Starter
kann einen alten JavaScript-Cache mit falschem MIME-Typ reparieren, auch wenn
das Hauptmodul selbst nicht mehr startet.

## Datenfluss

### Start im lokalen Modus

1. `app.js` liest den Speichermodus aus IndexedDB.
2. `local-storage.js` lädt das Dokument und normalisiert es mit
   `normalizeAppData`.
3. Der Controller ersetzt seinen In-Memory-Zustand.
4. Pure Funktionen aus `fifo.js` und `views.js` leiten Ansichten und Kennzahlen
   ab.
5. UI-Module und Controller-Renderer schreiben das Ergebnis in den DOM.

### Start mit Google Drive

1. Google Identity Services initialisiert den Token-Client.
2. Erst danach wird der Anmeldebutton freigegeben.
3. Der erhaltene Access-Token bleibt nur im Arbeitsspeicher.
4. `storage.js` sucht die von der App erstellte `trade-kalender.json`, lädt
   zuerst deren ETag und anschließend den Inhalt.
5. Das normalisierte Dokument durchläuft denselben Renderpfad wie lokale Daten.

### CSV-Import

1. `import.js` parst den Scalable-Capital-Export und akzeptiert nur ausgeführte
   Buy-/Sell-Zeilen.
2. Jede Brokerzeile erhält eine stabile `sourceRowId`; bekannte Zeilen werden
   nicht erneut in das Ledger aufgenommen.
3. `fifo.js` spielt `importRows` gegen `importBaseOpenLots` ab.
4. Geschlossene Import-Trades und offene Lots entstehen als abgeleitete Daten.
5. Erst nach Vorschau, Migrationsprüfung und Kontrollbericht übernimmt der
   Controller den neuen Zustand und speichert ihn.

Der Verlauf des eingesetzten Kapitals ist ebenfalls eine abgeleitete Sicht auf
die Handelsdaten. `views.js` schätzt den Zeitraum vor dem ersten vollständigen
Import-Ledger aus Einstand und Haltedauer der Legacy-Trades. Ab dem Ledger-
Beginn spielt es Brokerbuchungen gegen den unveränderten Anfangsbestand, misst
je Kalendertag das Maximum des gleichzeitig offenen FIFO-Einstands und führt
offene Positionen über ereignisfreie Tage fort. Die Zeitachse beginnt mit der
Trade-Historie. Eine aus realisiertem Netto-P&L fortgeschriebene Equity-Grenze
verhindert bei diesem Konto ohne Margin, dass rekonstruierter Kapitaleinsatz
oberhalb des verfügbaren Kapitals angezeigt wird. Schätz- und Begrenzungsfälle
bleiben Metadaten der Auswertung; es entstehen keine neuen persistenten Felder.

### Mutation und Speichern

1. Der Controller prueft zuerst die sitzungsweite Nur-Ansehen-Sperre. Im
   Invis-Modus werden mutierende Einstiegspunkte und `persist()` abgewiesen;
   reine Navigation, Filter und Suche bleiben erlaubt.
2. Der Controller bildet einen neuen vollständigen Zustand, statt während
   eines asynchronen Schreibens weiter ein veränderliches Objekt zu benutzen.
3. Sicherheitsrelevante Aktionen erzeugen vorher einen Safety-Snapshot.
4. Lokale Daten werden normalisiert in IndexedDB geschrieben. Drive-Schreiben
   laufen seriell und mit dem zuletzt gelesenen ETag.
5. Bei einem Drive-Konflikt wird nichts überschrieben; die App lädt den
   aktuellen Serverstand und fordert zur Wiederholung der Aktion auf.

## Zustands- und Vertrauensgrenzen

- Nur [`app-data.js`](../js/app-data.js) definiert die persistente Top-Level-
  Struktur. Unbekannte Top-Level-Felder werden bewusst verworfen.
- Importierte Trades sind eine Sicht auf das Broker-Ledger. Änderungen an
  ihnen müssen die zugehörige Verkaufszeile ändern und anschließend FIFO neu
  abspielen.
- Das Entfernen einer offenen Position löscht keine Brokerdaten. Ein
  versioniertes Ereignis blendet konkrete stabile Lot-IDs aus.
- Datumsschlüssel werden als lokales `YYYY-MM-DD` behandelt. Eine Umwandlung
  über `toISOString()` ist verboten, weil sie Kalendertage verschieben kann.
- Steuer behält ihr Vorzeichen: positiv ist abgeführte Steuer, negativ eine
  Erstattung. P&L ist `Verkauf - Einstand - Steuer`.
- Inhalte aus CSV und JSON sind nicht vertrauenswürdig und werden vor
  HTML-Ausgabe beziehungsweise Tabellenexport neutralisiert.

## Authentifizierung und externe APIs

Die App verwendet Google Identity Services direkt im Browser. Die
OAuth-Client-ID ist eine öffentliche Browserkennung und kein Secret. Der Scope
`drive.file` erlaubt nur den Zugriff auf Dateien, welche die App selbst
erstellt oder die ihr ausdrücklich geöffnet wurden. Es gibt keinen
Client-Secret, kein eigenes Backend und keinen gespeicherten Refresh-Token.

Die Anmeldung und Drive-Synchronisation sind onlineabhängig. Der lokale Modus
und bereits gecachte App-Dateien funktionieren ohne Google, solange der Browser
die IndexedDB-Daten nicht gelöscht hat.

## PWA und Auslieferung

Die App-Shell besteht aus `index.html`, Manifest, Icons, CSS, dem
Service-Worker-Starter und allen lokalen JavaScript-Modulen. Eine Lieferung
erhöht dieselbe Releasekennung an fünf Stellen:

1. statische Versionsanzeige im Login,
2. statische Versionsanzeige im App-Header,
3. Queryparameter des Hauptmoduls in `index.html`,
4. `APP_VERSION` in `js/config.js` und `RELEASE` in `sw-register.js`,
5. Cache-Name in `sw.js`.

Die Tests erzwingen die Gleichheit. Alle geänderten Module, HTML, CSS und
Service Worker müssen gemeinsam veröffentlicht werden; ein Teil-Deploy kann
die ES-Modul-Kette brechen.

Auch Dokumentnavigationen werden aus dem Cache des jeweils aktiven Workers
bedient. Dadurch stammen `index.html` und ihre ES-Module garantiert aus
derselben versionierten App-Shell. Ein neuer Worker lädt zunächst alle Dateien
seines Releases und übernimmt sie anschließend gemeinsam; Network-first für
das HTML ist verboten, weil es neue DOM-Struktur mit alten Modulen mischen kann.

## Änderungen richtig einordnen

- Neue Finanzberechnung: pure Funktion plus Handwerttests in der Fachschicht.
- Neues Dialogverhalten: kleines UI-Modul; Mutation und Persistenz bleiben im
  Controller.
- Neues persistentes Feld: zuerst
  [Datenmodell](DATA_MODEL.md), Normalisierung, beide Speicherpfade, Backups und
  Abwärtskompatibilität anpassen.
- Neue externe API: Vertrauensgrenze, CSP, Fehlerfälle, Offline-Verhalten und
  Datenminimierung dokumentieren und testen.
- Strukturumbau: nur in kleinen, jeweils grünen Etappen ohne gleichzeitige
  Fachänderung.
