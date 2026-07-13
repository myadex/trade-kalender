# Trade Kalender

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

Das Entfernen einer offenen Position ohne P&L-Buchung ist bei aktivem Ledger
bewusst gesperrt: Es gibt daf\u00fcr kein reproduzierbares Brokerereignis und die
Position w\u00fcrde beim n\u00e4chsten Replay sonst wieder erscheinen.

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
wird nicht versioniert. Die kanonischen Daten liegen in Google Drive. Bereits
ver\u00f6ffentlichte Git-Historie wird dadurch nicht bereinigt; eine History-Rewrite
mit anschlie\u00dfendem Force-Push ist eine separate, bewusste Sicherheitsma\u00dfnahme.

## Offline-PWA ab v39

Die App-H\u00fclle, alle lokalen JavaScript-Module und Icons werden beim Service-
Worker-Install vorgeladen. Offline kann eine Navigation daher die vorhandene
`index.html` anzeigen. Google-Anmeldung, Drive-Daten und Google-Fonts bleiben
bewusst online-only; ohne Netz ist kein Login oder Datensynchronisieren m\u00f6glich.

## Weiterentwicklung

Die priorisierte Liste aller offenen Punkte steht in [BACKLOG.md](BACKLOG.md).
