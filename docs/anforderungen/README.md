# Anforderungsanalyse – Trade Kalender

Diese Dokumentation beschreibt das Produkt **programmiersprachenunabhängig**.
Sie legt fest, welchen Nutzen die Anwendung bietet, welche Daten sie verarbeitet,
welche fachlichen Regeln gelten und welches Verhalten Nutzer erwarten dürfen.
Damit kann dieselbe Analyse als Grundlage für die bestehende Umsetzung, eine
Neuimplementierung oder eine fachliche Abnahme dienen.

## Aufbau nach Anforderungsbereichen

1. [Produktkontext](01-PRODUKTKONTEXT.md) – Ziele, Nutzer, Umfang und Grenzen
2. [Datenquellen](02-DATENQUELLEN.md) – eingehende und ausgehende Daten
3. [Datenhaltung](03-DATENHALTUNG.md) – fachlicher Zustand, Speicherorte und Konsistenz
4. [Fachlogik](04-FACHLOGIK.md) – FIFO, Ergebnisrechnung und Auswertungen
5. [Benutzeroberfläche](05-BENUTZEROBERFLAECHE.md) – Informationsarchitektur und Bedienung
6. [Sicherheit](06-SICHERHEIT.md) – Schutzbedarf, Zugriff und Wiederherstellung
7. [Qualitätsanforderungen](07-QUALITAETSANFORDERUNGEN.md) – Zuverlässigkeit, Offline und Barrierefreiheit
8. [Anwendungsfälle](08-ANWENDUNGSFAELLE.md) – vollständige fachliche Abläufe

## Schreibweise

Jede Anforderung besitzt eine eindeutige ID, eine verbindliche Muss-Aussage und
Akzeptanzkriterien. Die Präfixe kennzeichnen ihren Bereich:

| Präfix | Bereich |
|---|---|
| `ZIEL` | Produktkontext und Ziele |
| `DQ` | Datenquellen und Schnittstellen |
| `DH` | Datenhaltung und Konsistenz |
| `FL` | Fachlogik und Berechnungen |
| `UI` | Benutzeroberfläche und Interaktion |
| `SEC` | Sicherheit und Datenschutz |
| `QA` | Nichtfunktionale Qualitätsanforderungen |
| `AF` | Anwendungsfälle |

Die Formulierung beschreibt beobachtbares Produktverhalten. Konkrete
Dateinamen, Klassen, Funktionen oder Programmiersprachen gehören nicht in
diese Ebene.

## Dokumentationsebenen im Projekt

| Ebene | Zweck | Führender Ort |
|---|---|---|
| Produktanforderungen | Was das Produkt leisten muss | dieser Ordner |
| Technische Umsetzung | Wie die aktuelle Referenzimplementierung arbeitet | [Architektur](../ARCHITECTURE.md) und [Datenmodell](../DATA_MODEL.md) |
| Bedien- und Entwicklungsstart | Wie das Projekt gestartet wird | [Projekt-README](../../README.md) |
| Sicherheit der Umsetzung | Konkrete Schutzmaßnahmen und Meldeweg | [Security-Leitfaden](../../SECURITY.md) |
| Tests | Ausführbare Verträge und fachliche Handwerte | [Test-Harness](../../test/README.md) |
| Backlog | Noch nicht umgesetzte oder verworfene Arbeit | [Backlog](../../BACKLOG.md) |
| Changelog | Änderungen zwischen veröffentlichten Ständen | bei formalen Releases als eigene Datei zu ergänzen |

Der aktuelle Produktumfang wird **nicht aus dem Backlog** abgeleitet. Der
Backlog darf Ideen und verworfene Varianten enthalten; Anforderungen beschreiben
nur den vereinbarten und ausgelieferten Sollzustand.

## Pflegeprozess

Bei jeder fachlich sichtbaren Änderung werden die betroffenen Anforderungen
und Anwendungsfälle zusammen mit den Tests angepasst. Änderungen an Speicher-
oder Sicherheitsverträgen aktualisieren zusätzlich die technischen Dokumente.
Eine reine technische Umstrukturierung verändert diese Analyse nur dann, wenn
sich beobachtbares Produktverhalten ändert.

## Definition of Done

Eine Produktänderung ist dokumentarisch abgeschlossen, wenn:

- Muss-Aussage und Akzeptanzkriterien den tatsächlichen Sollzustand beschreiben,
- betroffene Datenquellen, Fachregeln, UI- und Qualitätsfolgen berücksichtigt sind,
- mindestens ein vollständiger Anwendungsfall weiterhin stimmt,
- neue technische Details ausschließlich in der Umsetzungsebene stehen,
- offene Folgeideen im Backlog statt in den Anforderungen stehen,
- alle Verweise und automatischen Tests erfolgreich geprüft sind,
- keine realen Finanzdaten, Zugangsdaten oder Passphrasen dokumentiert wurden.
