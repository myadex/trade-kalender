# Benutzeroberfläche und Interaktion

## Informationsarchitektur

Die Oberfläche besteht aus einem kompakten Ergebnis-Header, einer
Aktionsleiste und fünf Hauptbereichen: Kalender, Woche, Monat, Offene
Positionen und Statistik. Dieselben Bereiche müssen auf Desktop und Smartphone
erreichbar sein.

## UI-01 – Start- und Speicherauswahl

**Muss:** Beim ersten Start muss der Nutzer zwischen lokalem Gerätespeicher und
Google Drive wählen können.

**Akzeptanzkriterien:**

- Beide Optionen werden gleichwertig und verständlich erklärt.
- Die Cloud-Option ist erst aktiv, wenn die Anmeldung bereit ist.
- Risiken des ausschließlich lokalen Stands sind sichtbar.
- Fehler werden im sichtbaren Startbereich angekündigt.

## UI-02 – Ergebnis-Header

**Muss:** Der feste Ergebnis-Header muss ausschließlich realisiertes
Gesamt-P&L, abgeführte Steuern und Rendite zeigen.

**Akzeptanzkriterien:**

- Die drei Werte besitzen eine gemeinsame visuelle Achse.
- Weiterführende Kennzahlen überladen den Header nicht.
- Das Startkapital ist über die Rendite erreichbar, solange Schreiben erlaubt ist.
- Das Layout bleibt auf kleinen Bildschirmen kompakt.

## UI-03 – Kalender

**Muss:** Der Kalender muss realisierte Ergebnisse nach Handelstag in einer
Monatsansicht darstellen.

**Akzeptanzkriterien:**

- Montag bis Freitag werden als Handelstage gezeigt.
- Datum, Tagesergebnis und Trade-Anzahl sind erkennbar.
- Vorheriger und nächster Monat sind erreichbar.
- Ein Tag öffnet die zugehörigen Trades.

## UI-04 – Wochenansicht

**Muss:** Die Wochenansicht muss ISO-Kalenderwochen mit Zeitraum, P&L, Umsatz,
Trade-Anzahl und Verlauf darstellen.

**Akzeptanzkriterien:**

- Das Label enthält Kalenderwoche, ISO-Wochenjahr sowie Montag bis Sonntag.
- Die neueste vorhandene Woche steht zuerst.
- Ein auswählbares Review zeigt Ergebnis, Steuer, Winrate, Muster und Verlusttreiber.
- Nicht belastbare Muster werden als solche gekennzeichnet.

## UI-05 – Monatsansicht

**Muss:** Die Monatsansicht muss P&L, Umsatz und Trade-Anzahl je Kalendermonat
tabellarisch und grafisch verdichten.

**Akzeptanzkriterien:**

- Monate sind chronologisch verständlich beschriftet.
- Ein auswählbares Review zeigt dieselben fachlichen Kategorien wie das Wochenreview.
- Tabelle, Grafik und Review verwenden denselben Datenbestand.

## UI-06 – Offene Positionen

**Muss:** Der Bereich Offene Positionen muss sichtbare Positionen und bewusst
entfernte Positionen getrennt darstellen.

**Akzeptanzkriterien:**

- Einstand und Stückzahl sind je sichtbarer Position erkennbar.
- Schließen und Entfernen sind eindeutig unterschiedliche Aktionen.
- Entfernte Positionen können wieder angezeigt werden.
- Im Nur-Ansehen-Modus fehlen alle verändernden Aktionen.

## UI-07 – Statistik

**Muss:** Der Statistikbereich muss umfangreiche Auswertungen in die vier
Unterbereiche Kennzahlen, Performance, Timing und Verhalten gliedern.

**Akzeptanzkriterien:**

- Kennzahlen ist der kompakte Standardbereich.
- Equity und Drawdown liegen unter Performance.
- Wochentage, Handelsphasen und Stunden liegen unter Timing.
- Overnight und Disziplin liegen unter Verhalten.
- Die Unternavigation ist per Tastatur und horizontal auf kleinen Displays bedienbar.

## UI-08 – Trades suchen

**Muss:** Eine rein lesende Suche muss geschlossene Trades nach Produkt oder
Identifikation, Ausstiegszeitraum, Richtung, Ergebnis und Haltedauer filtern.

**Akzeptanzkriterien:**

- Filter sind kombinierbar und vollständig zurücksetzbar.
- Trefferzahl und zusammengefasstes Netto-P&L werden angezeigt.
- Unbekannte Haltedauer bleibt sichtbar filterbar.
- Ein Treffer kann den betreffenden Kalendertag öffnen.

## UI-09 – Dialoge und Rückmeldungen

**Muss:** Erfassung, Bearbeitung, Import, Schließen, Sicherungen und
Speicherwechsel müssen als klar abgegrenzte Dialogabläufe erscheinen.

**Akzeptanzkriterien:**

- Jeder Dialog besitzt einen Titel, eine primäre Aktion und einen sicheren Abbruch.
- Fokus wird beim Öffnen in den Dialog gesetzt und beim Schließen zurückgegeben.
- Laufende kritische Aktionen verhindern Doppelbetätigung und vorzeitiges Schließen.
- Status-, Fehler- und Ergebnisänderungen werden wahrnehmbar angekündigt.

## UI-10 – Invis-Bedienung

**Muss:** Der Invis-Modus muss über einen dezenten Sitzungsschalter im Header
aktivierbar sein und die Anwendung vollständig in einen Nur-Ansehen-Zustand versetzen.

**Akzeptanzkriterien:**

- Der aktive Zustand ist sichtbar beschriftet.
- Offene Bearbeitungsdialoge schließen beim Aktivieren.
- Schreib-, Export-, Backup-, Restore- und Speicherwechselaktionen sind gesperrt.
- Navigation, Suche, Filter und Detailansichten bleiben verfügbar.
- Das Entsperren verlangt eine Bestätigung.

## UI-11 – Aktionszugang auf Mobilgeräten

**Muss:** Alle relevanten Haupt- und Verwaltungsaktionen müssen auch auf einem
kleinen Touchscreen erreichbar sein.

**Akzeptanzkriterien:**

- Die untere Navigation führt zu allen fünf Hauptbereichen.
- Ein separates Aktionsmenü enthält Erfassung, Import, Export und Sicherungen.
- Menüs bleiben bei geringer Höhe scrollbar.
- Bedienelemente berücksichtigen sichere Bildschirmränder und fingerfreundliche Ziele.

## UI-12 – Verlauf des eingesetzten Kapitals

**Muss:** Der Performance-Bereich muss den zeitlichen Verlauf des gleichzeitig
eingesetzten Kapitals direkt mit Equity und Drawdown vergleichbar darstellen.

**Akzeptanzkriterien:**

- Ein gemeinsames responsives Diagramm zeigt Equity und täglichen
  Kapitaleinsatz auf derselben Kalender- und Werteskala.
- Eine dezente Legende unterscheidet beide Verläufe eindeutig. Ihre
  Datenqualitätsdetails sind per Maus, Tastatur und Touch einsehbar, ohne das
  Diagramm dauerhaft mit technischem Text zu belasten.
- Für den Kapitaleinsatz existieren weder ein zweites Diagramm noch eigene
  Zusammenfassungskarten.
- Die Zeitachse beginnt am selben ersten Historientag wie Equity und Drawdown.
- Beginn des exakten Import-Ledgers, davor geschätzte Alt-Trades, fehlende
  Einstiegsdaten, Equity-Begrenzungen und ausgeschlossene Fehlerdaten sind
  direkt bei der Auswertung verständlich erläutert.
- Im Invis-Modus verwendet die gemeinsame Werteskala ausschließlich Anteile am
  festen Startkapital und zeigt keine konkreten Geldbeträge.
- Die Ansicht bleibt auf Desktop und kleinen Touchscreens ohne zusätzliche
  Hauptnavigation nutzbar.
