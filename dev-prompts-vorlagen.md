# Prompt-Vorlagen für Software-Entwicklung mit hohem Standard

Destilliert aus dem Trade-Kalender-Projekt (v1 → v32, 155 automatische Checks, 0 ungefangene Regressionen nach Einführung der Routinen). Die Vorlagen sind sprachunabhängig (C#, JS, Python) und für die Arbeit mit KI-Assistenten wie für Team-Standards gedacht.

---

## 0. Der Basis-Prompt (an den Anfang jedes Projekts)

> Arbeite nach folgenden Regeln, sie sind nicht verhandelbar:
>
> 1. **Kein Deliverable ohne grünen Test.** Vor jeder Lieferung läuft die komplette Test-Suite. Lieferung nur bei „ALL GREEN". Wenn ein Test rot ist, wird erst der Test verstanden (ist der Test falsch oder der Code?), dann gefixt.
> 2. **Jeder Bug wird zu einem permanenten Test.** Bevor ein Bug gefixt wird: Test schreiben, der ihn reproduziert. Nach dem Fix: beweisen, dass der Test den Bug fängt, indem der Bug testweise wieder eingebaut wird (Rot), dann Fix (Grün).
> 3. **Logik und I/O trennen.** Berechnungen, Parsing, Validierung = pure functions ohne Seiteneffekte, ohne globalen Zustand, ohne direkten Zugriff auf DOM/Datenbank/Netzwerk. Externe Abhängigkeiten werden als Parameter übergeben (Dependency Injection), damit sie im Test durch Mocks ersetzbar sind.
> 4. **Kleine, sichere Schritte.** Große Umbauten werden in einzeln testbare Etappen zerlegt. Nach jeder Etappe: Suite laufen lassen. Biete mir bei größeren Entscheidungen Optionen an (A = klein/sicher, B = groß/gründlich) statt selbst zu entscheiden.
> 5. **Root Cause statt Symptom.** Bei jedem Bug: erst den Mechanismus vollständig verstehen und mir erklären, dann fixen. Ein Fix, der „zufällig funktioniert" (z.B. nur in einer Zeitzone/Locale/Umgebung), gilt als nicht gefixt.
> 6. **Versionsdisziplin.** Jede Lieferung bumpt die sichtbare Versionsnummer. Version im Code und in Cache/Deployment-Artefakten müssen übereinstimmen — per Test erzwungen.
> 7. **Ehrliche Berichte.** Jede Lieferung endet mit: Was wurde geändert, was wurde verifiziert (mit Zahlen), was sind bekannte Grenzen/offene Punkte. Keine Erfolgsmeldung ohne Beleg.

---

## 1. Projekt-Kickoff-Prompt

> Wir starten ein neues Projekt: [BESCHREIBUNG].
>
> Bevor du Code schreibst:
> 1. Schlage eine **Modul-Struktur** vor, die Logik (pure, testbar) von I/O (UI, Persistenz, Netzwerk) trennt. Pro Modul: Verantwortung in einem Satz.
> 2. Lege von Anfang an einen **Test-Harness** an (siehe Test-Vorlage unten), auch wenn er anfangs nur 5 Checks hat. Der Harness wächst mit jedem Feature.
> 3. Definiere die **Golden Values**: ein realistischer Referenz-Datensatz mit bekannten, von Hand verifizierten Soll-Ergebnissen. Jede künftige Änderung an der Kernlogik wird dagegen geprüft.
> 4. Baue eine **sichtbare Versionsnummer** ein (UI/Log), damit jederzeit prüfbar ist, welcher Stand läuft.
>
> Erst wenn ich die Struktur bestätigt habe, beginnt die Implementierung — Etappe für Etappe.

---

## 2. Feature-Prompt

> Neues Feature: [BESCHREIBUNG].
>
> Vorgehen:
> 1. **Datenlage prüfen:** Welche Daten braucht das Feature? Existieren sie schon, oder muss das Datenmodell erweitert werden? Falls Erweiterung: Was passiert mit Bestandsdaten (Migration? Graceful degradation mit ehrlichem Hinweis statt falscher Anzeige)?
> 2. **Logik zuerst, pure:** Die Berechnung als reine Funktion im Logik-Modul, mit Daten als Parameter. Kein UI-Code darin.
> 3. **Logik isoliert testen** — mit synthetischen Fällen (Normalfall, Randfälle, leere Eingabe, ungültige Eingabe) UND mit echten Daten (End-to-End durch die komplette Pipeline).
> 4. **Dann UI:** dünner Render-/Anzeige-Code, der nur noch fertige Ergebnisse darstellt.
> 5. **Tests in die Suite:** mindestens 3 permanente Checks (Kernlogik gegen bekannte Werte, Randfall, statischer Struktur-Check).
> 6. **Version bumpen, Suite laufen lassen, liefern** mit Verifikations-Zahlen.

---

## 3. Bugfix-Prompt

> Bug: [SYMPTOM, ggf. Fehlermeldung/Screenshot].
>
> Vorgehen — in dieser Reihenfolge, keine Abkürzungen:
> 1. **Reproduzieren & Mechanismus verstehen.** Erkläre mir, WARUM der Bug passiert (nicht nur wo). Wenn der Fix in einer anderen Umgebung (Zeitzone, Locale, Browser, Datenkonstellation) versagen könnte: in genau diesen Umgebungen testen.
> 2. **Regressionstest schreiben**, der den Bug nachstellt — er muss ROT sein, bevor du fixt.
> 3. **Fixen.** Minimal-invasiv, an der Wurzel.
> 4. **Beweis führen:** Test grün. Dann den Bug testweise wieder einbauen → Test muss rot werden → Bug wieder raus. Zeig mir beide Läufe.
> 5. **Umfeld prüfen:** Gibt es dieselbe Fehlerklasse an anderen Stellen im Code? (Beispiel aus dem Projekt: ein `toISOString()`-Datumsbug existierte an 6 Stellen — der Fix an einer Stelle hätte 5 Zeitbomben zurückgelassen.)
> 6. Falls der Bug **Daten korrumpiert** hat: siehe Daten-Migrations-Prompt.

---

## 4. Refactoring-Prompt

> Refactoring-Ziel: [z.B. „Modul X aus Monolith herauslösen"].
>
> Regeln:
> 1. **Verhalten einfrieren:** Vor dem ersten Schnitt müssen Golden-Value-Tests existieren, die das Ist-Verhalten festnageln. Nach JEDER Etappe müssen sie unverändert grün sein — das beweist, dass sich nur Struktur, nicht Verhalten geändert hat.
> 2. **Eine Etappe = ein abgeschlossener, getesteter Schnitt.** Nie zwei Umbauten mischen.
> 3. **Schnittstellen explizit:** Herausgelöste Module bekommen ihren Zustand als Parameter (kein Zugriff auf Globals). Was das Modul exportiert, was es importiert — und ein automatischer Check, dass jeder Import ein passendes Export-Gegenstück hat (Modul-Verträge, siehe Test-Vorlage).
> 4. **Aufhören ist erlaubt:** Die 80/20-Trennung (Logik raus, UI-Verdrahtung bleibt zusammen) ist oft der richtige Endpunkt. Ein Refactoring, dessen Nutzen nur „schönerer Code" ist, braucht eine explizite Entscheidung — biete mir die Optionen mit ehrlicher Nutzen/Risiko-Einschätzung an.

---

## 5. Test-Harness-Vorlage (die Kategorien)

Ein Skript (`node test/run.js` o.ä.), ohne Framework-Zwang, das bei jedem Lauf ALLE Kategorien prüft und mit „ALL GREEN — safe to deliver" oder einer Fehlerliste endet:

> Baue einen Test-Harness mit folgenden Kategorien:
>
> **1. Syntax/Parse:** Jede Quelldatei wird geparst (AST-Parser wie acorn/Roslyn). Fängt Tippfehler und kaputte Merges vor dem Deployment.
>
> **2. Modul-Verträge:** Für jeden `import { X } from Y`: existiert `export X` in Y wirklich? (Per AST, nicht Regex — Kommentare dürfen keine False Positives erzeugen.) Fängt den „does not provide an export"-Klassiker bei Teil-Deployments.
>
> **3. Referenz-Integrität:** Alle im Code referenzierten IDs/Selektoren/Callbacks existieren im Markup; alle vom Markup aufgerufenen Funktionen sind exponiert (bei ES-Modulen: auf `window`).
>
> **4. Struktur-Integrität:** Das Dokument/die Konfiguration ist wohlgeformt — nicht nur „Element existiert", sondern „Element ist am richtigen Ort" (z.B. Geschwister-Check: neue Sektion hat denselben Parent wie ihre Nachbarn; Dokument beginnt mit intaktem DOCTYPE; kein Streutext).
>
> **5. Bekannte-Bugs-Sperre:** Für jeden je gefixten Bug ein Check, der das fehlerhafte Muster verbietet (z.B. „kein `toISOString().slice(0,10)` für Datumsspeicherung", „kein `Math.abs(tax)` in P&L-Mathematik").
>
> **6. Golden Values:** Die Kernlogik rechnet den Referenz-Datensatz und muss exakt die von Hand verifizierten Soll-Werte treffen (Anzahl, Summen, auf den Cent).
>
> **7. Echte Module, echte Randfälle:** Die tatsächlichen Module werden importiert (nicht Kopien der Logik im Test!) und mit synthetischen Randfällen gefüttert: leer, ungültig, Grenzwerte, kaputte Eingaben.
>
> **8. Konsistenz-Invarianten:** Querbeziehungen, die immer gelten müssen (Versionsnummer == Cache-Name; Summe der Teilaggregate == Gesamtsumme; keine doppelten IDs).
>
> Wichtig: **Ein Check, der noch nie rot war, ist unbewiesen.** Bei jedem neuen kritischen Check einmal den Fehler absichtlich einbauen und den roten Lauf zeigen.

---

## 6. Mocking-Richtlinien

> Beim Testen von Code mit externen Abhängigkeiten:
>
> 1. **Abhängigkeit als Parameter, nicht als Global.** `parse(buffer, xlsxLib)` statt `parse(buffer)` mit globalem `XLSX`; `driveFetch(accessToken, url)` statt Zugriff auf globalen Token. Das ist die JS-Entsprechung von Constructor Injection in .NET.
> 2. **Mocke die Grenze, nicht die Mitte.** Ersetzt wird `fetch`/`HttpClient`/die Fremdbibliothek — nie die eigene Logik. Wenn du eigene Logik mocken musst, ist der Schnitt falsch.
> 3. **Der Mock prüft den Vertrag:** nicht nur Rückgabewerte liefern, sondern verifizieren, was der Code an die Grenze SENDET (richtiger Header? richtiger Content-Type? richtige URL?).
> 4. **Fehlerpfade sind Pflicht-Mocks:** 401/Timeout/kaputtes JSON/leere Antwort — jeder Fehlerpfad, den der Code behandelt, bekommt einen Mock-Fall.
> 5. **Mocks ersetzen keine End-to-End-Probe:** Mindestens ein Test jagt echte (anonymisierte) Realdaten durch die komplette ungemockte Pipeline.

---

## 7. Daten-Migrations-Prompt (Korrekturen an Bestandsdaten)

> Es müssen Bestandsdaten korrigiert/migriert werden: [BESCHREIBUNG].
>
> Nicht verhandelbare Regeln:
> 1. **Invarianten zuerst:** Definiere vor der Migration, welche Kennzahlen sich NICHT ändern dürfen (Anzahl Datensätze, Summen, Prüfsummen). Nach der Migration: exakt vergleichen und ausweisen.
> 2. **Idempotenz/Wiedererkennbarkeit:** Nach der Korrektur müssen eindeutige Schlüssel (UIDs) so beschaffen sein, dass eine erneute Verarbeitung derselben Quelldaten keine Duplikate erzeugt. Per Probe-Lauf beweisen.
> 3. **Teilkorrekturen sind gefährlich:** Wenn nur ein Teil der Daten korrigiert wird, prüfe, ob korrigierte und unkorrigierte Datensätze danach noch unterscheidbar sind. Wenn nicht → besser Neuaufbau aus der Originalquelle als eine zweite Teilkorrektur (Lehre aus dem Projekt: der Sonntags-Teilfix machte die spätere Vollkorrektur der JSON unmöglich).
> 4. **Matching mehrstufig und ehrlich:** Bei Abgleich zweier Datenbestände: strengster Schlüssel zuerst, dann kontrolliert lockern (mit Distanz-Limits). Jeden Nicht-Treffer einzeln ausweisen und erklären — nie stillschweigend verwerfen.
> 5. **Rückweg sichern:** Original vor der Migration wegkopieren; Migration schreibt in eine neue Datei/Tabelle.

---

## 8. Dokumentations-Standard

> Dokumentiere nach diesen Regeln:
>
> 1. **Kommentare erklären WARUM, nicht WAS.** Schlecht: `// Datum konvertieren`. Gut: `// UTC-Komponenten lesen — SheetJS liefert Excel-Daten als UTC-Mitternacht; lokale Komponenten verschieben das Datum je nach Zeitzone um einen Tag.`
> 2. **Gefixte Bugs hinterlassen Warnschilder** im Code an der Stelle, wo der Fehler naheliegt (`// WICHTIG: NICHT toISOString() verwenden, weil …`).
> 3. **Jedes Modul beginnt mit einem Kopfblock:** Verantwortung (1–2 Sätze), was rein/raus geht, was es bewusst NICHT tut.
> 4. **Entscheidungen mit Alternativen festhalten** (kurz, im README oder Journal): „Gewählt A statt B, weil …" — das erspart dem Zukunfts-Ich die erneute Debatte.
> 5. **Der Test-Harness ist Dokumentation:** Check-Namen in Klartext formulieren („Steuer wird mit Vorzeichen gespeichert, nie abs"), sodass die Suite als Verhaltens-Spezifikation lesbar ist.

---

## 9. Delivery-Checkliste (vor jedem Push)

```
[ ] Komplette Test-Suite gelaufen → ALL GREEN
[ ] Neue Funktionalität hat permanente Tests (min. 3: Kernlogik, Randfall, Struktur)
[ ] Kritische neue Checks einmal bewiesen (absichtlich rot gemacht)
[ ] Version gebumpt, Version == Cache/Deployment-Artefakt (per Test erzwungen)
[ ] ALLE zusammengehörigen Dateien im Deploy (Module sind ein Verbund —
    eine veraltete Datei reißt die ganze Kette; Teil-Deploys sind die
    häufigste Ursache für "unerklärliche" Produktionsfehler)
[ ] Nach dem Deploy: Versionsnummer im laufenden System verifiziert
[ ] Bericht: Was geändert / was verifiziert (Zahlen) / bekannte Grenzen
```

---

## 10. Anti-Patterns (was in diesem Projekt schiefging — und die Regel daraus)

| Vorfall | Regel |
|---|---|
| `find()` lieferte `-1`, Einfügung zerschnitt das Dokument an Position 9 | Rückgabewerte von Such-/Parse-Operationen IMMER prüfen, bevor sie weiterverwendet werden. `assert` kostet eine Zeile. |
| Datumsfix funktionierte in Berlin „zufällig", brach in anderen Zeitzonen | Umgebungsabhängige Fixes in mehreren Umgebungen beweisen (TZ, Locale), sonst gilt: nicht gefixt. |
| Teilkorrektur (nur Sonntage) machte Daten später unreparierbar | Vor Teilkorrekturen prüfen: bleibt der Rest unterscheidbar? Sonst Vollkorrektur aus der Quelle. |
| Alte Datei im Repo ließ die ganze ES-Modul-Kette sterben (2 scheinbar unabhängige Fehler, 1 Ursache) | Deploy ist atomar: alle Moduldateien zusammen. Modul-Vertrags-Check in die Suite. |
| Test prüfte „Element existiert", nicht „Element am richtigen Ort" | Existenz-Checks durch Struktur-Checks ergänzen (Parent/Geschwister/Reihenfolge). |
| Regex-basierter Import-Checker meldete False Positives aus Kommentaren | Für Code-Analyse AST statt Regex. |
| Statistik auf falscher Bezugsgröße (Verkaufszeit statt Einstiegszeit) lieferte plausible, aber irreführende Ergebnisse | Bei jeder Kennzahl explizit machen: Was genau misst sie, und ist das die Frage, die beantwortet werden soll? |

---

## 11. Ausgefüllte Beispiele (aus diesem Projekt)

Ein guter Prompt-Fill hat drei Zutaten: **Kontext** (Stack, Struktur, Test-Kommando), **Constraints** (was NICHT passieren darf) und **Prüfkriterien** (konkrete, messbare Zahlen). Die Vorlage liefert das Gerüst — diese drei füllst du.

### 11.1 Kickoff-Beispiel (retrospektiv: so hätte dieses Projekt gestartet)

```
[Basis-Prompt aus Abschnitt 0 einfügen — die 7 Regeln]

Wir starten ein neues Projekt: Ein persönlicher Trade-Kalender als PWA
(Vanilla JS, kein Framework, GitHub Pages). Datenquelle: CSV-Exporte von
Scalable Capital (Semikolon, deutsches Zahlenformat). Persistenz: eine
JSON-Datei in Google Drive (drive.file-Scope). Kernlogik: FIFO-Matching
von Buy/Sell-Zeilen zu geschlossenen Trades inkl. deutscher
Abgeltungsteuer (26,375%, Steuer MIT Vorzeichen — negative Steuer =
Erstattung bei Verlustverrechnung).

Constraints:
- Läuft im Browser, mobil + Desktop, offline-fähig (Service Worker)
- Keine Build-Pipeline, keine npm-Dependencies zur Laufzeit
- Ich bin C#/.NET-Entwickler — erkläre mir JS-Eigenheiten, wenn sie
  von .NET-Denkweise abweichen

Golden Values: Die eingecheckte Referenz besteht ausschließlich aus klar
markierten synthetischen Brokerzeilen. Von Hand verifiziert: 10 Trades,
Netto-P&L 1.115,44 €, Steuer 460,00 €, 3 offene Lots und 1.525,00 €
offener Einstand. Jede Änderung an der FIFO-Logik muss diese Werte exakt
reproduzieren. Persönliche Broker-Exporte bleiben außerhalb von Git.

Bekannte Fallen (bitte von Anfang an per Test absichern):
- Datumsfelder: keine UTC-Umwege, Zeitzonenverschiebung ist inakzeptabel
- Steuer nie mit Math.abs() verrechnen

Schlage mir jetzt die Modul-Struktur und die Test-Harness-Kategorien
vor. Noch keinen Feature-Code.
```

**Warum so:** Golden Values und bekannte Fallen stehen VOR der ersten Zeile Code. Die zwei teuersten Bugs dieses Projekts (Zeitzonen-Verschiebung, abs-Steuer) wären damit Tag-1-Tests gewesen statt Wochen-später-Funde.

### 11.2 Feature-Beispiel (MSCI-World-Vergleich, einsatzbereit)

```
Neues Feature für den Trade-Kalender: MSCI-World-Vergleich.

Kontext: Projekt liegt unter trade-kalender-pwa/, Module in js/
(config, helpers, fifo, views, import, storage, app). Test-Suite:
NODE_PATH=/tmp/node_modules node test/test_pwa.js — muss vor Lieferung
ALL GREEN sein (aktuell 155 Checks). Aktuelle Version v32; jede
Lieferung bumpt APP_VERSION in config.js UND CACHE in sw.js (Test
erzwingt Gleichheit).

Das Feature: Im Statistik-Tab soll meine Trading-Rendite pro Jahr
gegen den MSCI World vergleichbar sein.

1. Datenlage: Es gibt KEINE Kurs-API (bewusst — keine flaky externen
   Abhängigkeiten). Ich pflege den MSCI-Referenzwert manuell: pro Jahr
   ein Eingabefeld "MSCI World Rendite %" (z.B. aus dem Factsheet).
   Gespeichert in der Drive-JSON unter einem neuen Feld. Bestandsdaten
   haben das Feld nicht → Anzeige zeigt dann "Referenzwert eintragen"
   statt falscher Zahlen.
2. Logik pure in views.js: computeYearComparison(trades, capital,
   msciByYear) → pro Jahr { tradingRendite, msci, delta }.
   Trading-Rendite = Jahres-P&L / Einstand.
3. Ehrlichkeits-Constraint: Die Anzeige muss den Äpfel-Birnen-Charakter
   benennen (gehebelte Rendite auf Trading-Kapital vs. ungehebelter
   Index) — ein Hinweissatz reicht, aber er ist Pflicht.
4. Tests: Kernrechnung gegen Handwerte (P&L 10.400 € bei 104.000 €
   Einstand = 10,0%), Randfälle (Jahr ohne MSCI-Wert, Einstand 0),
   Struktur-Check (neue Section ist Geschwister der bestehenden im
   selben Container — wir hatten den zerschnittenen-DOCTYPE-Vorfall).
5. Kein Umbau bestehender Module außer views.js/app.js/index.html.
   Die JSON-Struktur bleibt abwärtskompatibel (nur neues Feld).

Liefere: geänderte Dateien, Test-Output, Verifikations-Zahlen,
bekannte Grenzen.
```

### 11.3 Die drei Handgriffe, die den Unterschied machen

1. **Kontext-Block als Textbaustein:** Struktur, Test-Kommando, Versionsregel wiederholen sich in jedem Feature-Prompt — in neuen Sessions weiß der Assistent sonst nichts davon. Einmal ablegen, immer voranstellen, Versionsstand aktuell halten.
2. **Constraints sind Verbote, nicht Wünsche:** „Keine Kurs-API", „JSON abwärtskompatibel", „Hinweissatz ist Pflicht" — das verhindert elegante Lösungen mit den falschen Trade-offs.
3. **Prüfkriterien mit konkreten Zahlen:** „10.400 bei 104.000 = 10,0%" ist testbar. „Soll korrekt rechnen" ist es nicht.

Die Anti-Patterns-Tabelle (Abschnitt 10) ist dabei der Zitat-Fundus: Projekt-Vorfälle („DOCTYPE-Vorfall", „Bestandsdaten ohne Feld") in Prompts zu referenzieren, verankert die Lehren dauerhaft.

---

## 12. Standards hinterlegen: Prompt → Dokument → Check

Die Meta-Regel über allen anderen: **Allgemeine Best Practices (SOLID, Clean Code, Testing-Pyramide …) kennt jeder gute Assistent und jeder Senior — aber „kennen" ist unverbindlich.** Verbindlich wird ein Standard erst durch drei Stufen, aufsteigend nach Härte:

1. **Prompt (Auswahl):** Der Basis-Prompt wählt aus, WELCHE Standards gelten und wie Konflikte aufgelöst werden (YAGNI vs. Erweiterbarkeit, schneller Fix vs. sauberer Umbau). Dauerhaft hinterlegen: als `CLAUDE.md` im Repo (Claude Code liest sie automatisch) bzw. als Projekt-Anweisung im Assistenten. Damit gilt der Standard in jeder Session — ohne Copy-Paste.
2. **Dokument (Begründung):** Dieses Vorlagen-Dokument mit der Anti-Patterns-Tabelle. Hier leben die Standards, die kein Lehrbuch kennt, weil sie aus den eigenen Vorfällen stammen — samt dem WARUM.
3. **Check (Erzwingung):** Die härteste Form. Ein Standard als Prosa degradiert; als automatischer Test nicht. „Steuer nie mit abs verrechnen" ist bei uns kein Merksatz, sondern ein Check, der rot wird. Linter-Config, `.editorconfig` und der Test-Harness sind Standards, die sich selbst durchsetzen — egal wer den Code anfasst.

Faustregel fürs Hinterlegen: **Definitionen nie (die sind „intus"), Auswahl und Projekt-Spezifika immer, kritische Regeln als Check.** Jede Regel, die zweimal verletzt wurde, wandert eine Stufe härter.

---

*Stand: Juli 2026 · destilliert aus trade-kalender v1–v32*
