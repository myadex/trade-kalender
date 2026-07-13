# App-Backlog

Diese Liste ist die gemeinsame Arbeitsgrundlage fuer die weitere Entwicklung.
Ein Punkt wird erst nach Test, Dokumentation und Verifikation auf erledigt
gesetzt. `P1` betrifft Daten oder Sicherheit, `P2` den Produktfluss und `P3`
Wartbarkeit bzw. Komfort.

## Prioritaet 1

### Git-Historie von Finanzdaten bereinigen

- **Status:** Entscheidung offen.
- **Warum:** `trade-kalender.json` ist fuer neue Commits aus dem Index entfernt,
  kann aber in bereits veroeffentlichten Commits noch vorhanden sein.
- **Naechster Schritt:** Historie mit einem geeigneten Git-Werkzeug neu schreiben
  und anschliessend den Remote per Force-Push aktualisieren.
- **Entscheidung noetig:** Explizite Freigabe fuer den destruktiven Rewrite und
  Abstimmung mit allen Klonen des Repositories.

### Drive-Konflikte zwischen Tabs und Geraeten erkennen

- **Status:** Erledigt in v42.
- **Loesung:** Die App laedt eine starke Drive-Versionskennung vor dem
  Dateninhalt und aktualisiert die Datei atomar mit `If-Match`. HTTP 412 wird
  als Konflikt behandelt: Der Schreibvorgang bleibt verworfen, der neueste
  Drive-Stand wird geladen und der Nutzer wird zum Wiederholen seiner Aktion
  aufgefordert.
- **Entscheidung:** Der ETag-Vertrag der offiziellen Drive API v2 wird gezielt
  fuer Versionsabruf und Update verwendet, weil v3 nur eine monotone `version`,
  aber keinen dokumentierten atomaren Compare-and-Set-Vertrag anbietet.

### Legacy-Daten vollstaendig neu aufbauen

- **Status:** Verworfen in v43.
- **Entscheidung:** Der Broker-Export ist keine vollstaendige Quelle fuer
  manuelle Korrekturen. Ein Neuaufbau wuerde deshalb fachlich gueltige Legacy-
  Daten ersetzen, insbesondere die manuellen Anpassungen aus Januar und Februar.
- **Sicherung:** Der ausfuehrbare Komplett-Neuaufbau wurde aus UI, App-Modul und
  Offline-Cache entfernt. Inkrementelle CSV-Imports bleiben unveraendert aktiv.

## Prioritaet 2

### Importierte Trades im Ledger bearbeiten

- **Status:** Erledigt in v43.
- **Loesung:** Der Editor aendert bei importierten Trades die zugehoerige Sell-
  Rohzeile, erzeugt deren Quell-ID neu und spielt anschliessend das gesamte
  Import-Ledger erneut ab. Einstand, offene Lots und P&L bleiben dadurch reine
  FIFO-Ableitungen.
- **Sicherung:** Kaufbetrag und Broker sind fuer Import-Trades schreibgeschuetzt.
  Ungueltige Rohdaten, ID-Kollisionen und FIFO-Ueberverkaeufe werden vor dem
  Speichern abgelehnt.

### Position ohne P&L dauerhaft aus dem Tracking ausblenden

- **Status:** Offen.
- **Heute:** Die Aktion ist bei aktivem Ledger gesperrt, damit ein Replay keine
  geloschte Position wieder erscheinen laesst.
- **Ziel:** Ein explizites, versioniertes Ausblend-Ereignis mit Rueckgaengig-
  Aktion einfuehren.

### Import-Migration in der UI erklaeren

- **Status:** Offen.
- **Warum:** Der erste Ledger-Import akzeptiert bewusst nur neue Brokerzeilen.
- **Ziel:** Dialog mit erklaertem Stichtag, erkannter Historie und klarer
  Handlungsanweisung statt einer reinen Fehlermeldung.

### CSV-Export gegen Tabellenformeln absichern

- **Status:** Offen.
- **Warum:** Produkttexte koennen beim Oeffnen einer CSV in Tabellenprogrammen
  als Formel interpretiert werden.
- **Ziel:** Gefaehrliche Zellpraefixe im Export neutralisieren und mit einem
  Regressionstest absichern.

## Prioritaet 3

### PWA im echten Browser offline pruefen

- **Status:** Offen.
- **Heute:** Asset-Liste und Offline-Fallback sind automatisiert geprueft.
- **Ziel:** Installieren, offline navigieren, Service-Worker-Update und erneute
  Online-Synchronisierung in einem echten Browser testen.

### Testlauf als Standardkommando und CI etablieren

- **Status:** Offen.
- **Ziel:** `npm test` als Einstiegspunkt sowie einen GitHub-Actions-Lauf bei
  jedem Push und Pull Request einrichten.

### Node-ESM-Warnung im Testlauf beseitigen

- **Status:** Offen.
- **Warum:** Die dynamisch importierten Browser-Module verursachen aktuell eine
  harmlose Node-Warnung zur automatischen ESM-Erkennung.
- **Ziel:** Test-Harness und Paketmetadaten ohne Warnung kompatibel machen, ohne
  den CommonJS-Harness zu brechen.

### UI-Controller weiter aufteilen

- **Status:** Offen.
- **Warum:** `js/app.js` enthaelt weiterhin State, Rendering und Event-Logik.
- **Ziel:** Tabs und Dialoge in kleine Render-Module auslagern; pure Logik bleibt
  in den bestehenden Fachmodulen.

### Bedienbarkeit und Barrierefreiheit pruefen

- **Status:** Offen.
- **Ziel:** Fokusfuehrung in Dialogen, Escape-Taste, eindeutige Labels,
  Tastaturnavigation und Kontraste systematisch verbessern.

## Erledigte Grundlagen

- Service Worker liegt im Root, Version und Cache sind testgleich.
- Test-Harness prueft Syntax, Modulvertraege, Struktur, Golden Values und
  Regressionen.
- HTML aus Import- und JSON-Daten wird vor DOM-Ausgabe escaped.
- FIFO-Ueberverkaeufe werden vor dem Speichern abgelehnt.
- Neue Importe werden als Roh-Ledger gespeichert und sind reproduzierbar.
- Drive-Fehler, korrupte JSON und parallele Schreibvorgaenge innerhalb eines
  Tabs sind abgesichert.
- Gleichzeitige Drive-Aenderungen aus mehreren Tabs oder Geraeten werden vor
  dem Ueberschreiben atomar erkannt.
