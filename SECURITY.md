# Sicherheit

Der Trade Kalender verarbeitet Handelsdaten, realisierte Ergebnisse und
Steuerwerte. Dieses Dokument beschreibt die Sicherheitsgrenzen des Projekts,
den verantwortlichen Umgang mit Finanzdaten und das Melden von Schwachstellen.

## Schutzwürdige Daten

Als vertraulich gelten insbesondere:

- Scalable-Capital-CSV/XLSX und andere Broker-Exporte,
- `trade-kalender.json` aus Google Drive oder lokalen Snapshots,
- unverschlüsselte JSON-Backups,
- Screenshots mit realen Trades, P&L, ISINs oder Steuerwerten,
- Passphrasen und entschlüsselte Backup-Inhalte,
- Google-Access-Tokens.

Diese Daten gehören weder in Git noch in öffentliche Issues, Chatprotokolle
oder Test-Fixtures. Vor einem Commit ist mit `git status` und dem vollständigen
Diff zu prüfen, dass keine echten Finanzdaten enthalten sind. Eine
nachträgliche `.gitignore`-Regel entfernt bereits veröffentlichte Daten nicht
aus der Git-Historie.

## Google OAuth und Drive

Die in `js/config.js` sichtbare OAuth-Client-ID identifiziert die
Browseranwendung. Öffentliche OAuth-Client-IDs sind keine geheimen
Zugangsdaten. In dieses Repository gehören dennoch niemals Client-Secrets,
Refresh-Tokens, Service-Account-Schlüssel oder Access-Tokens.

Die App fordert ausschließlich `drive.file` an. Dadurch sieht sie nur Dateien,
die sie selbst erstellt hat oder die ihr ausdrücklich geöffnet wurden. Der
Access-Token bleibt im Arbeitsspeicher und wird beim Abmelden widerrufen; die
App besitzt kein Backend und speichert keinen Refresh-Token.

Drive-Schreiben verwenden ein starkes ETag und `If-Match`. Ändert ein anderer
Tab oder ein anderes Gerät dieselbe Datei, lehnt Drive das Update mit HTTP 412
ab. Die App überschreibt in diesem Fall keine fremde Änderung.

## Lokaler Modus

Im lokalen Modus liegen die Daten in IndexedDB des gewählten Browserprofils.
Die App fordert bestmöglich persistenten Browserspeicher an. Das ist keine
Garantie: gelöschte Website-Daten, private Browsermodi, eine Deinstallation
oder ein Gerätedefekt können den Stand entfernen. Lokale Daten sind nicht
automatisch zwischen Geräten synchronisiert.

Für wichtige Bestände sollte regelmäßig ein verschlüsseltes externes Backup
erstellt und getrennt vom Gerät aufbewahrt werden.

## Verschlüsselte Backups

Backup-Dateien verwenden PBKDF2-HMAC-SHA-256 mit 600.000 Iterationen, einem
zufälligen Salt und AES-256-GCM mit zufälliger Nonce. Metadaten werden als
authentifizierte Zusatzdaten gebunden. Kryptografie und Entschlüsselung laufen
im Browser.

Die Passphrase wird nicht gespeichert und kann nicht zurückgesetzt werden. Sie
muss mindestens zehn Zeichen lang, einzigartig und getrennt von der
Backup-Datei verwahrt sein. Ein verlorenes Passwort macht das Backup
unwiederbringlich unlesbar; eine gemeinsam mit der Datei gespeicherte
Passphrase hebt den Schutz praktisch auf.

Nach dem Entschlüsseln prüft die App Format und App-Daten, bevor sie den
laufenden Zustand verändert. Vor einer erfolgreichen Wiederherstellung entsteht
zusätzlich ein interner Safety-Snapshot.

## Web- und PWA-Härtung

- Die Content Security Policy erlaubt App-Skripte nur von der eigenen Herkunft
  und Google Identity Services. `unsafe-inline` und `unsafe-eval` sind für
  Skripte verboten.
- Fremde CSV-/JSON-Texte werden vor HTML-Ausgabe escaped.
- CSV-Export neutralisiert Tabellenformeln und schützt Zellgrenzen.
- Google- und Drive-Anfragen werden vom Service Worker nie gecacht.
- JavaScript mit falschem MIME-Typ wird nicht als gültige App-Shell
  persistiert.
- Die App validiert geladene Dokumente und interpretiert kaputte Drive-JSON
  nicht als leeren Datenstand.

Die Service-Worker-Reparatur löscht nur versionierte
`trade-kalender-*`-App-Shell-Caches. Sie löscht weder IndexedDB noch Drive-Daten.

## Invis-Modus und Sichtschutz

Der Invis-Modus reduziert sichtbare Finanzdetails bei Bildschirmfreigaben.
Geldwerte werden relativ zum festen Startkapital dargestellt; ISINs und
Stueckzahlen werden maskiert. Der Controller versteckt nicht nur
Bearbeitungsaktionen, sondern blockiert zusaetzlich mutierende Einstiegspunkte
und die zentrale Persistenz. Export, Restore, Backups und Speicherwechsel sind
in diesem Zustand ebenfalls nicht erreichbar.

Das ist kein kryptografischer Schutz und keine Zugriffskontrolle. Exakte Werte
bleiben in `DATA`, IndexedDB beziehungsweise Google Drive und koennen von
technisch versierten Personen mit Browserwerkzeugen gelesen werden. Der Modus
wird nicht persistiert, gilt nur fuer die laufende Seite und startet nach einem
Reload deaktiviert. Fuer Schutz ruhender Daten bleiben verschluesselte Backups,
Geraeteschutz und ein vertrauenswuerdiges Browserprofil erforderlich.

## Schwachstelle melden

Veröffentliche keine Schwachstelle zusammen mit Finanzdaten, Tokens oder einer
echten Backup-Datei in einem öffentlichen Issue. Kontaktiere den
Repository-Eigentümer über den vereinbarten privaten Kanal und beschreibe:

- betroffene Version und Browser,
- reproduzierbare Schritte mit ausschließlich synthetischen Daten,
- erwartetes und tatsächliches Verhalten,
- mögliche Auswirkungen,
- bekannte Gegenmaßnahmen.

Es existiert derzeit keine öffentliche Security-Mailadresse. Wenn kein privater
Kontaktweg bekannt ist, kann ein neutrales Issue ohne technische
Angriffsdetails und ohne Daten um einen privaten Kontakt bitten.

## Vorfall behandeln

Bei versehentlich veröffentlichten Finanzdaten:

1. Veröffentlichung beziehungsweise Freigabe sofort stoppen.
2. Betroffene Datei aus dem aktuellen Stand entfernen.
3. Git-Historie und serverseitige Caches separat bereinigen; ein normaler
   Lösch-Commit reicht nicht.
4. Falls Tokens oder echte Secrets betroffen sind, diese widerrufen und
   ersetzen.
5. Klone und Forks als mögliche Kopien berücksichtigen.
6. Ursache mit einem permanenten Schutzcheck beheben.

Bei einem beschädigten Datenstand wird nicht weiter importiert oder gespeichert.
Zuerst werden Original, verschlüsseltes Backup und vorhandene Safety-Snapshots
gesichert; danach werden Trade-Anzahl, P&L, Steuer und offene Lots als
Invarianten verglichen.

## Unterstützte Version

Sicherheitskorrekturen werden nur für die aktuell veröffentlichte
PWA-Version vorgenommen. Die sichtbare Version im Login und Header muss mit
App-Modul, Service-Worker-Starter und Cache-Version übereinstimmen.
