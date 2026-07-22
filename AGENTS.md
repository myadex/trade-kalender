# AGENTS.md

Diese Datei ist der kurze, automatisch auffindbare Einstieg fuer Codex und
andere Coding-Agents. Vor jeder Arbeit in diesem Repository sind die
vollstaendigen Regeln in [Agent.md](Agent.md) und
[dev-prompts-vorlagen.md](dev-prompts-vorlagen.md) zu lesen und einzuhalten.

Fuer Lernaufgaben mit modernem C#/.NET gilt zusaetzlich der
[.NET-/Agenten-Lernplan](docs/DOTNET-AGENT-LEARNING.md). Die bestehende
JavaScript-PWA bleibt dabei die Referenzimplementierung; ein .NET-Lern-Port ist
ein getrenntes Projekt und keine stillschweigende Migration.

Kurzfassung der nicht verhandelbaren Grenzen:

- Vor und nach jeder Aenderung `npm test` ausfuehren. Neue Vertraege zuerst als
  roten Test formulieren und den abschliessenden Komplettlauf dokumentieren.
- Niemals echte Finanzdaten, Broker-Exporte, Tokens, Passphrasen oder andere
  Secrets in Code, Tests, Prompts oder Git aufnehmen.
- Golden Values nicht anpassen, um einen Test gruen zu machen.
- Fachlogik und I/O getrennt halten; kleine, pruefbare Schritte bevorzugen.
- Keine Commits, Pushes, Deployments, History-Rewrites oder destruktiven
  Datenaktionen ohne ausdruecklichen Auftrag.
- Jede auslieferbare Aenderung erhoeht alle in [Agent.md](Agent.md)
  dokumentierten App- und Cache-Versionen gemeinsam.
