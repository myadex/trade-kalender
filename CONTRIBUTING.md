# Beitragen

Danke für dein Interesse am Trade Kalender. Das Projekt verarbeitet private
Finanzdaten; deshalb haben Datenintegrität, kleine nachvollziehbare Änderungen
und reproduzierbare Tests Vorrang vor Entwicklungsgeschwindigkeit.

## Voraussetzungen und lokaler Start

Benötigt werden Git, Node.js 24 oder neuer und ein statischer Webserver.

```powershell
npm ci
npm test
python -m http.server 5500 --bind 127.0.0.1
```

Danach ist die App unter `http://127.0.0.1:5500/index.html` erreichbar. Für
Entwicklung ohne Google kann beim ersten Start **Nur auf diesem Gerät** gewählt
werden. VS Code Live Server funktioniert ebenfalls; sein injiziertes
Live-Reload-Skript wird von der Content Security Policy absichtlich blockiert.

Lies vor einer Änderung:

- [Architektur](docs/ARCHITECTURE.md)
- [Datenmodell](docs/DATA_MODEL.md)
- [Agent-Regeln](Agent.md)
- [Test-Harness](test/README.md)
- [Security-Leitfaden](SECURITY.md)

## Arbeitsablauf

1. Prüfe den aktuellen Stand mit `npm test`.
2. Ordne die Änderung einer Schicht und einem klaren Datenfluss zu.
3. Schreibe für einen Bug oder neuen Vertrag zuerst einen permanenten Test.
4. Zeige den erwarteten roten Lauf und prüfe, dass nur der neue Vertrag Rot
   wird.
5. Implementiere die kleinste vollständige Änderung.
6. Führe `npm test` erneut aus und erwarte den grünen Komplettlauf.
7. Baue bei kritischen Regressionen den Fehler kurz wieder ein. Die
   Gegenprobe muss den neuen Test rot machen; danach wird der korrekte Zustand
   wiederhergestellt.
8. Aktualisiere Architektur, Datenmodell, README oder Backlog, wenn sich deren
   Vertrag ändert.
9. Prüfe `git diff --check` und den vollständigen Diff.

Der Test zählt nur, wenn er die echte Produktlogik oder Modulgrenze ausführt.
Eine im Test nachgebaute zweite Implementierung beweist das Verhalten der App
nicht.

## Versions- und PWA-Vertrag

Jede Lieferung erhöht dieselbe Version an allen fünf Auslieferungspunkten:

- zwei statische Anzeigen in `index.html`,
- Queryparameter von `js/app.js` in `index.html`,
- `APP_VERSION` in `js/config.js`,
- `RELEASE` in `sw-register.js`,
- `CACHE` in `sw.js`.

Der Test-Harness erzwingt ihre Gleichheit. HTML, CSS, alle geänderten
JavaScript-Module und Service Worker werden atomar veröffentlicht. Eine nur
teilweise veröffentlichte ES-Modul-Kette ist ein Produktionsfehler.

## Architekturregeln

- Parsing, Berechnung und Validierung bleiben pure Funktionen ohne DOM,
  Netzwerk oder globalen App-Zustand.
- UI-Module rendern und lesen Felder. Der Controller in `app.js` entscheidet
  über Mutation und Persistenz.
- IndexedDB und Drive verwenden ausschließlich den normalisierten Vertrag aus
  `app-data.js`.
- Neue Statistiklogik erhält Handwert-, Randfall- und Nicht-Mutations-Tests.
- Persistente Felder sind abwärtskompatibel; ältere Dokumente ohne das Feld
  müssen weiterhin sicher laden.
- Kommentare erklären auf Deutsch den Grund einer ungewöhnlichen Entscheidung,
  nicht die offensichtliche Syntax.

## Finanzdaten und Testdaten

Persönliche Broker-Exporte, Laufzeit-JSON, Screenshots mit realen Werten und
entschlüsselte Backups dürfen nie committed oder als Issue-Anhang
veröffentlicht werden. `trade-kalender.json` und `node_modules/` sind
absichtlich ignoriert.

Tests verwenden ausschließlich klar erkennbare synthetische Daten. Die Golden
Values in `test/golden.json` werden nie geändert, nur damit ein Test grün wird.
Bei einer fachlich beabsichtigten Rechenänderung sind zuerst Handrechnung,
Invarianten und Migrationsfolgen zu dokumentieren.

## Pull-Request-Checkliste

- [ ] Änderung und Root Cause beziehungsweise fachliches Ziel sind erklärt.
- [ ] Neue oder geänderte Verträge besitzen permanente Tests.
- [ ] Rotlauf und grüner Komplettlauf sind mit Zahlen dokumentiert.
- [ ] Es wurden keine echten Finanzdaten oder Secrets aufgenommen.
- [ ] Datenmodell und Abwärtskompatibilität wurden geprüft.
- [ ] PWA-Versionen sind vollständig und gleich.
- [ ] Betroffene Dokumentation und Backlog-Status sind aktuell.
- [ ] `git diff --check` ist sauber.

## Lizenzhinweis

Das Repository enthält derzeit keine ausdrückliche Open-Source-Lizenz. Bis der
Eigentümer eine Lizenz festlegt, dürfen Dritte den Code nicht automatisch wie
ein frei lizenziertes Projekt weiterverwenden. Beiträge sollten deshalb vorab
mit dem Repository-Eigentümer abgestimmt werden.

