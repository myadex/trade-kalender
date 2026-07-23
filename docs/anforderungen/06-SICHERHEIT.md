# Sicherheit und Datenschutz

## Schutzbedarf

Brokerbuchungen, realisierte Ergebnisse, offene Positionen, Identifikationen
und Backups sind private Finanzdaten. Zugangstoken und Passphrasen sind
Authentifizierungsgeheimnisse. Beide Kategorien dürfen nicht unnötig
gespeichert, protokolliert oder veröffentlicht werden. Eine verschlüsselte Backup-Datei
schützt den bewusst exportierten Datenstand außerhalb der Anwendung.

## SEC-01 – Datenminimierung

**Muss:** Das Produkt darf private Finanzdaten nur für die vom Nutzer
ausgelösten Journal-, Speicher- und Sicherungsfunktionen verarbeiten.

**Akzeptanzkriterien:**

- Ohne Cloud-Auswahl verlassen lokale Journal-Daten das Gerät nicht.
- Es existiert keine verpflichtende Analyse- oder Trackingübertragung.
- Externe Dienste erhalten nur die für ihre konkrete Aufgabe notwendigen Daten.

## SEC-02 – Begrenzte Cloud-Berechtigung

**Muss:** Der Cloud-Zugriff muss auf die von der Anwendung verwaltete Datei
begrenzt sein.

**Akzeptanzkriterien:**

- Eine Anmeldung beginnt ausschließlich nach Nutzeraktion.
- Allgemeiner Lesezugriff auf das gesamte Laufwerk wird nicht verlangt.
- Fehlende oder abgelaufene Autorisierung führt zu keinem ungeschützten Schreibversuch.

## SEC-03 – Geheimnisse

**Muss:** Kurzlebige Zugangstoken und Backup-Passphrasen dürfen nicht dauerhaft
im fachlichen Datenbestand gespeichert werden.

**Akzeptanzkriterien:**

- Ein Neustart enthält keine wiederverwendbare Passphrase.
- Exportdateien enthalten weder Token noch Klartextpassphrase.
- Fehlermeldungen geben keine Geheimnisse aus.

## SEC-04 – Nicht vertrauenswürdige Eingaben

**Muss:** Inhalte aus Brokerexport, Datenexport, Backup und Cloud müssen vor
Darstellung und Speicherung validiert werden.

**Akzeptanzkriterien:**

- Fremdtexte können keine ausführbaren Inhalte in die Oberfläche einschleusen.
- Tabellenexporte neutralisieren mögliche Formeln.
- Ungültige Daten verändern den bestehenden Zustand nicht.

## SEC-05 – Verschlüsselte Backup-Datei

**Muss:** Ein externes Backup muss Vertraulichkeit und Manipulationserkennung
mit zeitgemäßer passphrasenbasierter Verschlüsselung gewährleisten.

**Akzeptanzkriterien:**

- Jede Datei verwendet neue zufällige Ableitungs- und Verschlüsselungswerte.
- Eine ausreichend starke Schlüsselableitung erschwert Wörterbuchangriffe.
- Falsche Passphrase oder veränderte Metadaten liefern keinen Klartext.
- Eine vergessene Passphrase kann nicht umgangen oder zurückgesetzt werden.

## SEC-06 – Schutz vor unbeabsichtigter Mutation

**Muss:** Schreibende, überschreibende und löschende Aktionen müssen gegen
Verwechslung, Doppelbetätigung und veraltete Datenstände abgesichert sein.

**Akzeptanzkriterien:**

- Destruktive Aktionen verlangen eine ausdrückliche Bestätigung.
- Kritische Aktionen erzeugen vorher eine Safety-Sicherung.
- Konflikte überschreiben keinen neueren Cloud-Stand.
- Der Invis-Modus blockiert jede Mutation zentral.

## SEC-07 – Browser-Schutzgrenzen

**Muss:** Die Webanwendung muss ladbare Skripte, Verbindungen, eingebettete
Inhalte und Basisadressen auf notwendige vertrauenswürdige Quellen begrenzen.

**Akzeptanzkriterien:**

- Nicht freigegebene Skripte und aktive Inhalte werden blockiert.
- Inline-Skriptausführung und dynamische Codeauswertung sind nicht erforderlich.
- Authentifizierung und Cloud-Verbindungen funktionieren innerhalb der engen Freigaben.
- Externe Seiten erhalten nur eine angemessene Herkunftsinformation.

## SEC-08 – Sicherheitsgrenzen des Invis-Modus

**Muss:** Der Nutzer muss erkennen können, dass der Invis-Modus Sichtschutz,
aber keine Verschlüsselung des gespeicherten oder im Speicher liegenden
Datenbestands ist.

**Akzeptanzkriterien:**

- Konkrete Geldwerte erscheinen nur als Kapitalanteile.
- Identifikationen und Stückzahlen werden maskiert.
- Der Modus startet nach einem Neustart deaktiviert.
- Die Sicherheitsdokumentation benennt die verbleibenden Grenzen.

## SEC-09 – Sicherer Umgang im Projekt

**Muss:** Reale Finanzdaten, Brokerexporte, Tokens, Passphrasen und
entschlüsselte Backups dürfen nicht Bestandteil von Quellhistorie, Tests oder
öffentlichen Fehlerberichten sein.

**Akzeptanzkriterien:**

- Tests verwenden ausschließlich klar synthetische Daten.
- Laufzeitdaten und Abhängigkeitsordner sind von der Versionsverwaltung ausgeschlossen.
- Sicherheitsmeldungen verwenden einen privaten Kanal ohne echte Anhänge.
