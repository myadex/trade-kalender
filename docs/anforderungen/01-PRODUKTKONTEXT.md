# Produktkontext

## Ausgangslage

Privates Trading erzeugt Brokerbuchungen, manuelle Korrekturen, offene
Positionen und viele einzelne Ergebniswerte. Der Trade Kalender verdichtet
diese Informationen zu einem persönlichen, nachvollziehbaren Journal für
realisierte DAX-Derivatetrades.

## Beteiligte Rollen

- **Trader:** erfasst, importiert, prüft und analysiert die eigenen Trades.
- **Datenlieferant:** stellt Brokerbuchungen in einem definierten Exportformat bereit.
- **Speicherdienst:** bewahrt auf Wunsch den gewählten Datenstand geräteübergreifend auf.
- **Entwickler oder Tester:** prüft fachliche Regeln gegen synthetische Referenzwerte.

## ZIEL-01 – Persönliches Trading-Journal

**Muss:** Das Produkt muss realisierte Trades und offene Positionen eines
einzelnen Nutzers nachvollziehbar verwalten und auswerten.

**Akzeptanzkriterien:**

- Geschlossene Trades sind einzeln und aggregiert einsehbar.
- Offene Positionen sind vom realisierten Ergebnis getrennt.
- Jede Ergebnisansicht basiert auf demselben fachlichen Datenstand.

## ZIEL-02 – Eigenständige Nutzung

**Muss:** Das Produkt muss ohne verpflichtenden zentralen Anwendungsserver
nutzbar sein und dem Nutzer die Wahl des Speicherorts überlassen.

**Akzeptanzkriterien:**

- Ein lokaler Betrieb ohne Konto bei einem Speicherdienst ist möglich.
- Alternativ kann ein unterstützter Cloud-Speicher verwendet werden.
- Die Wahl ist sichtbar und später kontrolliert änderbar.

## ZIEL-03 – Nachvollziehbare Ergebnisse

**Muss:** Das Produkt muss Ergebnis, Steuer, offene Stücke und statistische
Kennzahlen aus dokumentierten Regeln reproduzierbar ableiten.

**Akzeptanzkriterien:**

- Derselbe Eingabedatenbestand erzeugt denselben fachlichen Zustand.
- Fehlende oder ungültige Daten führen nicht zu erfundenen Kennzahlen.
- Berechnungsgrenzen werden in der Oberfläche kenntlich gemacht.

## ZIEL-04 – Desktop- und Mobilnutzung

**Muss:** Das Produkt muss als Webanwendung auf Desktop und Smartphone
bedienbar und installierbar sein.

**Akzeptanzkriterien:**

- Die Hauptfunktionen sind in beiden Formfaktoren erreichbar.
- Navigation und Dialoge passen sich an kleine Bildschirme an.
- Eine installierte Anwendung verwendet denselben Datenbestand und Funktionsumfang.

## ZIEL-05 – Schutz privater Finanzdaten

**Muss:** Das Produkt muss private Finanzdaten sparsam verarbeiten und
versehentliche Offenlegung oder Überschreibung erschweren.

**Akzeptanzkriterien:**

- Es werden nur für die Funktion erforderliche Daten übertragen.
- Schreibende und destruktive Aktionen sind erkennbar und abgesichert.
- Sichtschutz, Sicherungen und verschlüsselte externe Backups stehen zur Verfügung.

## Produktumfang

Zum Umfang gehören Import, manuelle Erfassung, Bearbeitung, offene Positionen,
Kalender, Wochen- und Monatsreview, Statistik, Suche, lokaler oder
geräteübergreifender Speicher, Sicherungen und ein Nur-Ansehen-Modus.

Nicht zum Umfang gehören Orderausführung, Live-Kurse, Brokerkontozugriff,
automatische Steuererklärung, Anlageberatung oder ein allgemeiner
Mehrbroker-Standard. Offene Positionen besitzen ohne Marktpreise kein
unrealisiertes Live-Ergebnis.

## Glossar

| Begriff | Bedeutung |
|---|---|
| Trade | Vollständig geschlossene Position oder Teilposition mit realisiertem Ergebnis |
| Offenes Lot | Noch nicht durch einen Verkauf verbrauchter Kaufbestand |
| Brokerzeile | Unveränderte Buchungszeile aus einem Brokerexport |
| Netto-P&L | Verkauf minus Einstand minus Steuer; Erstattungen tragen ein negatives Steuervorzeichen |
| Startkapital | Manuell hinterlegte feste Bezugsgröße für Rendite und diskrete Prozentwerte |
| Safety-Sicherung | Interner Snapshot vor einer riskanten Änderung |
| Invis-Modus | Sitzungweiter Nur-Ansehen-Modus mit diskreter Anzeige |
