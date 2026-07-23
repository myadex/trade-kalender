# Anwendungsfälle

Die Anwendungsfälle verbinden mehrere Einzelanforderungen zu beobachtbaren
End-to-End-Abläufen. Akteur ist jeweils der Trader.

## AF-01 – Lokal starten

**Vorbedingung:** Für das aktuelle Browserprofil ist noch kein Speichermodus gewählt.

**Standardablauf:**

1. Der Nutzer öffnet die Anwendung.
2. Er wählt **Nur auf diesem Gerät**.
3. Die Anwendung lädt einen vorhandenen lokalen Stand oder beginnt leer.
4. Der aktive lokale Speichermodus wird angezeigt.

**Ergebnis:** Der Datenstand wird ausschließlich im lokalen Gerätespeicher geführt.

**Akzeptanzkriterien:**

- Keine Cloud-Anmeldung ist erforderlich.
- Nach geladener Anwendung ist der lokale Betrieb offline möglich.
- Das Verlustrisiko durch Browser- oder Geräteverlust wird erklärt.

## AF-02 – Mit Google Drive starten

**Vorbedingung:** Eine Netzwerkverbindung besteht und die Cloud-Anmeldung ist bereit.

**Standardablauf:**

1. Der Nutzer wählt **Mit Google Drive starten**.
2. Er autorisiert den begrenzten Dateizugriff.
3. Die Anwendung lädt die verwaltete Datei oder bereitet einen neuen Stand vor.
4. Der Cloud-Speichermodus wird angezeigt.

**Ergebnis:** Folgende bestätigte Änderungen werden konfliktgeschützt in Google Drive gespeichert.

**Akzeptanzkriterien:**

- Mehrfachbetätigung startet keine parallelen Anmeldungen.
- Abbruch oder Blockierung gibt die Anmeldung wieder frei.
- Ein ungültiger Cloud-Inhalt wird nicht als leerer Bestand übernommen.

## AF-03 – Brokerexport importieren

**Vorbedingung:** Ein unterstützter CSV-Brokerexport liegt außerhalb des Projekts vor.

**Standardablauf:**

1. Der Nutzer öffnet den Import und wählt die Datei.
2. Die Anwendung validiert Struktur, Zeilen und fachliche Verkäufe.
3. Eine Vorschau zeigt neue Zeilen, Duplikate, Trades, offene Positionen,
   P&L- und Steueränderung.
4. Der Nutzer bestätigt die Vorschau.
5. Vor der Übernahme entsteht eine Safety-Sicherung.

**Alternative:** Bei historischer Überschneidung des ersten Ledger-Imports wird
die Übernahme blockiert und ein sicherer zeitlicher Schnitt erklärt.

**Ergebnis:** Ausschließlich unbekannte Brokerzeilen werden ergänzt und per FIFO ausgewertet.

**Akzeptanzkriterien:**

- Ein Re-Import erzeugt keine doppelten Trades.
- Fehlerhafte Dateien verändern den aktiven Stand nicht.
- Der Kontrollbericht bleibt nach erfolgreicher Speicherung sichtbar.

## AF-04 – Trade manuell erfassen

**Vorbedingung:** Der Invis-Modus ist deaktiviert.

**Standardablauf:**

1. Der Nutzer öffnet **Trade hinzufügen**.
2. Er erfasst Pflichtwerte und optionale Metadaten.
3. Die Anwendung zeigt das erwartete Netto-P&L.
4. Der Nutzer speichert den Trade.

**Ergebnis:** Der Trade erscheint am Ausstiegstag in Kalender, Aggregationen,
Suche und Statistik.

**Akzeptanzkriterien:**

- Ungültige Pflichtwerte verhindern das Speichern.
- Das Steuervorzeichen bleibt erhalten.
- Der gespeicherte Wert entspricht der Vorschau.

## AF-05 – Bestehenden Trade korrigieren

**Vorbedingung:** Ein geschlossener Trade ist vorhanden und Schreiben ist erlaubt.

**Standardablauf:**

1. Der Nutzer öffnet einen Kalendertag oder ein Suchergebnis.
2. Er wählt den Trade und bearbeitet die zulässigen Felder.
3. Die Anwendung zeigt das neue Ergebnis.
4. Der Nutzer bestätigt die Korrektur.

**Alternative:** Bei einem importierten Trade wird die Verkaufsbuchung geändert
und anschließend das vollständige Ledger neu ausgewertet.

**Ergebnis:** Alle abhängigen Ansichten zeigen konsistent den korrigierten Stand.

**Akzeptanzkriterien:**

- Der FIFO-Einstand importierter Trades bleibt aus Käufen abgeleitet.
- Fachlich unmögliche Verkäufe werden abgelehnt.
- Eine Korrektur erzeugt keine doppelte Rohbuchung.

## AF-06 – Offene Position schließen oder ausblenden

**Vorbedingung:** Mindestens eine sichtbare offene Position ist vorhanden.

**Standardablauf Schließen:**

1. Der Nutzer öffnet **Offene Positionen** und wählt **Schließen**.
2. Er prüft Verkauf, Zeitpunkt und Steuer oder wählt Totalverlust.
3. Er bestätigt den Vorgang.

**Alternativablauf Ausblenden:**

1. Der Nutzer wählt **Position entfernen** und bestätigt.
2. Die Position wechselt zu **Entfernte Positionen**.
3. Mit **Wieder anzeigen** kann er den Ausschluss zurücknehmen.

**Ergebnis:** Schließen realisiert ein Ergebnis; Ausblenden verändert weder
Brokerhistorie noch FIFO.

**Akzeptanzkriterien:**

- Beide Aktionen sind eindeutig unterscheidbar.
- Ein späterer Kauf derselben Identifikation bleibt nach Ausblenden sichtbar.
- Der Vorgang ist im Invis-Modus nicht verfügbar.

## AF-07 – Kalender und Auswertungen prüfen

**Vorbedingung:** Mindestens ein geschlossener Trade ist vorhanden.

**Standardablauf:**

1. Der Nutzer prüft Tageswerte im Kalender.
2. Er öffnet Wochen- und Monatsreview für eine gewählte Periode.
3. Er wechselt in der Statistik zwischen Kennzahlen, Performance, Timing und Verhalten.
4. Er begrenzt Kennzahlen bei Bedarf auf einen Ausstiegszeitraum.

**Ergebnis:** Alle Sichten erklären denselben realisierten Datenbestand aus
unterschiedlichen fachlichen Perspektiven.

**Akzeptanzkriterien:**

- Wochen verwenden ISO 8601.
- Offene Positionen verändern keine realisierte Equity.
- Fehlende Daten und kleine Stichproben werden sichtbar begrenzt.

## AF-08 – Trades suchen

**Vorbedingung:** Geschlossene Trades sind vorhanden.

**Standardablauf:**

1. Der Nutzer öffnet **Trades suchen**.
2. Er kombiniert Text-, Zeitraum-, Richtungs-, Ergebnis- und Haltedauerfilter.
3. Er prüft Trefferzahl und zusammengefasstes Netto-P&L.
4. Optional öffnet er den zugehörigen Kalendertag.

**Ergebnis:** Der aktive Datenstand bleibt unverändert.

**Akzeptanzkriterien:**

- Alle Filter lassen sich gemeinsam anwenden und zurücksetzen.
- Produkt und Identifikation werden ohne Beachtung der Großschreibung gefunden.
- Ein ungültiger Zeitraum wird erklärt und nicht still umgedeutet.

## AF-09 – Invis-Modus verwenden

**Vorbedingung:** Die Anwendung ist geladen.

**Standardablauf:**

1. Der Nutzer aktiviert **Invis** im Header.
2. Offene Bearbeitungsdialoge schließen.
3. Er navigiert, sucht und betrachtet die diskreten Ansichten.
4. Zum Ändern beendet er den Modus und bestätigt die Entsperrung.

**Ergebnis:** Geldwerte erscheinen als Anteil am festen Startkapital und alle
Mutationen bleiben bis zum bestätigten Entsperren blockiert.

**Akzeptanzkriterien:**

- Identifikationen und Stückzahlen sind maskiert.
- Schreib-, Export-, Backup- und Speicheraktionen sind nicht verfügbar.
- Ein Neustart beginnt wieder in der normalen Ansicht.

## AF-10 – Verschlüsseltes Backup wiederherstellen

**Vorbedingung:** Eine gültige verschlüsselte Backup-Datei und ihre Passphrase liegen vor.

**Standardablauf:**

1. Der Nutzer öffnet die Backup-Funktion und wählt die Datei.
2. Er gibt die Passphrase ein.
3. Die Anwendung entschlüsselt, authentifiziert und validiert den Inhalt.
4. Vor der Übernahme sichert sie den aktuellen Stand.
5. Der Backup-Stand wird aktiv gespeichert.

**Ergebnis:** Der vollständige gesicherte Zustand ist wiederhergestellt und der
vorherige Stand bleibt als Rückweg vorhanden.

**Akzeptanzkriterien:**

- Falsche Passphrase oder Manipulation verändert keine Daten.
- Unbekannte Formatversionen werden abgelehnt.
- Während der Verarbeitung ist keine zweite Aktion möglich.

## AF-11 – Lokalen Stand mit Google Drive verbinden

**Vorbedingung:** Die Anwendung läuft lokal, eine Netzwerkverbindung besteht
und der Invis-Modus ist deaktiviert.

**Standardablauf:**

1. Der Nutzer wählt **Mit Google Drive verbinden** und autorisiert den Zugriff.
2. Die Anwendung liest lokalen und entfernten Stand ohne Mutation.
3. Der Vergleich zeigt die wichtigsten fachlichen Kennzahlen beider Seiten.
4. Der Nutzer wählt lokalen Stand übertragen, Cloud-Stand verwenden oder Abbruch.
5. Der gewählte Stand wird konfliktgeschützt gespeichert.

**Ergebnis:** Google Drive ist der einzige aktive Speicherort; der ersetzte
Stand liegt darin als Safety-Sicherung.

**Akzeptanzkriterien:**

- Ohne ausdrückliche Auswahl wird kein Stand ersetzt.
- Es erfolgt kein automatisches Zusammenführen.
- Ein Cloud-Konflikt überschreibt keine fremde Änderung.

## AF-12 – Safety-Sicherung wiederherstellen

**Vorbedingung:** Mindestens eine interne Sicherung ist vorhanden.

**Standardablauf:**

1. Der Nutzer öffnet **Sicherungen**.
2. Er prüft Grund und Zeitpunkt eines Snapshots.
3. Er bestätigt die Wiederherstellung.
4. Die Anwendung sichert zuerst den aktuellen Stand und aktiviert dann den Snapshot.

**Ergebnis:** Der gewählte frühere Zustand ist aktiv und die gerade abgelöste
Version bleibt als neuer Rückweg erhalten.

**Akzeptanzkriterien:**

- Eine unbekannte Sicherung verändert nichts.
- Der Verlauf bleibt auf höchstens zehn Einträge begrenzt.
- Der wiederhergestellte Zustand wird im aktiven Speichermodus persistiert.
