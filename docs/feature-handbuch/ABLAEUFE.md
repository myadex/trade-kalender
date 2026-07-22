# Nutzerabläufe

Diese Abläufe beschreiben die wichtigsten End-to-End-Wege. Details zu jeder
Funktion stehen im [Funktionskatalog](FEATURES.md); technische Fehlerbilder und
Schutzgrenzen im [Security-Leitfaden](../../SECURITY.md).

## Erster Start nur auf diesem Gerät

**Voraussetzung:** Die App wurde in diesem Browserprofil noch nicht
eingerichtet.

1. App öffnen.
2. **Nur auf diesem Gerät** wählen.
3. Leeren Stand verwenden oder anschließend Daten importieren beziehungsweise
   manuell erfassen.

**Ergebnis:** Die App speichert in IndexedDB und kann nach geladener App-Hülle
offline genutzt werden.

**Beachten:** Dieser Stand verlässt das Gerät nicht, ist aber auch nicht gegen
gelöschte Browserdaten oder Geräteverlust geschützt. Regelmäßig eine
verschlüsselte Backup-Datei erstellen.

## Erster Start mit Google Drive

**Voraussetzung:** Onlineverbindung und ein für die konfigurierte OAuth-App
freigeschaltetes Google-Konto.

1. Warten, bis **Mit Google Drive starten** aktiv ist.
2. Den Button einmal drücken und die Google-Anmeldung abschließen.
3. Die App lädt `trade-kalender.json` oder legt beim ersten Speichern eine neue
   Datei an.

**Ergebnis:** Der aktive Stand wird in Google Drive gespeichert. Spätere
Schreibvorgänge sind ETag-geschützt.

**Beachten:** Den Button während einer laufenden Token-Anfrage nicht mehrfach
drücken. Drive-Funktionen stehen offline nicht zur Verfügung.

## Scalable-CSV importieren

**Voraussetzung:** Ein unveränderter Scalable-Capital-CSV-Export. Der Export
darf nicht ins Repository kopiert oder einem öffentlichen Issue angehängt
werden.

1. **CSV importieren** öffnen.
2. Die `.csv`-Datei auswählen oder in die Drop-Zone ziehen.
3. Importvorschau prüfen: neue Zeilen, Duplikate, Trades, offene Positionen,
   P&L- und Steueränderung.
4. Beim ersten Ledger-Import einen angezeigten Historienkonflikt ernst nehmen
   und gegebenenfalls einen Export verwenden, der nur neue Brokerzeilen
   enthält.
5. Import bestätigen.

**Ergebnis:** Nur unbekannte Rohzeilen werden ergänzt. FIFO erzeugt
geschlossene Trades und offene Lots reproduzierbar; vorher wird eine
Safety-Sicherung angelegt.

**Beachten:** Ein vollständiger Brokerexport ersetzt nicht manuelle oder
Legacy-Daten. Es gibt absichtlich keinen Modus zum kompletten Neuaufbau.

## Trade manuell erfassen

1. **Trade hinzufügen** öffnen.
2. Produkt, Ein- und Ausstieg, Beträge, Steuer und optionale Metadaten eintragen.
3. P&L-Vorschau prüfen.
4. Speichern.

**Ergebnis:** Der Trade erscheint am Ausstiegstag in Kalender, Aggregationen,
Suche und Statistik.

**Beachten:** Eine negative Steuer ist eine Erstattung und bleibt mit ihrem
Vorzeichen erhalten. Der Invis-Modus muss vor einer Änderung beendet werden.

## Bestehenden Trade bearbeiten

1. Kalendertag oder Suchergebnis öffnen.
2. Den gewünschten Trade auswählen und **Bearbeiten** verwenden.
3. Bei einem manuellen beziehungsweise Legacy-Trade die direkten Felder
   ändern. Bei einem importierten Trade die freigegebenen Verkaufsfelder
   ändern.
4. Vorschau und Ergebnis prüfen, dann speichern.

**Ergebnis:** Manuelle Trades werden direkt aktualisiert. Bei importierten
Trades ersetzt die App die Broker-Verkaufszeile und spielt das FIFO-Ledger neu
ab.

**Beachten:** Kaufbetrag und Broker eines importierten Trades sind nicht im
Verkauf enthalten und bleiben deshalb schreibgeschützt.

## Offene Position schließen oder ausblenden

### Position schließen

1. **Offene Positionen** öffnen.
2. Bei der Position **Schließen** wählen.
3. Verkauf, Datum, Uhrzeit und Steuer prüfen; bei Bedarf **Totalverlust**
   verwenden.
4. Schließen bestätigen.

**Ergebnis:** Die sichtbaren Lots werden geschlossen und das realisierte P&L
fließt in alle Auswertungen ein.

### Position ausblenden

1. Bei der Position **Position entfernen** wählen.
2. Sicherheitsabfrage bestätigen.

**Ergebnis:** Die zugehörigen offenen Lot-IDs verschwinden aus der normalen
Ansicht, ohne Brokerhistorie oder FIFO zu löschen. Unter **Entfernte
Positionen** macht **Wieder anzeigen** den Ausschluss rückgängig.

## Kalender, Reviews und Statistik verwenden

1. Im **Kalender** einen Monat und anschließend einen Handelstag öffnen.
2. Unter **Wöchentlich** eine ISO-Kalenderwoche auswählen und Review sowie
   Summenzeile vergleichen.
3. Unter **Monatlich** einen Monat auswählen und Review sowie Balken ansehen.
4. Unter **Statistik** zwischen **Kennzahlen**, **Performance**, **Timing** und
   **Verhalten** wechseln.
5. Für Trading-Kennzahlen bei Bedarf einen Ausstiegszeitraum setzen.

**Ergebnis:** Alle Ansichten verwenden denselben Bestand realisierter Trades.
Wochen laufen Montag bis Sonntag; offene Positionen verändern Equity und
realisiertes P&L nicht.

**Beachten:** Kleine Stichproben, fehlende Zeitdaten oder fehlende Nenner werden
als Einschränkung angezeigt.

## Trades suchen und filtern

1. **Trades suchen** öffnen.
2. Produkt oder ISIN eingeben und optional Zeitraum, Richtung, Ergebnis oder
   Haltedauer ergänzen.
3. Filter kombinieren oder vollständig zurücksetzen.
4. Mit **Tag anzeigen** zum zugehörigen Kalendertag wechseln.

**Ergebnis:** Die Suche zeigt nur passende geschlossene Trades und deren
zusammengefasstes Netto-P&L. Sie verändert keine Daten.

## Invis-Modus verwenden

1. Im Header **Invis** aktivieren.
2. Die App nur zum Navigieren, Suchen, Filtern und Lesen verwenden.
3. Zum Bearbeiten **Invis an** drücken und das Entsperren bestätigen.

**Ergebnis:** Geldwerte erscheinen als Prozent des festen Startkapitals, ISINs
und Stückzahlen sind maskiert und alle schreibenden Aktionen sind blockiert.

**Beachten:** Der Modus ist nur für die aktuelle Sitzung aktiv. Er
verschlüsselt weder Arbeitsspeicher noch den gespeicherten Datenbestand. Alle
Perioden verwenden das gleiche Startkapital als Nenner, nicht den jeweiligen
Kapitalstand zu Periodenbeginn.

## Safety-Sicherung wiederherstellen

1. **Sicherungen** öffnen.
2. Grund und Zeitpunkt der gewünschten Sicherung prüfen.
3. **Wiederherstellen** wählen und bestätigen.

**Ergebnis:** Der Snapshot wird zum aktiven Stand. Direkt davor legt die App
eine neue Sicherung des abgelösten Zustands an.

**Beachten:** Es werden höchstens zehn Sicherungen gehalten. Da sie Teil des
aktiven App-Dokuments sind, ersetzen sie keine externe Datei.

## Verschlüsseltes Backup erstellen und wiederherstellen

### Erstellen

1. **Backup-Datei** öffnen.
2. Eine lange, nur hier verwendete Passphrase zweimal eingeben.
3. **Backup erstellen** wählen und die Datei sicher außerhalb des Browsers
   verwahren.

### Wiederherstellen

1. **Backup-Datei** öffnen und die Backup-Datei auswählen.
2. Die passende Passphrase eingeben.
3. **Wiederherstellen** wählen.

**Ergebnis:** Nach erfolgreicher Entschlüsselung und Validierung ersetzt der
Backup-Stand den aktiven Zustand; der alte Zustand bleibt als Safety-Sicherung
erhalten.

**Beachten:** Eine verlorene Passphrase kann nicht wiederhergestellt werden.
Backup-Datei und Passphrase getrennt aufbewahren.

## Lokalen Stand später mit Google Drive verbinden

**Voraussetzung:** Die App läuft im lokalen Modus und ist online.

1. **Mit Google Drive verbinden** wählen und Google-Anmeldung abschließen.
2. Vergleich von lokalem und Drive-Stand vollständig lesen.
3. Genau eine Option wählen: lokalen Stand zu Drive übertragen, vorhandenen
   Drive-Stand verwenden oder abbrechen.
4. Ergebnis und Speicheranzeige kontrollieren.

**Ergebnis:** Der gewählte Stand wird ETag-geschützt in Drive gespeichert und
der ersetzte Stand darin als Safety-Sicherung bewahrt. Ab jetzt ist Drive der
aktive Speichermodus.

**Beachten:** Es gibt keinen automatischen Merge. Bei Unsicherheit abbrechen
und zuerst eine verschlüsselte Backup-Datei des lokalen Stands erstellen.

## Drive-Konflikt behandeln

**Auslöser:** Ein anderer Tab oder ein anderes Gerät hat die Drive-Datei seit
dem letzten Laden verändert.

1. Konfliktmeldung vollständig lesen.
2. Den automatisch neu geladenen aktuellen Drive-Stand prüfen.
3. Feststellen, ob die verworfene Aktion noch erforderlich ist.
4. Nur dann die Aktion auf Basis des neuen Stands wiederholen.

**Ergebnis:** Die fremde Änderung wird nicht überschrieben. Die ursprüngliche
lokale Aktion muss bewusst neu ausgeführt werden.
