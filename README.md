# Trade Kalender

## Import-Ledger ab v35

Bestehende `trades` und `openLots` bleiben Legacy-Daten. Ab dem ersten neuen
CSV-Import speichert die Drive-JSON zus\u00e4tzlich die unver\u00e4nderten
`importRows` und den einmaligen `importBaseOpenLots`-Snapshot. Daraus werden
neue Import-Trades und offene Lots bei jedem Replay reproduzierbar abgeleitet.

Der erste Ledger-Import darf deshalb nur neue Brokerzeilen enthalten. Einen
vollst\u00e4ndigen historischen Neuaufbau erfordert weiterhin den originalen CSV-
Export. Importierte Trades werden gel\u00f6scht und durch Replay korrigiert; f\u00fcr
inhaltliche Korrekturen wird die korrigierte CSV erneut importiert.

## Vollst\u00e4ndiger CSV-Neuaufbau ab v41

Im CSV-Import kann die Option **"Vollst\u00e4ndig aus diesem Broker-Export neu
aufbauen"** aktiviert werden. Sie ist ausschlie\u00dflich f\u00fcr einen l\u00fcckenlosen,
ma\u00dfgeblichen Broker-Export gedacht und ersetzt alle Legacy-Trades sowie offene
Lots durch das reproduzierbare Roh-Ledger. Der manuell gepflegte Kapitalwert
bleibt erhalten.

Vor dem Ersetzen erzeugt die App eine lokale JSON-Sicherung des aktuellen
Stands. Erst danach wird die neue Datei in Google Drive gespeichert.
Die Sicherung kann bei Bedarf mit "JSON wiederherstellen" eingespielt werden.

Das Entfernen einer offenen Position ohne P&L-Buchung ist bei aktivem Ledger
bewusst gesperrt: Es gibt daf\u00fcr kein reproduzierbares Brokerereignis und die
Position w\u00fcrde beim n\u00e4chsten Replay sonst wieder erscheinen.

## Drive-Sicherheit ab v37

Jeder Drive-HTTP-Fehler au\u00dfer 401 wird mit Status und Servermeldung angezeigt.
Eine ung\u00fcltige Drive-JSON wird nicht als leerer Bestand interpretiert. Lokale
Schreibauftr\u00e4ge werden mit einem eigenen Daten-Snapshot nacheinander gespeichert,
damit schnelle aufeinanderfolgende Aktionen sich nicht gegenseitig \u00fcberschreiben.

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
