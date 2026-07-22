# Funktionskatalog

Stand dieses Dokuments ist die ausgelieferte App-Version v89. Aufgeführt sind
nur vorhandene Funktionen. Ideen und mögliche Erweiterungen stehen im
[Backlog](../../BACKLOG.md).

## Produkt in einem Satz

Der Trade Kalender ist eine installierbare, für Desktop und Smartphone
optimierte PWA, die Scalable-Capital-Derivatetrades importiert oder manuell
erfasst, realisierte Ergebnisse per FIFO auswertet und den Datenstand lokal
oder in Google Drive speichert.

## Speichern und Synchronisieren

### F-STO-01 – Lokaler Gerätemodus

- Beim ersten Start kann **Nur auf diesem Gerät** gewählt werden.
- Der vollständige App-Zustand liegt dann in IndexedDB im aktuellen
  Browserprofil.
- Nach geladener App-Hülle kann dieser Modus offline verwendet werden.
- Die App fordert nach Möglichkeit persistenten Browser-Speicher an.
- Der Modus ist kein Backup und kein geräteübergreifender Sync. Gelöschte
  Websitedaten, Browserbereinigung oder Deinstallation können ihn entfernen.

### F-STO-02 – Google-Drive-Modus

- **Mit Google Drive starten** authentifiziert über Google Identity Services.
- Die App verwendet nur den `drive.file`-Scope und verwaltet die von ihr
  erstellte Datei `trade-kalender.json`.
- Derselbe kanonische Datenvertrag wird lokal und in Google Drive verwendet.
- Google-Anmeldung und Drive-Zugriff benötigen eine Onlineverbindung.

### F-STO-03 – Lokalen Stand später mit Drive verbinden

- Der lokale Modus kann kontrolliert mit Google Drive verbunden werden.
- Vor einer Entscheidung werden lokaler und entfernter Stand nur gelesen und
  anhand von Trade-Anzahl, Zeitraum, Netto-P&L, sichtbaren offenen Positionen
  und letzter Sicherung verglichen.
- Der Nutzer bestimmt genau einen führenden Stand: lokal nach Drive übertragen
  oder den vorhandenen Drive-Stand übernehmen.
- Es gibt keinen automatischen Merge. Der ersetzte Stand wird im Zielbestand
  als Safety-Sicherung aufgenommen.

### F-STO-04 – Konfliktschutz in Google Drive

- Jeder geladene Drive-Stand erhält eine starke ETag-Versionskennung.
- Änderungen werden mit `If-Match` bedingt gespeichert.
- Wurde die Datei inzwischen auf einem anderen Gerät oder in einem anderen Tab
  verändert, überschreibt die App nichts, lädt den neuesten Stand und fordert
  zum bewussten Wiederholen der Aktion auf.
- Mehrere lokale Tabs besitzen aktuell keinen entsprechenden Versionsvergleich.

## Trades und Positionen

### F-DAT-01 – Trades manuell erfassen

- Geschlossene Trades können mit Produkt, ISIN, Ein- und Ausstiegsdaten,
  Uhrzeiten, Stückzahl, Kauf, Verkauf, Steuer und Broker angelegt werden.
- Die App zeigt vor dem Speichern eine P&L-Vorschau.
- Die Steuer kann manuell eingegeben werden; ihr Vorzeichen bleibt erhalten.
- Manuelle und ältere Legacy-Trades können direkt bearbeitet oder gelöscht
  werden.

### F-DAT-02 – Scalable-CSV importieren

- Unterstützt wird der semikolongetrennte Scalable-Capital-Brokerexport mit
  deutschen Zahlen- und Datumsformaten.
- Kauf- und Verkaufszeilen werden chronologisch mit Buy-vor-Sell-Tiebreak per
  FIFO zusammengeführt.
- Re-Imports sind inkrementell: stabile Rohzeilen-IDs verhindern, dass bereits
  bekannte Brokerzeilen doppelt übernommen werden.
- Reine Kaufzeilen werden als offene Lots gespeichert.
- Fehlende Pflichtspalten, leere Dateien, falsche Dateitypen und Verkäufe ohne
  ausreichende offene Stückzahl werden abgelehnt.
- Beim ersten Ledger-Import verhindert ein eigener Migrationsdialog, dass
  bereits vorhandene Historie unbemerkt doppelt entsteht.

### F-DAT-03 – Importvorschau und Kontrollbericht

- Vor dem Speichern zeigt die App neue Zeilen, bekannte Duplikate,
  Dateiduplikate, entstehende geschlossene Trades und offene Positionen.
- P&L- und Steueränderung werden als kontrollierbare Differenz dargestellt.
- Nach erfolgreichem Speichern bleibt der Bericht sichtbar.
- Vor dem Import entsteht automatisch eine Safety-Sicherung.

### F-DAT-04 – Importierte Trades nachvollziehbar bearbeiten

- Der Editor verändert die gespeicherte Broker-Verkaufszeile und spielt danach
  das gesamte Import-Ledger erneut ab.
- Datum, Produkt, Stückzahl, Verkaufsbetrag und Steuer sind editierbar.
- Kaufbetrag und Broker bleiben schreibgeschützt, weil der FIFO-Einstand aus
  den Kaufzeilen stammt.
- Wird ein importierter Verkauf gelöscht, wird das zugrunde liegende Lot beim
  Replay wieder offen, sofern keine spätere Verkaufszeile es schließt.
- Doppelte Rohzeilen und fachlich unmögliche Verkäufe werden abgewiesen.

### F-DAT-05 – Offene Positionen verwalten

- Offene Lots werden nach Produkt beziehungsweise ISIN als Positionen
  dargestellt.
- Eine Position kann vollständig geschlossen werden; Verkauf, Zeitpunkt und
  Steuer werden erfasst und vorab berechnet.
- Für einen Totalverlust setzt die App den Verkauf auf null und berechnet die
  Steuererstattung vor.
- Ein im Ledger geschlossener Kauf erzeugt eine neue Broker-Verkaufszeile,
  sodass der Zustand reproduzierbar bleibt.

### F-DAT-06 – Position aus der Beobachtung entfernen und wiederherstellen

- **Position entfernen** löscht keine Broker- oder Kaufzeile.
- Stattdessen speichert die App versionierte Ausschlussereignisse für die
  konkreten offenen Lot-IDs.
- Spätere Käufe derselben ISIN bleiben sichtbar, weil sie neue Lot-IDs haben.
- Unter **Entfernte Positionen** kann ein Ausschluss mit **Wieder anzeigen**
  rückgängig gemacht werden.

### F-DAT-07 – Export, Wiederherstellung und Reset

- Geschlossene Trades können als abgesicherte CSV exportiert werden.
- Zellen mit Tabellenformeln sowie Trenn- und Steuerzeichen werden so
  neutralisiert, dass der Export seine Struktur behält.
- Ein vorhandener unverschlüsselter JSON-Stand kann zur Kompatibilität
  wiederhergestellt werden.
- Reset löscht den aktiven fachlichen Stand erst nach Bestätigung.
- Vor JSON-Wiederherstellung und Reset entsteht automatisch eine
  Safety-Sicherung.

## Ansichten und Navigation

### F-UI-01 – Kompakter Ergebnis-Header

Der feste Kopfbereich zeigt ausschließlich:

- realisiertes Gesamt-P&L nach Steuer,
- abgeführte Steuern,
- Rendite auf das hinterlegte feste Startkapital.

Über die Renditekarte lässt sich das Startkapital bearbeiten. Die Rendite ist
`Gesamt-P&L / Startkapital`; sie ist keine zeitgewichtete oder automatisch
aufgezinste Portfoliorendite.

### F-UI-02 – Monatskalender

- Handelstage von Montag bis Freitag werden als Kalender dargestellt.
- Jeder Tag fasst realisiertes P&L und Anzahl der Ausstiege zusammen.
- Ein Tag öffnet die zugehörigen Trades und deren Bearbeitungsaktionen.
- Vorheriger und nächster Monat sind auf Desktop und Mobil erreichbar.

### F-UI-03 – Wochenansicht nach ISO 8601

- Eine Woche läuft von Montag bis Sonntag.
- Kalenderwochennummer, ISO-Wochenjahr und vollständiger Zeitraum werden auch
  am Jahreswechsel korrekt ausgewiesen.
- Die Tabelle zeigt P&L, Umsatz, Trade-Anzahl und Verlauf.
- Das Wochenreview fasst Ergebnis, Steuer, Winrate, Muster und Verlusttreiber
  nach dem Ausstiegstag zusammen. Tendenzen werden erst ab ausreichender
  Stichprobe bezeichnet.

### F-UI-04 – Monatsansicht

- Monate werden als Tabelle und Balkenübersicht aggregiert.
- Das Monatsreview verwendet denselben realisierten Datenbestand und zeigt
  Ergebnis, Steuer, Winrate, belastbare Muster und Verlustursachen.

### F-UI-05 – Offene Positionen

- Sichtbare offene Lots werden zu Positionen verdichtet.
- Einstand, Stückzahl und verfügbare Positionsaktionen werden angezeigt.
- Ausgeblendete Positionen stehen getrennt und können wieder aktiviert werden.
- Es gibt keine Live-Kurse und deshalb kein laufendes unrealisiertes P&L.

### F-UI-06 – Trade-Suche

- Suche nach Produkttext oder ISIN.
- Kombinierbare Filter für Ausstiegszeitraum, Long/Short-Richtung, Ergebnis und
  Haltedauer.
- Legacy-Trades ohne vollständige Einstiegszeit bleiben als **unbekannt**
  sichtbar und filterbar.
- Ergebnisse sind rein lesend, zeigen Trefferzahl und Netto-P&L und können den
  betreffenden Kalendertag öffnen.

## Statistik und Auswertung

Alle Statistiken beruhen auf realisierten geschlossenen Trades. Die interne
Navigation hält die umfangreichen Analysen in vier fachlichen Bereichen.

### F-STA-01 – Kennzahlen

Ein frei wählbarer Ausstiegszeitraum liefert:

- Netto-P&L und Trade-Winrate,
- Profit Factor und Erwartungswert je Trade,
- durchschnittlichen Gewinn und durchschnittlichen Verlust,
- Payoff-Ratio mit allen Trades und als Vergleich ohne die drei schlimmsten
  Verlust-Trades,
- besten und schlechtesten Trade,
- maximale Gewinn- und Verlustserie,
- maximalen realisierten Drawdown als Betrag und Kapitalquote,
- Recovery Factor.

Fehlende Nenner, ungültige Daten und zu kleine Stichproben werden sichtbar
gemeldet, statt einen scheinbar präzisen Wert zu erfinden.

### F-STA-02 – Performance

- Die Equity-Kurve verwendet realisierte Tagesendstände auf Basis des festen
  Startkapitals.
- Aktueller Stand, bisheriges Hoch, aktueller und maximaler Drawdown sowie
  Drawdown-Dauer werden ausgewiesen.
- Offene Positionen und fiktive Marktwerte fließen nicht ein.

### F-STA-03 – Timing

- Wochentage vergleichen Long/Call und Short/Put nach durchschnittlichem
  Netto-P&L; wahlweise nach Einstieg oder Ausstieg gruppiert.
- Eine Richtungstendenz erscheint erst ab mindestens acht auswertbaren Trades
  je Richtung und Wochentag.
- Uhrzeit-Statistik gruppiert nach Vorbörse, Xetra-Eröffnung, Vormittag,
  Mittagsflaute, US-Eröffnung und Nachbörse.
- Ein Stunden-Profil zeigt P&L, Trefferquote und Long-/Short-Anteile.
- Diagnosehinweise machen auffällige Verlustkonzentrationen sichtbar.

### F-STA-04 – Verhalten

- Die Overnight-Analyse unterscheidet Intraday- und über Nacht gehaltene
  Trades anhand von Einstiegs- und Ausstiegszeit.
- Haltedauer, Ergebnis und geplante beziehungsweise auffällig lange
  Overnight-Phasen werden verdichtet.
- Der monatliche Disziplin-Trend zählt wiederkehrende Muster wie Großverluste,
  ungünstige Stunden oder Overnight-Verluste.
- Diese Befunde sind Auswertungen der eigenen Daten und keine Anlageberatung.

## Datenschutz, Sicherheit und Wiederherstellung

### F-SAF-01 – Invis-Modus

- Der dezente Sitzungsschalter macht die App vollständig lesend.
- Alle Euro-Beträge werden als Prozent des hinterlegten festen Startkapitals
  angezeigt – auch in Kalender, Wochen, Monaten, Suche, Positionen, Equity und
  Statistik.
- Diese Prozentwerte verwenden immer dieselbe Kapitalbasis. Ein Januar-Gewinn
  erhöht nicht automatisch den Nenner des Februars; es findet keine
  periodische Verzinsung oder Verkettung statt.
- Bereits dimensionslose Werte wie Winrate, Profit Factor, Payoff-Ratio und
  Drawdown-Quote bleiben in ihrer fachlichen Einheit.
- ISINs und Stückzahlen werden maskiert; Produktnamen, Daten und Anzahlen
  bleiben sichtbar.
- Hinzufügen, Bearbeiten, Löschen, Import, Export, Backup, Restore,
  Kapitaländerung und Speicherwechsel sind gesperrt.
- Navigation, Filter, Suche und Detailansichten bleiben verfügbar.
- Der Modus wird nicht gespeichert und ist Sichtschutz, keine Verschlüsselung.

### F-SAF-02 – Interne Safety-Sicherungen

- Vor riskanten Aktionen wie CSV-Import, JSON-Wiederherstellung, Reset,
  Backup-Restore oder dem Ersetzen eines Speicherstands wird der bisherige
  Zustand automatisch gesichert.
- Die App hält höchstens die zehn neuesten Sicherungen.
- Eine Wiederherstellung sichert ihrerseits zuerst den abgelösten Stand, damit
  ein Rückweg erhalten bleibt.
- Safety-Sicherungen liegen im aktiven App-Dokument und ersetzen kein externes
  Backup.

### F-SAF-03 – Verschlüsselte Backup-Datei

- Der vollständige Zustand kann manuell als passwortgeschützte Datei exportiert
  und auf Desktop oder Mobil wiederhergestellt werden.
- PBKDF2-HMAC-SHA-256 mit 600.000 Iterationen leitet den Schlüssel ab;
  AES-256-GCM verschlüsselt und authentifiziert den Inhalt.
- Salt und Nonce sind zufällig. Passphrase und Klartext werden nicht in der
  Datei gespeichert.
- Falsche Passphrasen, Manipulationen, unbekannte Formate und ungültige
  App-Daten werden vor einer Mutation abgewiesen.
- Eine verlorene Passphrase kann nicht zurückgesetzt werden.

### F-SAF-04 – Web-Härtung

- Eine restriktive Content Security Policy erlaubt Skripte nur aus der App und
  von Google Identity Services; Inline-Handler und `eval` bleiben gesperrt.
- Texte aus CSV und JSON werden vor HTML-Ausgabe escaped.
- OAuth-Token und Passphrasen werden nicht dauerhaft gespeichert.
- Echte Finanzdaten, Broker-Exporte und Laufzeit-JSON sind von Git
  auszuschließen.

## PWA, Mobilgerät und Offline-Betrieb

### F-PWA-01 – Installierbare App-Hülle

- Manifest, Icons, Theme-Farbe und Service Worker machen die Anwendung als PWA
  installierbar.
- Desktop-Navigation und mobile Bottom-Bar führen zu denselben fünf
  Hauptbereichen.
- Touchziele, Safe Areas, Fokusmarkierung, beschriftete Dialoge und
  Tastaturnavigation sind berücksichtigt.

### F-PWA-02 – Versionierter Offline-Cache

- Der Service Worker lädt HTML, CSS, alle lokalen ES-Module, Manifest und Icons
  als versionierte App-Shell vor.
- Navigation fällt offline auf die gecachte `index.html` zurück.
- Lokale Module werden Cache-first geladen; neue Releases aktivieren einen
  neuen Cache.
- Ein unabhängiger Starter kann veraltete App-Shell-Caches mit falschem
  JavaScript-MIME-Typ reparieren, ohne IndexedDB oder Nutzerdaten zu löschen.
- Google-Anmeldung, Google Drive und externe Google Fonts sind bewusst nicht
  Teil des Offline-Caches.

## Bewusste Grenzen

- Der Importer unterstützt den bekannten Scalable-Capital-CSV-Vertrag, keinen
  universellen Brokerstandard.
- Es gibt keine Live-Kurse, keine Orderausführung und keine Verbindung zu einem
  Brokerkonto.
- Offene Positionen besitzen deshalb kein laufendes unrealisiertes P&L.
- Die App ist ein persönliches Trading-Journal und keine Steuer-, Rechts- oder
  Anlageberatung.
- Rendite- und Invis-Prozente verwenden ein manuell hinterlegtes, festes
  Startkapital; sie sind keine zeitgewichtete oder kapitalgewichtete
  Portfolioperformance.
- Zwischen lokalem Stand und Google Drive gibt es keinen automatischen Merge.
- Ohne Google existiert kein automatischer Sync zwischen Geräten. Die
  verschlüsselte Backup-Datei ist ein manueller Transportweg.
- Google Drive funktioniert nicht offline; der lokale Gerätemodus schon, wenn
  die App-Shell bereits verfügbar ist.
- Mehrere lokale Tabs erkennen gegenseitige Änderungen derzeit nicht.
- Safety-Sicherungen im App-Dokument schützen nicht vor Verlust des gesamten
  Browsers, Geräts oder Drive-Kontos.
