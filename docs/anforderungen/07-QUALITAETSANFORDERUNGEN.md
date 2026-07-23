# Qualitätsanforderungen

Diese Anforderungen beschreiben nicht einzelne Funktionen, sondern die
Eigenschaften, die für alle Produktbereiche gelten.

## QA-01 – Datenintegrität

**Muss:** Keine bestätigte Aktion darf unbemerkt Trades, offene Lots, Steuer
oder Sicherungen verlieren oder duplizieren.

**Akzeptanzkriterien:**

- Import und Speicherung sind gegen Duplikate und veraltete Stände abgesichert.
- Fehlerpfade lassen den zuvor gültigen Bestand unverändert.
- Aggregierte Summen stimmen mit den zugrunde liegenden Einzelwerten überein.

## QA-02 – Fachliche Reproduzierbarkeit

**Muss:** Derselbe normalisierte Eingabebestand muss immer dieselben
fachlichen Ergebnisse liefern.

**Akzeptanzkriterien:**

- FIFO, P&L, Steuer und offene Lots sind gegen bekannte Handwerte prüfbar.
- Berechnungen verändern ihre Eingaben nicht.
- Zeitzone oder Anzeigesprache verschieben keinen gespeicherten Handelstag.

## QA-03 – Offline-Fähigkeit

**Muss:** Die installierbare Anwendung muss nach einem erfolgreichen
Online-Laden im lokalen Modus ohne Netzwerk starten und lesend wie schreibend
nutzbar bleiben.

**Akzeptanzkriterien:**

- Anwendungshülle und lokale Ressourcen sind offline verfügbar.
- Lokale Daten werden ohne Netzwerk geladen und gespeichert.
- Cloud-Anmeldung und Cloud-Speicherung werden ehrlich als onlineabhängig behandelt.

## QA-04 – Desktop und Mobilgerät

**Muss:** Der vollständige Kernfunktionsumfang muss auf aktuellen Desktop- und
Mobilbrowsern bedienbar sein.

**Akzeptanzkriterien:**

- Hauptnavigation und Aktionszugänge sind in beiden Layouts vorhanden.
- Inhalte verursachen keine unbedienbaren Überläufe.
- Sichere Bildschirmränder mobiler Geräte werden berücksichtigt.

## QA-05 – Barrierefreiheit

**Muss:** Die Anwendung muss mit Tastatur, sichtbarem Fokus, verständlichen
Beschriftungen und assistiven Ausgaben bedienbar sein.

**Akzeptanzkriterien:**

- Haupt- und Statistiknavigation unterstützen erwartbare Pfeil- und Sprungtasten.
- Dialoge halten Fokus und geben ihn nach dem Schließen zurück.
- Formularbeschriftungen sind technisch ihren Feldern zugeordnet.
- Status- und Fehlermeldungen werden als Änderungen angekündigt.

## QA-06 – Fehlertoleranz

**Muss:** Ungültige Eingaben, Netzwerkfehler und fehlende optionale Daten
müssen lokal begrenzt und verständlich behandelt werden.

**Akzeptanzkriterien:**

- Ein Fehler in einer Datei wird nicht als leerer Bestand interpretiert.
- Fehlende Statistikdaten erzeugen einen Hinweis statt eines falschen Werts.
- Nach einem behebbaren Fehler kann der Nutzer ohne kompletten Datenreset fortfahren.

## QA-07 – Wiederherstellbarkeit

**Muss:** Vor jeder riskanten Datenänderung muss ein nachvollziehbarer Rückweg
existieren.

**Akzeptanzkriterien:**

- Interne Sicherungen sind nach Grund und Zeitpunkt unterscheidbar.
- Wiederherstellung bewahrt den abgelösten Stand erneut.
- Ein externes verschlüsseltes Backup kann auf einem anderen unterstützten Gerät genutzt werden.

## QA-08 – Abwärtskompatibilität

**Muss:** Neue Produktstände müssen ältere gültige Datenstände mit fehlenden
optionalen Angaben weiterhin laden können.

**Akzeptanzkriterien:**

- Neue Felder sind bei Einführung sicher optional.
- Alte Trades bleiben in Kalender und Gesamtergebnis sichtbar.
- Nicht berechenbare neue Kennzahlen werden ehrlich als fehlend angezeigt.

## QA-09 – Wartbarkeit

**Muss:** Fachlogik, Benutzerinteraktion und externe Ein-/Ausgabe müssen als
getrennte Verantwortungsbereiche weiterentwickelbar sein.

**Akzeptanzkriterien:**

- Fachregeln sind ohne Oberfläche oder Netzwerk prüfbar.
- Externe Dienste können an klaren Grenzen simuliert werden.
- Eine technische Umstrukturierung kann bei unverändertem Verhalten durch dieselben Tests belegt werden.

## QA-10 – Testbarkeit

**Muss:** Jede neue oder geänderte Anforderung muss durch reproduzierbare
automatische Prüfungen und bei Kernrechnungen durch unabhängige Handwerte
abgesichert sein.

**Akzeptanzkriterien:**

- Normalfall, Randfall und ungültige Eingabe sind abgedeckt.
- Bekannte Fehlerklassen bleiben als dauerhafte Regressionstests erhalten.
- Ein vollständiger Testlauf prüft Fachlogik, Struktur, Sicherheit und Version gemeinsam.

## QA-11 – Atomare Auslieferung

**Muss:** Zusammengehörige Anwendungsressourcen müssen als ein konsistenter,
sichtbar versionierter Stand ausgeliefert werden.

**Akzeptanzkriterien:**

- Sichtbare Produktversion und Offline-Ressourcenversion stimmen überein.
- Ein neuer Stand mischt keine inkompatiblen alten und neuen Ressourcen.
- Veraltete Offline-Ressourcen können repariert werden, ohne Nutzerdaten zu löschen.
