# Trade Kalender

Persönlicher Trade-Kalender als installierbare PWA. Die App läuft ohne
Framework und ohne Build-Schritt direkt im Browser.

## Kompakter Ergebnis-Header ab v78

Der feste Kopfbereich zeigt nur noch das realisierte Gesamt-P&L (netto), die
abgefuehrten Steuern und die Rendite. Tagesquoten, Trade-Anzahl, Durchschnitte
und Serien bleiben im fachlich passenden Statistik-Tab und belegen nicht mehr
auf jeder Ansicht Platz. Ein Klick auf die Rendite oeffnet weiterhin die
Bearbeitung des Einstands, der als Nenner der Renditeberechnung dient.
Seit v79 bleibt die Ergebniszeile auch im mobilen Spaltenlayout kompakt; die
Desktop-Flexbasis wird dort nicht mehr als vertikale Hoehe uebernommen.

## Speichermodi ab v72

Beim ersten Start stehen zwei gleichwertige Wege bereit:

- **Mit Google Drive starten:** Die App speichert den vollständigen Zustand in
  `trade-kalender.json` im `drive.file`-Scope. Gleichzeitige Änderungen werden
  mit einem starken ETag erkannt.
- **Nur auf diesem Gerät:** Die App speichert den vollständigen Zustand in der
  IndexedDB dieses Browsers. Ein bereits gewählter lokaler Modus startet ohne
  Google-Anmeldung und kann nach geladener App-Hülle offline arbeiten.

Lokaler Browser-Speicher ist weder ein Backup noch ein geräteübergreifender
Sync. Gelöschte Website-Daten, eine App-Deinstallation oder ein Gerätedefekt
können ihn entfernen. Mehrere gleichzeitig geöffnete lokale Tabs besitzen
aktuell keinen gegenseitigen Versionsvergleich.

### Lokalen Stand später mit Drive verbinden

Im lokalen Modus ist **Mit Google Drive verbinden** auf Desktop und Mobil
verfügbar. Die App liest zuerst beide Seiten und zeigt Trade-Anzahl, Zeitraum,
Netto-P&L, sichtbare offene Positionen und die letzte interne Sicherung. Danach
wird ausdrücklich genau ein führender Stand gewählt:

- lokalen Stand zu Drive übertragen oder
- vorhandenen Drive-Stand verwenden.

Es gibt bewusst keinen automatischen Merge. Import-Ledger, manuelle Trades,
offene Lots und ausgeblendete Positionen könnten sonst doppelt oder
widersprüchlich werden. Der ersetzte Stand wird als Safety-Snapshot in den
gewählten Zielstand aufgenommen; ein vorhandener Drive-Stand wird nur mit dem
zuvor gelesenen ETag überschrieben.

## Verschlüsselte Backup-Dateien ab v72

Unter **Backup-Datei** kann der komplette App-Zustand auf Desktop und Mobil
passwortgeschützt exportiert oder wiederhergestellt werden. Das versionierte
Format verwendet PBKDF2-HMAC-SHA-256 mit 600.000 Iterationen und zufälligem Salt
sowie AES-256-GCM mit zufälliger Nonce. Die Verschlüsselung läuft vollständig
im Browser; Passphrase und Klartext werden nicht in der Datei gespeichert.

Vor einer erfolgreichen Wiederherstellung wird der aktuelle Zustand als
interne Sicherung aufgenommen. Falsche Passphrasen, manipulierte Dateien,
unbekannte Formatversionen und ungültige App-Daten werden vor dem Speichern
abgelehnt. Eine vergessene Passphrase kann nicht zurückgesetzt werden. Die
Datei ist ein manuelles Backup beziehungsweise Transportmittel und kein
automatischer Sync.

## Import-Ledger ab v35

Bestehende `trades` und `openLots` bleiben Legacy-Daten. Ab dem ersten neuen
CSV-Import speichert die Drive-JSON zus\u00e4tzlich die unver\u00e4nderten
`importRows` und den einmaligen `importBaseOpenLots`-Snapshot. Daraus werden
neue Import-Trades und offene Lots bei jedem Replay reproduzierbar abgeleitet.

Der erste Ledger-Import darf deshalb nur neue Brokerzeilen enthalten. Der
normale CSV-Import erg\u00e4nzt ausschlie\u00dflich noch unbekannte Brokerzeilen.

## Importierte Trades bearbeiten ab v43

Der Bearbeiten-Button eines importierten Trades \u00e4ndert dessen gespeicherte
Broker-Verkaufszeile. Danach wird das gesamte Import-Ledger neu abgespielt, sodass
Einstand, P&L und offene Lots weiterhin aus FIFO entstehen. Datum, Produkt,
St\u00fcckzahl, Verkaufsbetrag und Steuer sind editierbar. Kaufbetrag und Broker
bleiben schreibgesch\u00fctzt, weil sie nicht Teil der Verkaufszeile sind.

Ung\u00fcltige Eingaben, doppelte Rohzeilen und Verk\u00e4ufe ohne ausreichende offene
Lots werden vor dem Speichern abgelehnt. Legacy- und manuell angelegte Trades
verwenden weiterhin den direkten Editor.

## Kein vollst\u00e4ndiger CSV-Neuaufbau

Der zeitweise erprobte Komplett-Neuaufbau wurde in v43 bewusst entfernt. Ein
Broker-Export enth\u00e4lt keine manuellen Korrekturen und ist deshalb nicht die
ma\u00dfgebliche Quelle f\u00fcr den gesamten Datenbestand. Der normale CSV-Import
erg\u00e4nzt weiterhin nur neue Brokerzeilen, ohne Legacy-Daten zu ersetzen.

## Offene Positionen entfernen ab v44

"Position entfernen" l\u00f6scht keine Brokerzeile. Die App speichert stattdessen
einen versionierten Ausschluss f\u00fcr die stabilen IDs der aktuell offenen Lots.
Dadurch bleiben Brokerhistorie, FIFO, P&L und Steuer unver\u00e4ndert und die
Position bleibt auch nach einem Import-Ledger-Replay aus der normalen Ansicht
entfernt.

Sp\u00e4tere K\u00e4ufe derselben ISIN erhalten neue Lot-IDs und bleiben sichtbar. Alle
aktiven Ausschl\u00fcsse stehen unter **"Entfernte Positionen"** und k\u00f6nnen dort mit
**"Wieder anzeigen"** dauerhaft r\u00fcckg\u00e4ngig gemacht werden. Nach einem echten
Verkauf erzeugen geschlossene Lots dort keinen veralteten Eintrag. Das Feld
`hiddenOpenPositions` ist optional, damit bestehende Drive-JSON-Dateien und alte
Sicherungen weiterhin ohne Migration geladen werden.

## Drive-Sicherheit ab v37

Jeder Drive-HTTP-Fehler au\u00dfer 401 wird mit Status und Servermeldung angezeigt.
Eine ung\u00fcltige Drive-JSON wird nicht als leerer Bestand interpretiert. Lokale
Schreibauftr\u00e4ge werden mit einem eigenen Daten-Snapshot nacheinander gespeichert,
damit schnelle aufeinanderfolgende Aktionen sich nicht gegenseitig \u00fcberschreiben.

## Drive-Konfliktschutz ab v42

Jeder geladene Drive-Stand wird mit einer starken Versionskennung verkn\u00fcpft.
Beim Speichern sendet die App diese Kennung als `If-Match`; hat ein anderer Tab
oder ein anderes Ger\u00e4t die Datei inzwischen ge\u00e4ndert, lehnt Drive den
Schreibvorgang atomar mit HTTP 412 ab. Die App \u00fcberschreibt dann nichts, l\u00e4dt
den neuesten Drive-Stand und fordert dazu auf, die verworfene Aktion bei Bedarf
zu wiederholen.

Die Drive API v3 bleibt f\u00fcr Suche, Erstellung und Download zust\u00e4ndig. Da ihre
Dateirepr\u00e4sentation kein `etag`-Feld anbietet, nutzt nur der Versionsabruf und
der bedingte Update den weiterhin offiziellen v2-Dateivertrag. Diese begrenzte
Kombination wurde einem nicht atomaren Vorabvergleich der v3-`version`
vorgezogen, weil zwischen Vergleich und Schreiben sonst weiterhin ein
Race-Condition-Fenster best\u00fcnde.

## Datenschutz

`trade-kalender.json` ist ein lokaler, personenbezogener Laufzeit-Snapshot und
wird nicht versioniert. Je nach gewähltem Speichermodus liegt der führende
Datenstand in IndexedDB oder Google Drive. Verschlüsselte Backup-Dateien werden
nur auf ausdrückliche Nutzeraktion erstellt. Bereits veröffentlichte
Git-Historie wird dadurch nicht bereinigt; eine History-Rewrite mit
anschließendem Force-Push ist eine separate, bewusste Sicherheitsmaßnahme.

## Offline-PWA ab v39

Die App-H\u00fclle, alle lokalen JavaScript-Module und Icons werden beim Service-
Worker-Install vorgeladen. Offline kann eine Navigation daher die vorhandene
`index.html` anzeigen. Der lokale Modus kann danach seine IndexedDB-Daten ohne
Netz verwenden. Google-Anmeldung, Drive-Daten und Google-Fonts bleiben bewusst
online-only; ohne Netz ist kein Drive-Login oder Drive-Synchronisieren möglich.
Die versionsgebundenen lokalen App-Module werden Cache-first geladen; ein
App-Update aktiviert jeweils einen neuen Service-Worker-Cache. Ein alter
JavaScript-Cacheeintrag mit falschem MIME-Typ wird beim naechsten Online-Laden
erkannt und durch eine gueltige Serverantwort ersetzt. Die Service-Worker-
Registrierung liegt dafuer in einem kleinen unabhaengigen Starter, sodass ein
defekter `app.js`-Cache seine eigene Reparatur nicht blockieren kann. Seit v77
prueft dieser Starter den echten Server getrennt vom aktiven Service Worker.
Liefert nur dessen Cache noch `text/plain`, entfernt er ausschliesslich alte
`trade-kalender-*`-App-Shell-Caches und laedt neu. IndexedDB-, Local-Storage-
und Drive-Daten bleiben dabei unangetastet.

VS Code Live Server fuegt fuer Live-Reload ein Inline-Skript in `index.html`
ein. Die absichtlich strenge CSP blockiert dieses Fremdskript; die zugehoerige
Konsolenmeldung betrifft nur Live-Reload und ist kein App-Fehler. Fuer einen
ruhigen Konsolenlauf sollte ein statischer Server ohne HTML-Injektion verwendet
werden. `unsafe-inline` wird dafuer bewusst nicht freigeschaltet.

## Weiterentwicklung

Die priorisierte Liste aller offenen Punkte steht in [BACKLOG.md](BACKLOG.md).
