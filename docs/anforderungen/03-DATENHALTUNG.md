# Datenhaltung und Konsistenz

## Fachlicher Datenbestand

Unabhängig vom gewählten Speicherort existiert genau ein kanonischer
Datenbestand. Die Begriffe kanonischer Datenbestand, lokaler Gerätespeicher und
Cloud-Speicher bezeichnen dabei fachlichen Vertrag und mögliche Ablageorte. Der
Bestand umfasst geschlossene Trades, offene Lots, festes Startkapital,
Brokerzeilen, die Ausgangsbasis des Import-Ledgers, ausgeblendete Positionen
und interne Sicherungen.

## DH-01 – Kanonischer Datenbestand

**Muss:** Das Produkt muss in jedem Speichermodus denselben fachlichen Vertrag
verwenden.

**Akzeptanzkriterien:**

- Ein Wechsel des Speicherorts verändert keine fachlichen Werte.
- Alle Pflichtbereiche werden beim Laden normalisiert.
- Fehlende optionale Bereiche älterer Stände erhalten sichere Standardwerte.

## DH-02 – Lokaler Gerätespeicher

**Muss:** Das Produkt muss den vollständigen Zustand dauerhaft im aktuellen
Browserprofil dieses Geräts speichern können.

**Akzeptanzkriterien:**

- Ein erneuter Start im selben Profil lädt den zuletzt bestätigten Stand.
- Der lokale Modus benötigt nach geladener Anwendung keine Anmeldung.
- Der Nutzer wird darauf hingewiesen, dass Browserlöschung oder Geräteverlust
  diesen Stand entfernen können.

## DH-03 – Cloud-Speicher

**Muss:** Das Produkt muss den vollständigen Zustand alternativ als eine vom
Nutzer autorisierte Datei in Google Drive speichern können.

**Akzeptanzkriterien:**

- Laden und Speichern verwenden denselben kanonischen Vertrag wie der lokale Modus.
- Ungültiger Inhalt wird nicht als leerer Stand interpretiert.
- Nach erfolgreichem Speichern ist die neue entfernte Version bekannt.

## DH-04 – Eindeutiger aktiver Speichermodus

**Muss:** Zu jedem Zeitpunkt muss genau ein Speicherort als führend gelten.

**Akzeptanzkriterien:**

- Die Oberfläche zeigt den aktiven Modus sichtbar an.
- Schreibvorgänge gehen ausschließlich an den aktiven Speicherort.
- Abmelden vom Cloud-Speicher erzeugt nicht still einen zweiten führenden Stand.

## DH-05 – Kontrollierter Speicherwechsel

**Muss:** Beim späteren Verbinden eines lokalen Stands mit Google Drive muss
der Nutzer genau einen führenden Stand auswählen.

**Akzeptanzkriterien:**

- Lokaler und entfernter Stand werden zunächst nur gelesen und verglichen.
- Trade-Anzahl, Zeitraum, Netto-P&L, offene Positionen und letzte Sicherung sind sichtbar.
- Es gibt **keinen automatischen Merge**.
- Der ersetzte Stand wird im Zielbestand als Safety-Sicherung bewahrt.

## DH-06 – Konflikterkennung

**Muss:** Das Produkt muss einen Konflikt erkennen, wenn der Cloud-Stand seit
dem letzten Laden von einem anderen Gerät oder Tab verändert wurde.

**Akzeptanzkriterien:**

- Eine veraltete Schreiboperation überschreibt den neueren Stand nicht.
- Nach einem Konflikt wird der neueste entfernte Stand geladen.
- Die verworfene Nutzeraktion wird nicht automatisch erneut ausgeführt.

## DH-07 – Serialisierte Schreibvorgänge

**Muss:** Mehrere schnell aufeinanderfolgende Änderungen müssen in ihrer
fachlichen Reihenfolge gespeichert werden.

**Akzeptanzkriterien:**

- Jeder Schreibauftrag verwendet einen vollständigen Snapshot seiner Änderung.
- Ein langsamer älterer Vorgang kann keinen neueren lokalen Zustand überschreiben.
- Fehler werden dem auslösenden Vorgang zugeordnet.

## DH-08 – Interne Safety-Sicherungen

**Muss:** Vor riskanten Datenänderungen muss der bisherige fachliche Zustand
automatisch als Snapshot gesichert werden.

**Akzeptanzkriterien:**

- Import, Wiederherstellung, Reset und Speicherersetzung erzeugen vorab einen Snapshot.
- Höchstens die zehn neuesten Sicherungen werden gehalten.
- Eine Wiederherstellung sichert zuerst den abgelösten Stand.
- Sicherungen enthalten sich nicht rekursiv.

## DH-09 – Abwärtskompatibilität

**Muss:** Ältere gültige Datenstände ohne später ergänzte optionale Bereiche
müssen weiterhin sicher geladen werden können.

**Akzeptanzkriterien:**

- Fehlende optionale Daten führen zu ehrlichen Einschränkungen statt falschen Werten.
- Bestehende Trades und offene Lots bleiben unverändert interpretierbar.
- Eine Erweiterung erzwingt keinen Verlust historischer Daten.

## Lebenszyklus

Eingaben werden validiert, auf den kanonischen Vertrag abgebildet, fachlich
berechnet und erst danach atomar im aktiven Speicherort gesichert. Ansichten
und Statistiken sind Projektionen dieses Zustands und keine zweite Datenquelle.
