# Designkonzept

Dieses Dokument beschreibt die visuelle Idee und die derzeitigen
Gestaltungsentscheidungen des Trade Kalenders. Es ist kein verbindlicher Produktvertrag.
Es ist auch keine unveränderliche Design-Spezifikation. Verbindliches
Produktverhalten, Bedienbarkeit und Barrierefreiheit stehen in der
[Anforderungsanalyse](anforderungen/README.md).

Das Konzept soll neuen Entwicklerinnen und Entwicklern erklären, warum die
Oberfläche so aussieht und welche Richtung bei neuen Ansichten beibehalten
werden sollte. Die tatsächlich ausgelieferten Werte und Regeln stehen in
[`css/app.css`](../css/app.css); dieses Dokument beschreibt deren Absicht.

## Gestaltungsziel

Die Anwendung soll wie ein ruhiges persönliches Analysewerkzeug wirken:
datenorientiert, kompakt und sachlich. Ergebnisse sollen schnell erfassbar
sein, ohne dass die Oberfläche wie ein Spiel, ein Broker-Terminal voller
Signale oder ein Vergleich mit anderen Tradern wirkt.

Leitideen:

- **Daten zuerst:** Zahlen, Zeiträume und Datenqualität haben Vorrang vor
  Dekoration.
- **Ruhige Hierarchie:** wenige Akzentfarben, dunkle Flächen und dezente
  Trennlinien statt vieler konkurrierender Karten.
- **Progressive Offenlegung:** technische Details bleiben erreichbar, werden
  aber beispielsweise in Tooltips oder Unteransichten verlagert.
- **Konsistenz vor Neuheit:** bestehende Karten, Dialoge und Navigation werden
  wiederverwendet, bevor ein neues UI-Muster entsteht.
- **Keine Gamification:** Level, Ranglisten und prachtvolle Belohnungsgrafiken
  gehören nicht zur aktuellen Designsprache.

## Typografie

Die Weboberfläche verwendet zwei Schriftfamilien von Google Fonts:

| Schrift | Rolle | Warum |
| --- | --- | --- |
| **Chakra Petch** | Überschriften, Produktnamen, größere Inhaltsbezeichnungen und normale Formfelder | Technischer Charakter, aber offener und lesbarer als eine reine Monospace-Oberfläche |
| **JetBrains Mono** | Geldwerte, Kennzahlen, Metadaten, Navigation, Tabellen und Statusmeldungen | Ziffern und kurze Datenblöcke bleiben stabil ausgerichtet und gut vergleichbar |

Die Kombination trennt Orientierung von Detailinformation: Chakra Petch
gliedert die Seite, JetBrains Mono kennzeichnet präzise Daten. Großbuchstaben
und erhöhte Laufweite werden nur für kurze Labels eingesetzt, nicht für lange
Texte.

Die Fonts werden online geladen. Ist die Verbindung nicht verfügbar, greifen
die definierten System-Fallbacks `sans-serif` und `monospace`; die App bleibt
dadurch offline benutzbar, kann typografisch aber leicht anders umbrechen.

## Farbschema

Die aktuelle Oberfläche ist ausschließlich als dunkles Farbschema angelegt.
Die semantischen CSS-Variablen bilden die gemeinsame Palette:

| Token | Aktueller Wert | Konzeptuelle Rolle |
| --- | --- | --- |
| `--bg` | `#0a0e14` | tiefste Seiten- und Eingabefläche |
| `--paper` | `#0d1420` | angehobene Flächen, Karten, Navigation und Diagramme |
| `--ink` | `#e2e8f0` | primärer Text und wichtige neutrale Werte |
| `--muted` | `#94a3b8` | sekundäre Beschriftungen und Metadaten |
| `--border` | `#1c2433` | ruhige Trennung ohne starke Flächenkontraste |
| `--green` | `#22c55e` | positive Ergebnisse, Equity und primäre Bestätigung |
| `--red` | `#ef4444` | negative Ergebnisse, Drawdown, Fehler und Gefahr |
| `--amber` | `#f59e0b` | Warnung, Aufmerksamkeit und sichtbarer Tastaturfokus |
| `--blue` | `#3b82f6` | Kapitaleinsatz, neutrale Information und zweite Datenserie |

Abgestufte Hintergrund- und Rahmenvarianten wie `--green-bg`,
`--green-mid`, `--red-bg`, `--red-mid`, `--amber-bg`, `--amber-mid` und
`--blue-bg` unterstützen Badges und Statusflächen.

Farben transportieren Bedeutung **nicht ausschließlich über Farbe**.
Vorzeichen, Beschriftungen, Symbole, Linienlegenden und Statusmeldungen müssen
dieselbe Aussage auch ohne sichere Farbwahrnehmung vermitteln.

## Flächen, Abstände und Dichte

- Der Hauptinhalt ist auf 1.100 Pixel begrenzt und zentriert. Dadurch bleiben
  Tabellen und Diagramme auf großen Bildschirmen zusammenhängend.
- Flächen unterscheiden sich primär durch Hintergrund, eine dünne Border und
  kleine Radien von ungefähr 6 bis 12 Pixeln.
- Schatten werden sparsam eingesetzt, hauptsächlich für schwebende
  Hilfetexte oder modale Ebenen.
- Abstände sind bewusst kompakt. Zusätzlicher Leerraum soll Hierarchie
  schaffen und nicht große ungenutzte Bereiche erzeugen.
- Karten fassen eine fachliche Einheit zusammen. Sie sind kein Standardmittel,
  um jede einzelne Zahl einzurahmen.

Die Abstände sind aktuell noch keine vollständig tokenisierte Skala. Bei einer
späteren größeren UI-Überarbeitung kann daraus ein formales Spacing-System
entstehen; für die heutige Projektgröße wäre das mehr Regelwerk als Nutzen.

## Desktop und Mobile

Desktop und Mobile verwenden dieselben Inhalte, aber unterschiedliche
Navigationsmuster:

- Auf dem Desktop stehen Hauptnavigation und Aktionen oberhalb des Inhalts.
- Unter 720 Pixeln wird die Hauptnavigation zu einer festen unteren
  Tab-Leiste. Seltenere Aktionen liegen in einem aufklappbaren Aktionsbereich.
- Statistik-Karten und Filter verdichten sich bei kleineren Breiten; komplexe
  Tabellen dürfen horizontal scrollen, statt unlesbar zusammengedrückt zu
  werden.
- Dialoge werden mobil als gut erreichbare Bottom Sheets dargestellt.
- Safe Areas von Geräten mit Gestenleiste oder Displayausschnitt werden
  berücksichtigt.

Mobile ist damit keine reduzierte Nebenvariante. Fachliche Informationen und
sichere Datenaktionen bleiben auf beiden Formfaktoren erreichbar.

## Diagramme und Datenvisualisierung

Diagramme sollen Vergleiche erleichtern und keine reine Dekoration sein:

- **Grün** zeigt die realisierte Equity am Tagesende.
- **Blau** zeigt den höchsten gleichzeitig gebundenen Kapitaleinsatz.
- **Rot** markiert einen fachlich relevanten Drawdown-Punkt.
- Gemeinsame Fragestellungen verwenden möglichst eine gemeinsame Zeit- und
  Wertachse. Deshalb teilen Equity und Kapitaleinsatz ein Diagramm.
- Achsen, Legenden und Datenqualität bleiben lesbar; konkrete Zahlen dürfen im
  Invis-Modus durch Anteile am Startkapital ersetzt werden.
- Detaillierte Qualitätsinformationen erscheinen über die Legende bei
  **Hover**, **Tastaturfokus** und **Touch**, statt dauerhaft Raum im Diagramm
  einzunehmen.

Die SVG-Diagramme werden ohne zusätzliche Laufzeitbibliothek erzeugt. Das hält
Darstellung, Offline-Verhalten und Sicherheitsgrenzen überschaubar.

## Interaktion und Zustände

- Primäre Aktionen verwenden Grün, destruktive Aktionen Rot und Warnzustände
  Amber. Neutrale Navigation bleibt überwiegend grau.
- Hover darf eine Aktion verdeutlichen, ist aber nie der einzige Zugangsweg.
- Tastaturfokus wird mit einer deutlich sichtbaren amberfarbenen Kontur
  dargestellt.
- Touch-Ziele für zentrale mobile Bedienung und Formulare sollen ungefähr
  44 Pixel erreichen.
- Tooltips benötigen neben Hover auch Tastaturfokus und Touch.
- Dialoge besitzen einen klaren Titel, Fokusführung, Escape-Verhalten und
  Fokus-Rückgabe.
- Statusänderungen werden nicht nur visuell angezeigt, sondern über geeignete
  Live-Regionen angekündigt.

Animationen bleiben kurz und funktional. Aktuell wird hauptsächlich das
Einblenden kleiner Hilfetexte weich überblendet. Neue dekorative Bewegung
sollte nur ergänzt werden, wenn sie Orientierung verbessert; bei größerem
Animationseinsatz wäre zusätzlich ein zentraler
`prefers-reduced-motion`-Pfad erforderlich.

## Inhaltsstil

Die Oberfläche spricht direkt und sachlich:

- kurze deutsche Bezeichnungen;
- klare Angabe von Zeitraum und Bezugsgröße;
- keine motivationalen Wertungen der Trading-Leistung;
- keine Beschönigung fehlender oder geschätzter Daten;
- Fachbegriffe nur dort, wo sie für die korrekte Interpretation nötig sind.

Der Invis-Modus ist keine alternative Designsprache. Er verwendet dieselbe
Hierarchie, ersetzt sensible Geldbeträge jedoch durch Prozentwerte und macht
den Nur-Ansehen-Zustand sichtbar.

## Festgehaltene Entscheidungen

| Entscheidung | Bevorzugte Richtung | Bewusst nicht gewählt |
| --- | --- | --- |
| Grundcharakter | ruhiges persönliches Analysewerkzeug | spielerisches Trading-Dashboard |
| Theme | dunkles, kontrastarmes Flächensystem | paralleles Light Theme ohne konkreten Bedarf |
| Typografie | Chakra Petch plus JetBrains Mono | eine einzige Schrift für alle Rollen |
| Semantik | wenige feste Statusfarben | eigene Farbe für jede Kennzahl |
| Performance | gemeinsames Diagramm für direkten Vergleich | zwei getrennte Diagramme mit doppelten Achsen |
| Zusatzdetails | progressive Offenlegung | dauerhaft sichtbare technische Textblöcke |
| Mobile Navigation | untere Tab-Leiste und Aktionsbereich | verkleinerte Desktop-Navigation |

Diese Entscheidungen sind Leitplanken, keine Pflicht. Eine spätere
Designänderung ist sinnvoll, wenn sie Lesbarkeit, Bedienbarkeit oder fachliche
Klarheit nachweisbar verbessert. Ändert sich nur die visuelle Richtung, wird
dieses Konzept aktualisiert. Ändert sich Produktverhalten, muss zusätzlich die
Anforderungsanalyse angepasst werden.
