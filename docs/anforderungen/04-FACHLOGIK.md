# Fachlogik und Berechnungsregeln

## Grundsätze

Alle Geldwerte werden auf Basis der gespeicherten Buchungen berechnet. Steuer
behält ihr Vorzeichen: ein positiver Wert ist eine Belastung, ein negativer
Wert eine Erstattung. Offene Positionen fließen erst bei einem realisierten
Verkauf in das Ergebnis ein.

## FL-01 – FIFO-Zuordnung

**Muss:** Verkäufe müssen nach dem First-in-first-out-Prinzip den ältesten
verfügbaren Käufen derselben Wertpapieridentifikation zugeordnet werden.

**Akzeptanzkriterien:**

- Teilverkäufe können mehrere ältere Lots anteilig verbrauchen.
- Nicht verbrauchte Stücke bleiben als offene Lots erhalten.
- Ein Verkauf ohne ausreichende offene Stückzahl wird vollständig abgelehnt.

## FL-02 – Chronologische Reihenfolge

**Muss:** Buchungen müssen nach Datum und Uhrzeit verarbeitet werden; bei
gleichem Zeitpunkt gilt Kauf vor Verkauf.

**Akzeptanzkriterien:**

- Gleiche Eingaben erzeugen unabhängig von ihrer Dateireihenfolge dasselbe Ergebnis.
- Ein Kauf und Verkauf zum selben Zeitpunkt können korrekt zusammengeführt werden.
- Datumswerte werden ohne Verschiebung des Kalendertags interpretiert.

## FL-03 – Inkrementelles Import-Ledger

**Muss:** Wiederholte Importe dürfen eine bereits bekannte Brokerzeile nicht
erneut in den fachlichen Bestand übernehmen.

**Akzeptanzkriterien:**

- Jede Rohzeile besitzt eine stabile fachliche Identität.
- Dateiinterne und bereits gespeicherte Duplikate werden getrennt ausgewiesen.
- Nur unbekannte Zeilen verändern Trades oder offene Lots.
- Ein historisch überlappender erster Ledger-Import wird blockiert.

## FL-04 – Netto-P&L

**Muss:** Das realisierte Netto-P&L eines Trades muss als Verkauf minus
FIFO-Einstand minus Steuer berechnet werden.

**Akzeptanzkriterien:**

- Gewinn, Verlust und Nullergebnis werden mit dem Steuervorzeichen korrekt berechnet.
- Das Gesamt-P&L entspricht der Summe aller geschlossenen Trades.
- Manuelle und importierte Trades verwenden dieselbe Ergebnisdefinition.

## FL-05 – Steuerbehandlung

**Muss:** Steuer muss mit ihrem fachlichen Vorzeichen gespeichert und verrechnet werden.

**Akzeptanzkriterien:**

- Eine Belastung reduziert das Netto-P&L.
- Eine negative Erstattung vermindert den Bruttoverlust.
- Beim Schließen einer Position kann eine automatische Schätzung manuell überschrieben werden.
- Ein Totalverlust setzt den Verkauf auf null und berechnet die Erstattung vor.

## FL-06 – Bearbeitung importierter Trades

**Muss:** Eine Korrektur eines importierten Trades muss die zugrunde liegende
Verkaufsbuchung ändern und das Ledger vollständig neu auswerten.

**Akzeptanzkriterien:**

- Der FIFO-Einstand bleibt aus den Kaufbuchungen abgeleitet.
- Ungültige Verkäufe und doppelte Rohidentitäten werden abgelehnt.
- Das Löschen eines Verkaufs stellt nicht anderweitig verbrauchte Lots wieder offen.

## FL-07 – Offene Positionen

**Muss:** Offene Lots derselben Wertpapieridentifikation müssen zu einer
sichtbaren Position verdichtet werden können.

**Akzeptanzkriterien:**

- Stückzahl und Einstand entsprechen der Summe der sichtbaren offenen Lots.
- Das Schließen erzeugt ein realisiertes Ergebnis und verbraucht die Lots.
- Ohne Marktpreis wird kein unrealisiertes Ergebnis erfunden.

## FL-08 – Positionen ausblenden

**Muss:** Eine offene Position muss aus der Beobachtung entfernt werden können,
ohne ihre Brokerhistorie oder FIFO-Grundlage zu löschen.

**Akzeptanzkriterien:**

- Der Ausschluss bezieht sich auf konkrete offene Lot-Identitäten.
- Spätere Käufe derselben Wertpapieridentifikation bleiben sichtbar.
- Ein Ausschluss kann dauerhaft rückgängig gemacht werden.

## FL-09 – Zeitliche Aggregation

**Muss:** Realisierte Ergebnisse müssen nach Handelstag, ISO 8601-Kalenderwoche
und Kalendermonat aggregiert werden.

**Akzeptanzkriterien:**

- Der Ausstiegstag bestimmt die Ergebnisperiode.
- Eine ISO-Woche läuft Montag bis Sonntag.
- ISO-Wochenjahr und Kalenderwochennummer sind am Jahreswechsel korrekt.
- Teilaggregate ergeben dieselbe Summe wie der zugrunde liegende Bestand.

## FL-10 – Klassische Kennzahlen

**Muss:** Für einen frei wählbaren Ausstiegszeitraum müssen Netto-P&L,
Trade-Winrate, Profit Factor, Erwartungswert, Durchschnittsgewinn,
Durchschnittsverlust, Serien, bester und schlechtester Trade berechnet werden.

**Akzeptanzkriterien:**

- Neutrale Trades werden bei der Winrate nicht als Gewinn oder Verlust gezählt.
- Fehlende Nenner erzeugen keinen erfundenen Wert.
- Ungültige oder außerhalb liegende Trades werden sichtbar ausgewiesen.
- Kleine Stichproben erhalten einen Hinweis.

## FL-11 – Payoff-Ratio und Ausreißervergleich

**Muss:** Die Payoff-Ratio muss mit allen Trades und zusätzlich ohne die drei
schlimmsten Verlust-Trades desselben Zeitraums vergleichbar sein.

**Akzeptanzkriterien:**

- Beide Werte verwenden dieselbe Definition von Durchschnittsgewinn zu Durchschnittsverlust.
- Es werden ausschließlich negative Trades entfernt.
- Bleibt kein weiterer Verlust als Nenner, wird kein Vergleichswert erfunden.
- Die Ausgangsdaten werden durch den Vergleich nicht verändert.

## FL-12 – Equity und Drawdown

**Muss:** Equity und Drawdown müssen aus realisierten Tagesendständen auf Basis
des hinterlegten Startkapitals abgeleitet werden.

**Akzeptanzkriterien:**

- Mehrere Trades eines Tages werden vor der Tagesendberechnung summiert.
- Offene Positionen fließen nicht ein.
- Maximalbetrag und zugehörige Quote stammen vom selben Drawdown-Punkt.
- Ohne positives Startkapital wird keine Prozentquote angezeigt.

## FL-13 – Timing-Auswertungen

Die vollständigen Definitionen, Zeitgrenzen und Belastbarkeitsregeln stehen im
[Trade-Analyse-Vertrag](TRADE-ANALYSE.md#timing).

**Muss:** Trades müssen nach Wochentag, Richtung, Handelsphase und Stunde
auswertbar sein, wahlweise anhand von Einstieg oder Ausstieg.

**Akzeptanzkriterien:**

- Long/Call, Short/Put und neutrale Produkte werden getrennt behandelt.
- Einstiegs- und Ausstiegsbezug werden nie still vermischt.
- Eine Wochentagstendenz erscheint erst ab acht Trades je Richtung und Wochentag.
- Fehlende Uhrzeiten werden als nicht auswertbar gezählt.

## FL-14 – Overnight- und Disziplinanalyse

Overnight-Gruppen, automatische Befunde und der monatliche Disziplin-Trend
werden im [Trade-Analyse-Vertrag](TRADE-ANALYSE.md#verhalten) präzisiert.

**Muss:** Über Nacht gehaltene Trades und monatlich wiederkehrende
Verlustmuster müssen anhand der vorhandenen Ein- und Ausstiegsdaten erkennbar sein.

**Akzeptanzkriterien:**

- Intraday und Overnight werden aus den Kalendertagen abgeleitet.
- Haltedauer und Ergebnis werden getrennt ausgewiesen.
- Auffällige Großverluste, Stunden oder Overnight-Verluste werden als Befund,
  nicht als Anlageempfehlung formuliert.

## FL-15 – Invis-Modus

**Muss:** Im Invis-Modus müssen alle konkreten Geldbeträge als Prozent des
fest hinterlegten Startkapitals dargestellt werden.

**Akzeptanzkriterien:**

- Alle Ansichten verwenden dieselbe feste Kapitalbasis.
- Periodengewinne erhöhen den Nenner späterer Perioden nicht automatisch.
- Dimensionslose Kennzahlen behalten ihre fachliche Einheit.
- Ohne positives Startkapital wird ein neutraler Platzhalter angezeigt.

## FL-16 – Eingesetztes Kapital

**Muss:** Das je Kalendertag eingesetzte Kapital muss als höchster gleichzeitig
gebundener FIFO-Einstand der zu diesem Zeitpunkt offenen Positionen berechnet
werden.

**Akzeptanzkriterien:**

- Mehrere nacheinander eröffnete Positionen erhöhen den gebundenen Einstand nur
  so lange, wie sie gleichzeitig offen sind; Kaufumsatz ist nicht die Messgröße.
- Teil- und Vollverkäufe vermindern den gebundenen Einstand anhand derselben
  FIFO-Zuordnung wie die Ergebnisrechnung.
- Über Nacht und über handelsfreie Kalendertage offene Positionen werden
  fortgeschrieben; aktuell offene Positionen reichen bis zum aktuellen Tag.
- Der Verlauf beginnt am ersten Tag der vorhandenen Trade-Historie und verwendet
  damit dieselbe linke Zeitgrenze wie die Equity-Auswertung.
- Vor dem ersten vollständigen Import-Ledger wird der Kapitaleinsatz aus
  Einstand, Einstieg und Ausstieg der älteren Trades nachvollziehbar geschätzt.
  Fehlende Einstiegstage werden ausschließlich am Ausstiegstag berücksichtigt.
- Ab dem ersten Import-Ledger werden Brokerbuchungen und der dort bereits offene
  Anfangsbestand als exakte FIFO-Quelle verwendet.
- Der angezeigte Tageswert darf bei einem Konto ohne Margin die an diesem Tag
  verfügbare realisierte Equity nicht überschreiten. Abweichende rekonstruierte
  Eingangswerte werden begrenzt und ihre Anzahl wird sichtbar ausgewiesen.
- Ohne verlässliche Uhrzeit wird das betroffene Tagesmaximum als Schätzung
  gekennzeichnet; ungültige oder nicht deckbare Buchungen bleiben sichtbar
  ausgeschlossen.
- Auslastungsquoten verwenden das feste hinterlegte Startkapital. Ohne positives
  Startkapital wird keine Prozentquote erfunden.
