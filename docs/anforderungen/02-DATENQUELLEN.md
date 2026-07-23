# Datenquellen und externe Schnittstellen

## Überblick

Das Produkt verarbeitet nur ausdrücklich ausgewählte Eingaben. Jede externe
Datei und jede entfernte Antwort gilt zunächst als nicht vertrauenswürdig und
muss vor einer Änderung des aktiven Datenstands geprüft werden. Unterstützte
Eingangswege sind Brokerexport, manuelle Erfassung, vollständiger Datenexport,
Backup-Datei und der autorisierte Stand in Google Drive.

## DQ-01 – Brokerexport

**Muss:** Das Produkt muss einen CSV-Brokerexport von Scalable Capital mit
Semikolon als Trennzeichen sowie deutschen Zahlen- und Datumsformaten einlesen.

**Akzeptanzkriterien:**

- Pflichtspalten werden vor der Verarbeitung geprüft.
- Kauf-, Verkaufs- und Steuerbuchungen werden unterschieden.
- Leere, strukturell ungültige oder fachlich unmögliche Dateien werden abgelehnt.
- Die Originalzeilen bleiben für eine spätere Reproduktion erhalten.

## DQ-02 – Manuelle Erfassung

**Muss:** Das Produkt muss geschlossene Trades auch ohne Brokerexport manuell
erfassen und korrigieren können.

**Akzeptanzkriterien:**

- Produkt, Identifikation, Daten, Uhrzeiten, Stückzahl, Kauf, Verkauf, Steuer
  und Broker können erfasst werden.
- Pflichtfelder und Zahlen werden vor dem Speichern validiert.
- Eine Ergebnisvorschau ist vor der Übernahme sichtbar.

## DQ-03 – Backup-Datei

**Muss:** Das Produkt muss einen vollständigen, zuvor erzeugten Datenstand aus
einer verschlüsselten Backup-Datei einlesen können.

**Akzeptanzkriterien:**

- Datei, Formatversion, Integrität und Passphrase werden vor der Übernahme geprüft.
- Fehlerhafte oder manipulierte Dateien verändern den aktiven Zustand nicht.
- Vor erfolgreicher Wiederherstellung wird ein Rückweg angelegt.

## DQ-04 – Bestehender unverschlüsselter Datenexport

**Muss:** Das Produkt muss aus Gründen der Rückwärtskompatibilität einen
gültigen vollständigen Datenexport wiederherstellen können.

**Akzeptanzkriterien:**

- Die Daten werden auf den aktuellen fachlichen Vertrag normalisiert.
- Unbekannte oder ungültige Strukturen werden abgelehnt.
- Vor der Übernahme entsteht eine interne Sicherung.

## DQ-05 – Google Drive

**Muss:** Das Produkt muss einen vom Nutzer autorisierten Datenstand in Google
Drive lesen und schreiben können, ohne Zugriff auf fremde Dateien zu verlangen.

**Akzeptanzkriterien:**

- Anmeldung und Autorisierung erfolgen erst nach einer Nutzeraktion.
- Der Zugriff ist auf die von der Anwendung verwaltete Datei begrenzt.
- Netzwerk-, Berechtigungs- und Inhaltsfehler werden verständlich gemeldet.
- Cloud-Zugriff wird nicht als verfügbar dargestellt, wenn keine Verbindung besteht.

## DQ-06 – CSV-Ausgabe

**Muss:** Das Produkt muss geschlossene Trades als tabellarisch weiterverarbeitbare
CSV-Datei exportieren können.

**Akzeptanzkriterien:**

- Alle vorgesehenen Spalten bleiben auch bei Sonderzeichen strukturell korrekt.
- Inhalte, die Tabellenprogramme als Formel interpretieren könnten, werden neutralisiert.
- Der Export verändert den aktiven Datenbestand nicht.

## DQ-07 – Nutzereingaben und Dateigrenzen

**Muss:** Das Produkt muss Dateityp, Größe, Inhalt und fachliche Plausibilität
prüfen, bevor externe Daten verarbeitet werden.

**Akzeptanzkriterien:**

- Nicht unterstützte Dateitypen werden vor dem Lesen abgewiesen.
- Fehler nennen den betroffenen Vertrag, ohne sensible Inhalte offenzulegen.
- Fremdtexte werden in der Oberfläche ausschließlich als Text dargestellt.

## Schnittstellenabgrenzung

Der Broker liefert historische Buchungen, aber keine manuellen Korrekturen des
Journals. Google Drive ist ein Speicherort, keine fachliche Datenquelle. Eine
Backup-Datei ist ein manueller Sicherungs- und Transportweg, kein automatischer
Synchronisationsdienst.
