# Trade-Analyse: Timing und Verhalten

Dieses Dokument definiert die fachliche Bedeutung der Analysebereiche
**Timing** und **Verhalten**. Es ergänzt die Anforderungen
[FL-13 und FL-14](04-FACHLOGIK.md#fl-13--timing-auswertungen) sowie
[UI-07](05-BENUTZEROBERFLAECHE.md#ui-07--statistik).

Die Auswertungen beschreiben historische, realisierte Trades. Sie erkennen
Muster im vorhandenen Datenbestand, beweisen aber weder Ursache noch einen
zukünftigen Vorteil und sind keine Anlageempfehlung.

## Datenbasis

Jede Analyse verwendet geschlossene Trades und deren realisiertes Netto-P&L.
Folgende Angaben bestimmen die Zuordnung:

| Angabe | Fachliche Bedeutung |
|---|---|
| Ausstiegstag | Tag der Realisierung; bestimmt Ergebnisperioden und Monatszuordnung |
| Ausstiegszeit | Zeitpunkt der Realisierung; Grundlage der ausstiegsbezogenen Stundenanalyse |
| Einstiegstag | Tag der Handelsentscheidung; Grundlage der einstiegsbezogenen Wochentags- und Overnight-Analyse |
| Einstiegszeit | Zeitpunkt der Handelsentscheidung; Grundlage für Einstiegsphasen und Haltedauer |
| Produktbeschreibung | Erkennung von Long/Call, Short/Put oder neutral |
| Netto-P&L | Ergebnis nach berücksichtigter Steuer; Grundlage aller Summen und Durchschnitte |

Long beziehungsweise Call wird als Long-Richtung, Short beziehungsweise Put als
Short-Richtung behandelt. Eine Beschreibung ohne eindeutiges Richtungsmerkmal
bleibt neutral. Neutrale Trades dürfen in Gesamtsummen enthalten sein, aber
nicht still einer Richtung zugeschlagen werden.

Ein Trade mit Netto-P&L größer als null ist ein Gewinn, kleiner als null ein
Verlust und gleich null neutral. Neutrale Ergebnisse zählen zur Trade-Anzahl
und zum Durchschnitt, aber nicht als Gewinn oder Verlust der Trefferquote.

## Timing

Timing beantwortet die Frage, **wann** gute oder schlechte Ergebnisse
entstanden sind. Einstieg und Ausstieg sind dabei zwei unterschiedliche
Betrachtungen und dürfen nie still vermischt werden.

### Wochentage: Long gegen Short

Die Standardansicht verwendet den Einstiegstag, weil an diesem Tag die
Handelsentscheidung getroffen wurde. Optional kann nach Ausstiegstag
umgeschaltet werden.

Für Montag bis Freitag werden Long und Short getrennt berechnet:

- Anzahl Trades,
- Summe des Netto-P&L,
- durchschnittliches Netto-P&L pro Trade,
- Median des Netto-P&L,
- Trefferquote,
- Profit Factor.

Die Aussage „Long besser“ oder „Short besser“ vergleicht ausschließlich das
durchschnittliche Netto-P&L pro Trade. Sie erscheint erst ab **n ≥ 8 je
Richtung und Wochentag**. Erfüllt nur eine Richtung die Mindeststichprobe, wird
keine Tendenz behauptet.

Fehlendes Bezugsdatum, Wochenenddaten, ungültiges Netto-P&L und neutrale
Produkte werden getrennt gezählt und sichtbar als nicht zugeordnet gemeldet.

### Handelsphasen

Die Uhrzeitanalyse verwendet feste, lückenlose Zeitbereiche:

| Phase | Zeitraum |
|---|---|
| Vorbörse | 08:00–09:00 |
| Xetra-Eröffnung | 09:00–10:00 |
| Vormittag | 10:00–13:00 |
| Mittagsflaute | 13:00–15:30 |
| US-Eröffnung | 15:30–17:30 |
| Nachbörse | 17:30–22:00 |

Die obere Grenze gehört jeweils nicht mehr zur vorherigen Phase. Damit liegt
beispielsweise 15:30 Uhr bereits in der US-Eröffnung.

Je Phase werden Trade-Anzahl, Trefferquote, Netto-P&L, Durchschnitt pro Trade
und die Teilwerte für Long und Short ausgewiesen. Die Ansicht kann unabhängig
zwischen Einstiegszeit und Ausstiegszeit wechseln. Die Standardansicht der
Uhrzeitanalyse verwendet den Ausstieg, während die Wochentagsanalyse mit dem
Einstieg startet; beide Schalter gelten nur für ihre jeweilige Auswertung.

### Stundenprofil

Das Stundenprofil umfasst die begonnenen Stunden von 08:00 bis 22:00 Uhr. Ein
Eintrag „15–16 Uhr“ enthält Zeitpunkte ab 15:00 Uhr bis vor 16:00 Uhr. Die
Balkenlänge wird relativ zum betragsmäßig stärksten sichtbaren Stundenwert
skaliert und ist deshalb kein eigener Geld- oder Prozentmaßstab.

Trades ohne lesbare Uhrzeit werden nicht in Phasen oder Stunden einsortiert und
als fehlend gemeldet. Formal gültige Zeitpunkte außerhalb von 08:00 bis 22:00
Uhr gehören derzeit ebenfalls zu keinem sichtbaren Zeitbereich. Das ist eine
bekannte Abdeckungsgrenze und darf bei einer Erweiterung nicht still als
fehlende Uhrzeit umgedeutet werden.

### Diagnose negativer Stunden

Für eine negative Stunde werden ausschließlich ihre Verlust-Trades untersucht:

- **Ausreißergetrieben:** Die zwei größten Verluste verursachen mindestens
  **70 %** der Verlustsumme.
- **Overnightgetrieben:** Overnight-Verluste verursachen mindestens **60 %**
  der Verlustsumme.
- **Systematisch:** Mindestens fünf Verluste liegen vor, ohne dass eine der
  beiden vorherigen Ursachen dominiert.
- **Richtungsschieflage:** Long oder Short verursacht mindestens **75 %** der
  Verlustsumme.

Diese Diagnose erklärt die Zusammensetzung des historischen Ergebnisses. Sie
beweist keine Kausalität.

## Verhalten

Verhalten untersucht Haltedauer, Overnight-Trades und wiederkehrende
Verlustmuster. Die Begriffe beschreiben messbare Datenklassen, nicht die
Absicht oder Emotion des Nutzers.

### Overnight

Ein Trade ist Overnight, wenn Einstiegstag und Ausstiegstag beide bekannt und
verschieden sind. Kalendertage sind maßgeblich; die reine Dauer in Stunden ist
für diese Einordnung nicht entscheidend. Fehlt eines der beiden Daten, wird
kein Overnight erfunden.

Overnight-Trades bleiben zusätzlich in ihrer gewählten Einstiegs- oder
Ausstiegsphase enthalten. Die Overnight-Zahl und die Phasenwerte sind daher
nicht als disjunkte Teilmengen zu addieren.

Für die Verhaltensanalyse werden Overnight-Trades anhand ihrer Einstiegszeit
gruppiert:

| Kategorie | Einstiegszeit | Bedeutung |
|---|---|---|
| Früh | vor 11:00 Uhr | früh eröffnete und später über Nacht gehaltene Position |
| Tagsüber | 11:00–19:00 Uhr | tagsüber eröffnete und über Nacht gehaltene Position |
| Abend | ab 19:00 Uhr | spät eröffnete und über Nacht gehaltene Position |

Die sichtbaren Kurzbezeichnungen „hängengeblieben“ und „geplant“ sind
Interpretationshilfen. Aus Uhrzeit und Haltedauer allein lässt sich nicht
beweisen, ob ein Trade ungeplant oder geplant war.

Ein negativer Overnight-Befund oder ein positiver Abend-Befund erscheint erst
ab **n ≥ 8** in der betreffenden Gruppe.

### Automatische Befunde

Automatische Befunde verwenden folgende Belastbarkeitsregeln:

- Beste oder schwächste Einstiegsphase: mindestens acht Trades je betrachteter
  Phase und mindestens zwei ausreichend große Phasen.
- Long-/Short-Unterschied: mindestens acht Trades in beiden Richtungen; der
  Abstand der Ergebnissummen muss größer als 25 % des Betrags ihrer gemeinsamen
  Summe sein.
- Schlechteste Kombination aus Ausstiegsstunde und Richtung: mindestens fünf
  Trades, deren gemeinsame Summe negativ ist.
- Haltedauer-Asymmetrie: betrachtet werden die **45 Kalendertage** vor dem
  neuesten Ausstiegstag im Datenbestand. Erforderlich sind mindestens acht
  Gewinner, fünf Verlierer und ein Verlustmedian von mindestens dem Doppelten
  des Gewinnmedians.

Der sichtbare „FOMO-Check“ misst damit ausschließlich eine
Haltedauer-Asymmetrie. Er diagnostiziert keine Emotion. Die fachlich präzisere
Bezeichnung ist Dispositionseffekt: Verlierer wurden im Median deutlich länger
gehalten als Gewinner.

### Disziplin-Trend

Der Disziplin-Trend gruppiert nach Ausstiegsmonat und zeigt:

- Trade-Anzahl und Netto-P&L,
- durchschnittlichen Verlust,
- Anzahl und Summe der Overnight-Trades,
- Anzahl und Summe der Großverluste,
- Payoff-Ratio aus Durchschnittsgewinn geteilt durch den Betrag des
  Durchschnittsverlusts,
- mediane Haltedauer der Verlierer und Gewinner.

Ein Großverlust ist derzeit ein einzelner Trade mit Netto-P&L von höchstens
**−1.000 €**. Die Schwelle **1.000 €** ist fest und nicht relativ zum
Startkapital. Im Invis-Modus werden Beträge nur anders dargestellt; die
fachliche Schwelle ändert sich nicht.

Der Monatsvergleich besitzt keine eigene Mindestanzahl pro Monat. Monate mit
wenigen Trades sind deshalb beschreibend, aber nicht belastbar mit größeren
Monaten vergleichbar. Der Disziplin-Trend muss auch dann sichtbar bleiben, wenn
im gesamten Bestand kein Overnight-Trade existiert.

## Datenqualität und Ausschlüsse

- Fehlende Einstiegsdaten dürfen nicht durch Ausstiegsdaten ersetzt werden.
- Eine fehlende Zeit verhindert nur zeitbasierte Auswertungen; der Trade bleibt
  in anderen passenden Statistiken erhalten.
- Eine unbekannte Richtung bleibt neutral.
- Eine negative oder unvollständige Haltedauer wird nicht ausgewertet.
- Ausschlüsse und fehlende Werte müssen sichtbar oder als neutrale Platzhalter
  erkennbar sein.
- Keine Analyse darf den gespeicherten Trade-Bestand verändern.

## Interpretation und Grenzen

Die Bereiche analysieren realisiertes Netto-P&L. Sie berücksichtigen nicht
automatisch Positionsgröße relativ zum Risiko, Stop-Abstand, Marktvolatilität,
Gebühren außerhalb der gespeicherten Werte, offene Buchgewinne, Korrelationen
zwischen Trades oder wechselnde Marktregime.

Große Ergebnissummen können von höherem Kapitaleinsatz stammen. Trefferquote,
Profit Factor, Durchschnitt und Median müssen deshalb gemeinsam betrachtet
werden. Eine Mindeststichprobe reduziert Zufall, macht eine Beobachtung aber
nicht automatisch statistisch signifikant.

Für jede neue Analyse müssen vor der Umsetzung feststehen:

1. welche konkrete Handelsfrage beantwortet wird,
2. ob Einstieg, Ausstieg oder Haltedauer die Bezugsgröße ist,
3. welche Trades ein- oder ausgeschlossen werden,
4. welche Formel und Einheit verwendet wird,
5. welche Mindeststichprobe eine Aussage benötigt,
6. wie fehlende und ungültige Daten sichtbar werden,
7. welche Handwerte Normalfall und Randfälle belegen.

Die technische Zuordnung der aktuellen Referenzimplementierung steht im
[Weiterentwicklungsleitfaden](../architecture/TRADE-ANALYSE.md).

