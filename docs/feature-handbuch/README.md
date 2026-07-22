# Feature-Handbuch

Dieses Handbuch beschreibt den ausgelieferten Funktionsumfang des Trade
Kalenders aus Sicht von Nutzern, Product Ownern, Testern und neuen
Entwicklern. Es beantwortet vor allem die Frage: **Was kann die App, wie wird
die Funktion benutzt und wo liegen ihre Grenzen?**

Es ersetzt keine technische Dokumentation. Implementierungsdetails,
persistente Felder und Sicherheitsannahmen bleiben in den dafür vorgesehenen
Dokumenten. Dadurch hat jede Information genau einen führenden Pflegeort.

## Inhalt

- [Funktionskatalog](FEATURES.md) – vollständiger fachlicher Ist-Stand der App
- [Nutzerabläufe](ABLAEUFE.md) – wichtige Vorgänge vom Start bis zur
  Wiederherstellung
- [Projekt-README](../../README.md) – Installation und schneller Einstieg
- [Architektur](../ARCHITECTURE.md) – technische Schichten, Datenfluss und APIs
- [Datenmodell](../DATA_MODEL.md) – gespeicherter Vertrag und Invarianten
- [Security](../../SECURITY.md) – Schutzgrenzen und Umgang mit Finanzdaten
- [Backlog](../../BACKLOG.md) – geplante, verworfene und erledigte Arbeit
- [Tests](../../test/README.md) – ausführbare fachliche und technische Verträge

## Wo Softwareprojekte welche Information pflegen

In kleineren Projekten landet anfangs oft alles im README. Mit wachsendem
Umfang ist diese Trennung leichter zu pflegen:

| Dokument | Beantwortete Frage | Inhalt in diesem Projekt |
|---|---|---|
| README | Wie starte und verstehe ich das Projekt in wenigen Minuten? | Schnellstart, Kurzarchitektur und Dokumentationsindex |
| Feature-Handbuch | Was kann das fertige Produkt? | Funktionsumfang, Nutzen, Regeln und bewusste Grenzen |
| Nutzerabläufe | Wie erledige ich eine konkrete Aufgabe? | Schrittfolgen für Import, Bearbeitung, Backup und Speicherwechsel |
| Architektur | Wie arbeitet die Lösung technisch? | Schichten, Module, Datenflüsse, externe APIs und PWA |
| Datenmodell | Welche Daten werden dauerhaft gespeichert? | Felder, Invarianten, Kompatibilität und Formate |
| Security | Wovor schützt die App und wovor nicht? | Finanzdaten, OAuth, CSP, Backups und Vorfälle |
| Tests | Welche Verträge sind automatisch beweisbar? | Golden Values, Randfälle, DOM-, PWA- und Sicherheitstests |
| Backlog | Was ist noch geplant oder bewusst verworfen? | Priorisierte zukünftige Arbeit und Entscheidungsverlauf |
| Changelog | Was änderte sich zwischen Releases? | Noch nicht als eigene Datei vorhanden; bei mehreren Nutzern oder formalen Releases als `CHANGELOG.md` ergänzen |

Der ausgelieferte Ist-Stand wird **nicht aus dem Backlog** rekonstruiert. Ein
Backlog darf Ideen, offene Fragen und verworfene Ansätze enthalten. Das
Feature-Handbuch beschreibt dagegen nur Funktionen, die im aktuellen Produkt
tatsächlich nutzbar sind.

Für größere Entscheidungen kann zusätzlich ein Ordner `docs/adr/` mit kurzen
Architecture Decision Records sinnvoll sein. Ein ADR dokumentiert nicht, was
eine Funktion tut, sondern warum eine schwer umkehrbare technische
Entscheidung getroffen wurde.

## Pflegeprozess

Bei jeder fachlich sichtbaren Änderung wird zuerst entschieden, welche Quelle
betroffen ist:

1. Neuer oder geänderter Produktnutzen: Funktionskatalog aktualisieren.
2. Neuer oder geänderter Bedienweg: Nutzerabläufe aktualisieren.
3. Technischer Datenfluss oder Modulzuschnitt: Architektur aktualisieren.
4. Persistenter Vertrag: Datenmodell und Kompatibilität aktualisieren.
5. Schutzgrenze oder Bedrohung: Security-Dokumentation aktualisieren.
6. Noch nicht umgesetzte Idee: ausschließlich in den Backlog aufnehmen.
7. Releasehistorie für Nutzer: später zusätzlich im Changelog festhalten.

Tests bleiben der ausführbare Vertrag. Dokumentation erklärt Bedeutung und
Zusammenhang; sie ersetzt keine Handwerte oder automatischen Prüfungen.

## Definition of Done für Produktdokumentation

Eine Änderung ist aus Dokumentationssicht fertig, wenn:

- der Funktionskatalog den tatsächlichen Ist-Stand beschreibt,
- mindestens ein betroffener Nutzerablauf weiterhin stimmt,
- technische oder persistente Änderungen in Architektur beziehungsweise
  Datenmodell stehen,
- Sicherheitsfolgen geprüft und bei Bedarf dokumentiert sind,
- offene Folgearbeit getrennt im Backlog steht,
- alle lokalen Markdown-Links funktionieren und `npm test` grün ist,
- keine echten Finanzdaten, Tokens, Passphrasen oder Broker-Exporte enthalten
  sind.

## Lesepfade

**Als Nutzer:** Funktionskatalog, dann den passenden Nutzerablauf.

**Als neuer Entwickler:** Projekt-README, Feature-Handbuch, Architektur,
Datenmodell, Test-Harness und Beitragsleitfaden.

**Aus dem .NET-Umfeld:** Danach den
[.NET-Leitfaden](../DOTNET-GUIDE.md) lesen; er übersetzt die JavaScript-Module
in vertraute C#- und Schichtenbegriffe.

**Als Coding-Agent:** Zusätzlich [AGENTS.md](../../AGENTS.md),
[Agent.md](../../Agent.md) und
[dev-prompts-vorlagen.md](../../dev-prompts-vorlagen.md) vollständig beachten.
