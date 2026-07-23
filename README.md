# Trade Kalender

Persönliches Trading-Journal für realisierte DAX-Derivatetrades. Die Anwendung
importiert Brokerbuchungen oder erfasst Trades manuell, verwaltet offene
Positionen und wertet Ergebnisse in Kalender, Reviews und Statistiken aus.

Die fachliche Beschreibung ist bewusst von der Programmiersprache getrennt.
Sie kann deshalb als Grundlage für die bestehende Webanwendung oder eine
spätere alternative Implementierung dienen.

## Anforderungsanalyse

Die vollständigen Produktanforderungen stehen unter
[docs/anforderungen](docs/anforderungen/README.md):

- [Produktkontext](docs/anforderungen/01-PRODUKTKONTEXT.md)
- [Datenquellen](docs/anforderungen/02-DATENQUELLEN.md)
- [Datenhaltung](docs/anforderungen/03-DATENHALTUNG.md)
- [Fachlogik](docs/anforderungen/04-FACHLOGIK.md)
- [Benutzeroberfläche](docs/anforderungen/05-BENUTZEROBERFLAECHE.md)
- [Sicherheit](docs/anforderungen/06-SICHERHEIT.md)
- [Qualitätsanforderungen](docs/anforderungen/07-QUALITAETSANFORDERUNGEN.md)
- [Anwendungsfälle](docs/anforderungen/08-ANWENDUNGSFAELLE.md)

Diese Dokumente legen fest, **was** das Produkt leisten muss. Sie enthalten
keine Klassen-, Modul- oder Frameworkvorgaben.

## Schnellstart

Die aktuelle Referenzimplementierung benötigt Node.js 24 oder neuer. Im
Projekt-Root:

```powershell
npm ci
npm test
python -m http.server 5500 --bind 127.0.0.1
```

Danach die App unter `http://127.0.0.1:5500/index.html` öffnen. Für die lokale
Entwicklung ist keine Google-Anmeldung notwendig: **Nur auf diesem Gerät**
verwendet den dauerhaften Speicher des aktuellen Browserprofils. **Mit Google
Drive starten** benötigt eine Onlineverbindung und ein für die konfigurierte
OAuth-Client-ID freigeschaltetes Google-Konto.

VS Code Live Server kann alternativ verwendet werden. Sein injiziertes
Live-Reload-Skript wird von der strengen Content Security Policy absichtlich
blockiert; das betrifft nur Live-Reload, nicht die App.

## Aktuelle technische Referenzimplementierung

Die ausgelieferte Anwendung ist eine installierbare PWA aus nativen
ES-Modulen ohne Framework und ohne Build-Schritt. Fachberechnungen und
Validierung sind von Oberfläche, Netzwerk und Persistenz getrennt. Der
vollständige Zustand liegt wahlweise im Browserprofil oder als verwaltete Datei
in Google Drive. Eine versionierte App-Shell ermöglicht den Offline-Start des
lokalen Modus.

Diese technischen Entscheidungen beschreiben die aktuelle Umsetzung, nicht die
fachlichen Produktanforderungen. Eine andere Umsetzung muss die
Akzeptanzkriterien erfüllen, aber nicht dieselben Module oder Technologien
verwenden.

## Dokumentation

### Produkt und Anforderungen

- [Anforderungsanalyse](docs/anforderungen/README.md) – sprachunabhängiger
  Produktvertrag nach Fachbereichen
- [Backlog](BACKLOG.md) – priorisierte offene, erledigte und verworfene Arbeit

### Technische Umsetzung

- [Architektur](docs/ARCHITECTURE.md) – Schichten, Datenfluss, APIs und PWA
- [Datenmodell](docs/DATA_MODEL.md) – persistenter Vertrag und Invarianten
- [Designkonzept](docs/DESIGN-KONZEPT.md) – unverbindliche visuelle Leitidee,
  Typografie, Farben und Interaktionsmuster
- [Sicherheit](SECURITY.md) – konkrete Schutzmaßnahmen und Meldeweg
- [Tests](test/README.md) – Aufbau und Regeln des Test-Harness

### Lernen und Mitarbeit

- [Für .NET-Entwickler](docs/DOTNET-GUIDE.md) – aktuelle Module als
  vertraute .NET-Konzepte lesen
- [Lernplan: modernes .NET mit Agents](docs/DOTNET-AGENT-LEARNING.md) –
  VS-Code-Setup, Lernphasen und Aufgabenteilung
- [Beiträge](CONTRIBUTING.md) – lokales Setup und Änderungsworkflow
- [Agent-Regeln](Agent.md) – verbindliche technische Leitplanken
- [Agent-Einstieg](AGENTS.md) – automatisch auffindbare Kurzfassung

## Daten und Sicherheit

Der aktive Stand kann lokal oder in Google Drive liegen. Lokaler
Browserspeicher ist kein externes Backup und kein geräteübergreifender Sync.
Beim kontrollierten Wechsel zu Google Drive werden beide Stände verglichen;
es gibt keinen automatischen Merge.

Reale Brokerexporte, Laufzeitdaten, Tokens, Passphrasen und entschlüsselte
Backups gehören weder in Git noch in öffentliche Fehlerberichte. Für externe
Sicherungen stellt die Anwendung eine verschlüsselte Backup-Datei bereit.
Details stehen in den sprachunabhängigen
[Sicherheitsanforderungen](docs/anforderungen/06-SICHERHEIT.md) und in der
technischen [Sicherheitsdokumentation](SECURITY.md).

## Weiterentwicklung

Vor jeder Änderung gelten [AGENTS.md](AGENTS.md), [Agent.md](Agent.md) und
[dev-prompts-vorlagen.md](dev-prompts-vorlagen.md). Die komplette Testsuite
läuft vor und nach jeder Änderung. Produktverhalten wird zuerst in der
Anforderungsanalyse beschrieben; konkrete Implementierungsentscheidungen
gehören in Architektur und Datenmodell. Noch nicht umgesetzte Ideen stehen
ausschließlich im [Backlog](BACKLOG.md).
