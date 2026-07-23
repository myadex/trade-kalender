# Technischer Leitfaden: Trade-Analyse

Dieses Dokument erklärt, wie die programmiersprachenunabhängigen Regeln aus
dem [Fachvertrag für Timing und Verhalten](../anforderungen/TRADE-ANALYSE.md)
in der aktuellen Referenzimplementierung abgebildet sind. Fachliche
Definitionen und Schwellenwerte werden dort geführt; dieses Dokument beschreibt
Codegrenzen, Datenfluss, Tests und sichere Erweiterung.

## Datenfluss

```text
normalisierte geschlossene Trades
        |
        v
pure Analysefunktionen in js/views.js
        |
        v
strukturierte Ergebnisobjekte
        |
        v
Renderer und Orchestrierung in js/app.js
        |
        v
Timing- und Verhalten-Panels in index.html
```

Die Analysefunktionen lesen nur ihre Parameter und verändern weder Trades noch
App-Zustand. Sie kennen kein DOM, keinen Speicher und kein Netzwerk. Der
Controller übergibt `DATA.trades`, formatiert die Ergebnisse und schreibt nur
die Darstellung. Analyseansichten lösen keinen Speichervorgang aus.

Benötigte Trade-Felder werden in
[DATA_MODEL.md](DATA_MODEL.md#geschlossener-trade) beschrieben. Entscheidend
sind `date`, `time`, `buyDate`, `buyTime`, `desc` und `pnl`.

## Funktionslandkarte

### Pure Fachfunktionen

| Funktion | Verantwortung | Zentrales Ergebnis |
|---|---|---|
| `tradeDirection` | Produkttext als Long, Short oder neutral klassifizieren | Richtungskennung |
| `timeToMinutes` | Uhrzeit validieren und in Tagesminuten umrechnen | Minuten oder `null` |
| `computeWeekdayStats` | Long und Short je Wochentag nach Einstieg oder Ausstieg vergleichen | Tage, Richtungs-Buckets, Ausschlüsse und Mindeststichprobe |
| `computeTimeStats` | Handelsphasen, Stundenprofil und Overnight-Summe berechnen | Phasen, Stunden, fehlende Zeiten und Overnight-Bucket |
| `computeInsights` | belastbare Einstiegs-, Richtungs-, Overnight- und Haltedauerbefunde bilden | strukturierte Befunde und Overnight-Gruppen |
| `diagnoseBucket` | Zusammensetzung einer negativen Stunde untersuchen | Ausreißer-, Overnight-, Systematik- und Richtungsdiagnose |
| `holdMinutes` | Haltedauer aus Ein- und Ausstiegszeitpunkt ableiten | nichtnegative Minuten oder `null` |
| `computeHoldStats` | Median-Haltedauer von Gewinnern und Verlierern vergleichen | Mediane, Stichproben und Verhältnis |
| `computeMonthlyDiscipline` | Verhaltenswerte nach Ausstiegsmonat verdichten | geordnete Monatszeilen |

Die Zeitphasen liegen zentral in `TIME_BLOCKS`. Eine zweite, leicht abweichende
Phasenliste im Renderer wäre ein Fehler. Ebenso muss die Richtungszuordnung
immer über `tradeDirection` laufen.

### Darstellung und Orchestrierung

| Funktion | Verantwortung |
|---|---|
| `buildWeekdayStats` | Wochentagskarten, Tendenz und Ausschlusshinweis rendern |
| `buildTimeStats` | Phasen, Stunden, Richtungsdetails und negative Stundendiagnosen rendern |
| `buildInsights` | automatische Befunde und Overnight-Gruppen rendern |
| `buildDiscipline` | monatlichen Disziplin-Trend unabhängig rendern |

`buildDiscipline` ist fachlich nicht von Overnight abhängig. Deshalb muss der
Aufruf vor jedem frühen Ende der Overnight-Darstellung erfolgen. Ein Bestand
ohne Overnight-Trades zeigt weiterhin Monats-P&L, Durchschnittsverlust,
Großverluste, Payoff und Haltedauern.

Die Panels `stats-view-timing` und `stats-view-behavior` liegen als
gleichrangige Unterbereiche in `index.html`. `js/navigation.js` steuert nur
Auswahl, Sichtbarkeit und Tastaturverhalten; es berechnet keine Kennzahl.

## Ergebnisverträge

Analysefunktionen liefern Zahlen und Kennungen, keine fertigen HTML-Texte:

- Bucket-Ergebnisse enthalten mindestens `n`, `wins`, `losses`, `pnl`,
  `winrate` und – soweit sinnvoll – `avg`.
- Nicht berechenbare Quoten bleiben `null`; Renderer zeigen dafür einen
  neutralen Platzhalter.
- `Infinity` ist nur dort zulässig, wo ein positiver Zähler ohne Verlustnenner
  fachlich eine unendliche Quote bedeutet.
- Ausschlüsse werden separat gezählt und nicht durch Ersatzdaten kaschiert.
- Funktionen sortieren oder verändern das übergebene Trade-Array nicht.

UI-Texte dürfen Schwellenwerte erklären, aber keine zweite Entscheidung über
Belastbarkeit treffen. Ob ein Befund entsteht, entscheidet die pure
Fachfunktion.

## Timing weiterentwickeln

Eine neue Timing-Dimension benötigt zuerst eine eindeutige Bezugszeit:

1. Handelsfrage und gewünschte Aussage im Fachvertrag ergänzen.
2. Einstieg oder Ausstieg ausdrücklich festlegen.
3. Datenqualität und Ausschlüsse definieren.
4. Eine pure Berechnung mit strukturiertem Ergebnis ergänzen.
5. Handwerte für Grenzzeit, leere Daten, fehlende Zeit, neutrale Richtung und
   Mindeststichprobe testen.
6. Den Renderer ausschließlich auf das fertige Ergebnis abbilden.

Änderungen an `TIME_BLOCKS` verändern mehrere Ansichten: Uhrzeit-Statistik,
automatische Phasenbefunde und Periodenreviews. Alle Verbraucher und ihre
Handwerte müssen gemeinsam geprüft werden.

## Verhalten weiterentwickeln

Verhaltensbefunde brauchen besonders vorsichtige Sprache. Aus einem Zeitpunkt
ist keine Absicht ableitbar. Neue Befunde müssen daher:

- ein direkt messbares Muster benennen,
- die verwendete Periode angeben,
- Mindeststichprobe und Schwelle offenlegen,
- Ursache und Korrelation nicht verwechseln,
- auch ohne verwandte Datenbereiche unabhängig rendern,
- ohne Datenmutation berechnet werden.

Eine neue Kennzahl im Disziplin-Trend gehört in
`computeMonthlyDiscipline`. `buildDiscipline` stellt nur das zusätzliche Feld
dar. Ein neuer automatischer Befund gehört in `computeInsights`; die
Textdarstellung wird anschließend in `buildInsights` ergänzt.

## Erweiterungsablauf

1. Fachlichen Vertrag und konkrete Handrechnung festhalten.
2. Bestehenden grünen Komplettlauf dokumentieren.
3. Zuerst einen roten Test gegen die echte pure Funktion formulieren.
4. Normalfall, Schwellenrand, fehlende Daten und Nicht-Mutation prüfen.
5. Die kleinste Fachlogikänderung implementieren.
6. Erst danach UI-Struktur und Renderer ergänzen.
7. Mobile Darstellung, Tastaturbedienung und Invis-Modus kontrollieren.
8. Dokumentationslinks, App-Shell und gemeinsame Version aktualisieren.
9. Komplettlauf und `git diff --check` ausführen.

Bei einer späteren Modulaufteilung sind `js/views.js` und `js/app.js` die
beiden vorgesehenen Schnitte. Mögliche Zielmodule wären eine pure
Timing-Analyse, eine pure Verhaltensanalyse und dünne Renderer. Vor dem Anlegen
von Unterordnern müssen jedoch Test-Harness, Importprüfung und
Service-Worker-App-Shell rekursiv beziehungsweise mit den neuen Pfaden
umgestellt werden. Eine bloße Dateiverschiebung ohne diese Verträge würde
Tests oder Offline-Start unvollständig machen.

## Teststrategie

Die ausführbaren Verträge liegen in `test/test_pwa.cjs` und verwenden nur
synthetische Daten. Abgedeckt werden insbesondere:

- Phasengrenzen und Zeitparser,
- Einstieg gegen Ausstieg,
- Long, Short und neutrale Produkte,
- Wochentags-Handwerte und Mindeststichprobe,
- Overnight-Gruppen,
- Erkenntnis- und Diagnoseschwellen,
- Haltedauer und Monatsaggregation,
- Nicht-Mutation der Ausgangsdaten,
- richtige Platzierung in Timing und Verhalten,
- unabhängiges Rendering des Disziplin-Trends ohne Overnight-Trades.

Ein neuer Schwellenwert braucht mindestens einen Fall direkt darunter und
einen Fall auf beziehungsweise über der Grenze. Ein Renderer-Check ersetzt
keinen Test der echten Fachfunktion; beide sichern unterschiedliche Verträge.

