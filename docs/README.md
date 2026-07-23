# Dokumentation

Dieser Ordner bündelt die ausführliche Projektdokumentation nach
Verantwortungsbereich. Der Projekt-Root bleibt dadurch auf ausführbare
Einstiegspunkte und übliche Repository-Dateien beschränkt.

## Anforderungen

Die [Anforderungsanalyse](anforderungen/README.md) beschreibt das beobachtbare
Produktverhalten unabhängig von JavaScript, C# oder einem bestimmten
Framework.

## Architektur

- [Architektur](architecture/ARCHITECTURE.md) – Schichten, Datenfluss,
  Schnittstellen und Betriebsgrenzen
- [Datenmodell](architecture/DATA_MODEL.md) – persistenter Vertrag und
  Invarianten
- [Designkonzept](architecture/DESIGN-KONZEPT.md) – visuelle Leitidee,
  Typografie, Farbrollen und Interaktionsmuster
- [Trade-Analyse](architecture/TRADE-ANALYSE.md) – technische Zuordnung und
  Weiterentwicklung von Timing und Verhalten

## Entwicklung

- [Agent-Regeln](development/AGENT-RULES.md) – verbindliche Arbeits-,
  Test- und Datenschutzregeln
- [Prompt-Vorlagen](development/DEV-PROMPTS.md) – wiederverwendbare
  Arbeitsaufträge für Menschen und Coding-Agents
- [Beitragsleitfaden](../CONTRIBUTING.md) – lokales Setup und
  Änderungsworkflow
- [Test-Harness](../test/README.md) – ausführbare Verträge und Golden Values

## Lernen

- [.NET-Leitfaden](learning/DOTNET-GUIDE.md) – JavaScript-Module in
  C#/.NET-Denkmodelle übersetzen
- [.NET-/Agenten-Lernplan](learning/DOTNET-AGENT-LEARNING.md) – modernes .NET
  mit VS Code und Coding-Agents auffrischen

## Planung

Der [Backlog](project/BACKLOG.md) enthält offene, erledigte und verworfene
Arbeit. Ausgeliefertes Produktverhalten wird nicht aus dem Backlog, sondern aus
den Anforderungen und ausführbaren Tests abgeleitet.

## Warum einige Dateien im Projekt-Root bleiben

- `index.html`, `manifest.json`, `sw.js` und `sw-register.js` sind direkte
  PWA-Einstiegspunkte. Insbesondere muss `sw.js` für den benötigten
  Service-Worker-Scope im Root liegen.
- `package.json` und `package-lock.json` werden dort von npm erwartet.
- `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` und `AGENTS.md` sind
  verbreitete Repository-Konventionen und sollen ohne Suche auffindbar sein.
- `.github`, `css`, `js`, `assets`, `docs` und `test` trennen Automatisierung,
  Oberfläche, Logik, statische Dateien, Wissen und Prüfungen.
