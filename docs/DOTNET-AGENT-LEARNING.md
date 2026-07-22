# Lernplan: von .NET Framework 4.8 zu modernem .NET mit Agents

Diese Anleitung ist dein praktischer Weg vom gewohnten .NET Framework 4.8 zu
modernem C# und .NET. Sie ist bewusst auf **VS Code**, dieses Repository und
die Zusammenarbeit mit Coding-Agents zugeschnitten.

Die Empfehlung lautet:

1. Die funktionierende JavaScript-PWA bleibt bestehen.
2. Du baust daneben eine kleine, moderne .NET-Lernloesung.
3. Zuerst portierst du nur die pure Trading-Domaene und ihre Tests.
4. Blazor kommt erst hinzu, wenn du die Domaene selbst erklaeren und testen
   kannst.
5. Der Agent beschleunigt dich, ersetzt aber nicht dein Verstaendnis und deine
   fachlichen Entscheidungen.

Der vorhandene [.NET-Leitfaden](DOTNET-GUIDE.md) erklaert, wie die
JavaScript-Module in C#-Begriffe uebersetzt werden. Dieses Dokument beantwortet
die naechste Frage: Wie lernst du die moderne Arbeitsweise praktisch, und
welche Arbeit bleibt bei dir?

## Dein aktueller Stand

Am 19. Juli 2026 wurde die lokale Entwicklungsumgebung rein lesend geprueft:

| Bereich | Vorhandener Stand | Konsequenz |
| --- | --- | --- |
| Editor | VS Code 1.129.1 | Vollkommen ausreichend; Visual Studio ist fuer diesen Lernpfad nicht erforderlich |
| C#-Werkzeuge | C# Dev Kit, C#-Extension und .NET-Runtime-Extension | Bereits installiert |
| Agent | Codex-Extension | Bereits installiert |
| SDK | Nur .NET SDK 6.0.101 | Fuer neue Lernprojekte nicht mehr verwenden |
| Runtimes | .NET Core 3.1 sowie .NET 6 | Beide Versionslinien sind aus dem Support |
| SDK-Auswahl | Keine `global.json` unter dem gemeinsamen Source-Ordner | Nach Installation wird standardmaessig das neueste passende SDK verwendet |

Deine Erfahrung mit .NET Framework 4.8 ist wertvoll: C#, OOP, Exceptions,
Generics, LINQ und viele Bibliothekskonzepte bleiben relevant. Modernes .NET
ist aber nicht einfach „Framework 4.8 mit neuer Versionsnummer“. Projektformat,
CLI, Deployment, Konfiguration, Hosting, Tests und Web-Stack haben sich
deutlich veraendert.

Stand dieses Dokuments ist **.NET 10 als aktuelle LTS-Version**. .NET 11 ist
zu diesem Zeitpunkt nur Preview und fuer den Lernpfad nicht sinnvoll.
.NET-SDKs koennen parallel installiert werden. Du musst vorhandene .NET
Framework-, .NET Core 3.1- oder .NET-6-Installationen deshalb nicht fuer den
Start entfernen. Alte produktive Projekte bleiben zunaechst unberuehrt.

## Einmaliges Setup in VS Code

### 1. .NET 10 SDK installieren

Oeffne ein neues PowerShell-Terminal und versuche:

```powershell
winget install Microsoft.DotNet.SDK.10
```

Falls `winget` in deiner Windows-Sitzung nicht funktioniert, lade auf der
offiziellen [.NET-Downloadseite](https://dotnet.microsoft.com/en-us/download/dotnet)
den **.NET 10 SDK x64 Installer**. Installiere das SDK, nicht nur eine Runtime.
Das SDK enthaelt die zum Entwickeln benoetigten Runtimes und Werkzeuge.

Schliesse danach alle VS-Code-Fenster und Terminals, oeffne VS Code neu und
pruefe:

```powershell
dotnet --list-sdks
dotnet --info
dotnet new list
```

In `dotnet --list-sdks` muss nun eine `10.0.x`-Zeile erscheinen. Bleibt nur
`.NET SDK 6.0.101` sichtbar, pruefe zuerst, ob wirklich das SDK installiert
wurde und ob das Terminal nach der Installation neu gestartet wurde.

### 2. Vorhandene Extensions behalten

Diese bereits vorhandenen Extensions reichen:

- C# Dev Kit
- C# von Microsoft
- .NET Install Tool beziehungsweise Runtime-Extension
- Codex

C# Dev Kit ist fuer moderne, **SDK-style** Projekte ausgelegt. Das klassische
.NET-Framework-Projektsystem wird nicht vollstaendig unterstuetzt. Genau
deshalb solltest du ein neues Lernprojekt nicht als altes
`packages.config`-/nicht-SDK-Projekt anlegen. Falls du spaeter ein echtes
Framework-4.8-Projekt in VS Code oeffnen musst, kann die normale C#-Extension
mit weniger Komfort einspringen; das ist aber nicht die Zielarchitektur des
Lernprojekts.

### 3. Einen getrennten Lernordner verwenden

Lege den Port nicht mitten in die bestehende PWA. Ein sinnvoller Pfad waere
zum Beispiel ein Geschwisterordner:

```text
source/repos/
  trade-kalender/          bestehende JavaScript-PWA
  trade-calendar-dotnet/   neue Lernloesung
```

So bleiben Git-Historie, Abhaengigkeiten, Versionsregeln und Deployments
getrennt. Der Agent darf beide Projekte lesen, aber nur im jeweils erteilten
Auftrag schreiben.

## Was sich seit .NET Framework 4.8 geaendert hat

Lerne nicht jede neue Sprachfunktion gleichzeitig. Konzentriere dich zuerst
auf die Unterschiede, die deinen taeglichen Arbeitsablauf veraendern:

| Thema | Framework-4.8-Denke | Moderne .NET-Denke |
| --- | --- | --- |
| Projektdatei | Ausfuehrliche `.csproj`, viele einzelne Eintraege | Kurze SDK-style `.csproj`, Quelldateien automatisch enthalten |
| Werkzeuge | Vieles ueber Visual-Studio-Dialoge | `dotnet`-CLI ist der reproduzierbare Standard |
| Pakete | `packages.config` oder alte NuGet-Vertraege | `PackageReference` direkt in der Projektdatei |
| Zielplattform | Windows und klassisches .NET Framework | Modernes .NET ist side-by-side und grundsaetzlich plattformuebergreifend |
| Sprache | Oft C# 7.x | .NET 10 nutzt C# 14 als aktuelle Sprachversion |
| Nullwerte | Laufzeitfehler und Konventionen | Nullable Reference Types machen Absichten im Compiler sichtbar |
| Datenmodelle | Veraenderliche Klassen/DTOs | Records, `init`, Pattern Matching und unveraenderliche Modelle |
| Datum | Meist `DateTime` fuer alles | `DateOnly`, `TimeOnly`, `DateTimeOffset` nach fachlicher Bedeutung |
| JSON | Oft Newtonsoft.Json | `System.Text.Json` ist der eingebaute Standard |
| Abhaengigkeiten | Eigene Container oder Framework-Loesungen | DI, Konfiguration und Logging sind im Generic Host/ASP.NET Core integriert |
| Web | ASP.NET MVC/Web API auf System.Web | ASP.NET Core mit Middleware, Minimal APIs, Razor und Blazor |
| Tests | Test Runner stark an IDE gebunden | `dotnet test` laeuft lokal und in CI identisch |

Fuer dieses Projekt sind zunaechst besonders wichtig:

- `decimal` fuer Geld statt Gleitkommazahlen,
- Records und Nullable Reference Types fuer den Datenvertrag,
- pure Methoden und unveraenderliche Rueckgaben fuer FIFO,
- `DateOnly` und `TimeOnly` gegen Datumsverschiebungen,
- `async`/`await` plus `CancellationToken` an I/O-Grenzen,
- xUnit und die `dotnet`-CLI,
- Interfaces nur an echten Infrastrukturgrenzen.

## Was du selbst machen solltest

Der Lerneffekt entsteht an den Stellen, an denen du Entscheidungen triffst und
das Ergebnis erklaeren kannst. Diese Arbeit solltest du selbst fuehren:

- Fachregeln formulieren: Was ist ein Trade, ein Lot, ein Verkauf und eine
  Steuererstattung?
- Einen synthetischen Fall von Hand rechnen, bevor ein Test geschrieben wird.
- Die ersten Records und die erste pure Berechnung selbst tippen.
- Entscheiden, welche Klasse oder welches Interface eine fachliche
  Verantwortung besitzt.
- Akzeptanzkriterien und konkrete Sollwerte festlegen.
- Jeden Agenten-Diff mit `git diff` lesen und jede relevante Zeile verstehen.
- Fehler im Debugger nachvollziehen, statt nur einen Fix zu uebernehmen.
- `dotnet build` und `dotnet test` selbst ausfuehren und rote Meldungen lesen.
- Nach jeder Etappe einen **Teach-back** machen: Erklaere ohne Vorlage, wie der
  Datenfluss funktioniert und warum die Tests den Vertrag beweisen.
- Commit, Merge, Push und Release selbst freigeben.

Eine gute Lernregel ist: **Das erste Exemplar eines neuen Konzepts machst du
selbst; Wiederholungen darf der Agent beschleunigen.** Den ersten Record,
ersten xUnit-Test, ersten Parser-Randfall und ersten DI-Vertrag solltest du
also nicht komplett generieren lassen.

## Was der Agent machen darf

Ein Agent ist besonders gut als Erklaerer, Reviewer und beschleunigender
Pair-Programming-Partner:

- vorhandenen Code kartieren und in vertraute .NET-Begriffe uebersetzen,
- eine kleine Aufgabenfolge oder zwei Architekturvarianten vorschlagen,
- dir Fragen stellen, bis deine Akzeptanzkriterien testbar sind,
- deinen selbst geschriebenen Code reviewen, ohne ihn sofort umzubauen,
- aus von dir vorgegebenen Handwerten zusaetzliche Randfalltests erzeugen,
- nach dem ersten selbst gebauten Muster repetitive Records, Mappings oder
  Testfaelle ergaenzen,
- eine klar begrenzte Funktion implementieren, wenn Ein- und Ausgabe sowie
  Verbote feststehen,
- Compiler- und Testfehler analysieren und den Mechanismus erklaeren,
- Dokumentation aktualisieren,
- `dotnet test`, Format- und Diff-Pruefungen ausfuehren,
- am Ende einen read-only Code Review gegen deine Kriterien machen.

Der Agent sollte bei Lernaufgaben nicht nur das Ergebnis liefern. Fordere
immer eine kurze Begruendung zu Typwahl, Schicht, Randfaellen und Testbeweis.

## Was du niemals blind delegierst

Der Agent kann bei diesen Themen helfen, aber du musst jeden Schritt bewusst
pruefen und freigeben:

- echte Finanzdaten, Broker-Exporte, Passphrasen, OAuth-Tokens und Secrets,
- Aenderungen an Golden Values oder fachlichen Handrechnungen,
- Datenmigrationen und Loeschvorgaenge,
- Authentifizierung, Kryptografie und Berechtigungen,
- grosse Architektur-Rewrites oder ein Austausch des Technologie-Stacks,
- Paket- und Framework-Upgrades ohne Release-Notes und Migrationsplan,
- Git-History-Rewrites, Force-Pushes, Deployments und Releases,
- automatisch erzeugte Klassen, die du nicht selbst erklaeren kannst,
- den finalen Merge oder Commit.

Speziell bei dieser App darf kein Agent reale Finanzdaten in seinen Prompt,
seine Test-Fixtures, Logs oder Commits uebernehmen. Verwende ausschliesslich
die klar synthetischen Referenzdaten aus `test/`.

## Rollenmodell pro Aufgabe

Waehle den Agentenmodus bewusst, statt jede Aufgabe als „mach mal“ zu
formulieren:

| Modus | Du | Agent | Geeignet fuer |
| --- | --- | --- | --- |
| Erklaermodus | Stellst Fragen und fasst selbst zusammen | Liest und erklaert, aendert nichts | Neue Syntax, Architektur und fremder Code |
| Gefuehrte Uebung | Schreibst den ersten Entwurf | Gibt Hinweise und stellt Rueckfragen | Records, erste Tests, LINQ, Nullable |
| Pairing | Definierst Test und Schnitt | Ergaenzt einen kleinen Teil, du reviewst sofort | FIFO-Randfaelle und Refactorings |
| Begrenzte Delegation | Gibst Ziel, Kontext, Grenzen und Fertig-Kriterien vor | Implementiert und verifiziert den klaren Ausschnitt | Wiederholungen und gut verstandene Arbeit |
| Reviewmodus | Lieferst fertigen Diff | Sucht read-only nach Fehlern und fehlenden Tests | Vor jedem Commit |

Wechsle erst zur begrenzten Delegation, wenn du den fachlichen Mechanismus
bereits verstehst. Bei einem neuen Thema sind Erklaermodus und gefuehrte Uebung
produktiver als eine sofortige Komplettloesung.

## Lernpfad

Jede Phase endet mit Code, Tests und einer eigenen Erklaerung. Beginne nicht
mit Blazor; sonst lernst du Sprache, Framework, UI, Browser und Domaene
gleichzeitig.

### Phase 0: Werkzeugkette verstehen

**Du:** Installiere .NET 10, fuehre die drei Diagnosekommandos aus und erstelle
ueber die Command Palette `>.NET: New Project` eine Console App. Fuehre sie
einmal mit `dotnet run` aus.

**Agent:** Prueft deine Ausgabe und erklaert SDK, Runtime, Target Framework und
SDK-style `.csproj`, ohne Dateien zu aendern.

**Fertig wenn:** Du kannst erklaeren, warum SDK und Runtime verschieden sind
und welche SDK-Version dein Projekt baut.

### Phase 1: Moderner C#-Refresh in einer Console App

**Du:** Schreibe kleine Beispiele fuer Records, Nullable Reference Types,
Pattern Matching, LINQ, `DateOnly` und eine asynchrone Methode mit
`CancellationToken`.

**Agent:** Gibt Uebungen und reviewt deinen Code. Er liefert zuerst Hinweise,
nicht sofort die Musterloesung.

**Fertig wenn:** Der Build ist ohne Warnungen gruen und du kannst sagen, wann
du `record`, `class`, `struct`, `DateOnly` und `DateTimeOffset` waehlen
wuerdest.

### Phase 2: xUnit und Test-first

Erstelle ein kleines Testprojekt und lerne die Standardbefehle:

```powershell
dotnet new xunit -n TradeCalendar.Domain.Tests
dotnet test
```

**Du:** Schreibst einen roten xUnit-Test fuer einen von Hand gerechneten Trade
und implementierst danach die kleinste `TradePnl`-Methode.

**Agent:** Reviewt den Test auf Aussagekraft und schlaegt Randfaelle vor.

**Fertig wenn:** Du kannst Rot, Gruen und eine Gegenprobe zeigen und erklaeren,
warum der Test die echte Produktionsmethode statt einer Testkopie ausfuehrt.

### Phase 3: TradeCalendar.Domain aufbauen

Erstelle eine Solution mit einer Klassenbibliothek und einem Testprojekt:

```powershell
dotnet new sln -n TradeCalendar
dotnet new classlib -n TradeCalendar.Domain -o src/TradeCalendar.Domain
dotnet new xunit -n TradeCalendar.Domain.Tests -o tests/TradeCalendar.Domain.Tests
dotnet sln add src/TradeCalendar.Domain/TradeCalendar.Domain.csproj
dotnet sln add tests/TradeCalendar.Domain.Tests/TradeCalendar.Domain.Tests.csproj
dotnet add tests/TradeCalendar.Domain.Tests/TradeCalendar.Domain.Tests.csproj reference src/TradeCalendar.Domain/TradeCalendar.Domain.csproj
```

**Du:** Entwirfst `Trade`, `OpenLot` und Geld-/Datumsfelder anhand des
[Datenmodells](DATA_MODEL.md). Portiere zuerst nur `tradePnl` und
`closePositionPnl`.

**Agent:** Vergleicht deinen Entwurf read-only mit `app-data.js` und `fifo.js`
und nennt semantische Luecken.

**Fertig wenn:** `TradeCalendar.Domain` kennt weder UI noch Datei, Netzwerk,
Google Drive oder Blazor.

### Phase 4: FIFO mit Golden Values

**Du:** Erklaerst FIFO mit Papierbeispielen und schreibst die ersten
Sortier-, Teilverkaufs- und Ueberverkaufstests.

**Agent:** Darf nach deinem ersten Durchstich repetitive Mapping- und
Randfalltests ergaenzen. Er darf die Golden Values nicht veraendern.

**Fertig wenn:** Die .NET-Implementierung liest die synthetischen
Referenzdaten und reproduziert exakt zehn Trades, 1.115,44 Euro P&L,
460,00 Euro Steuer, drei offene Lots und 1.525,00 Euro offenen Einstand.

### Phase 5: Application-Schicht und Import

**Du:** Definierst Use Cases und Fehlervertraege fuer Import, Deduplizierung
und Ledger-Replay. Entscheide, welche Fehler erwartbare Ergebnisse und welche
Exceptions sind.

**Agent:** Portiert einen klar begrenzten Parserteil oder erstellt Testmatrizen,
nachdem du CSV-Regeln und Sollwerte festgelegt hast.

**Fertig wenn:** Parsing und Orchestrierung von der Domaenenrechnung getrennt
sind und keine echte Brokerdatei in Tests benoetigt wird.

### Phase 6: Infrastruktur hinter Interfaces

**Du:** Entwirfst ein kleines `ITradeRepository` und implementierst zuerst
einen In-Memory-Adapter.

**Agent:** Kann spaeter Datei- oder Browseradapter scaffolden und
Vertragstests ergaenzen.

**Fertig wenn:** Domain- und Application-Tests ohne Netzwerk, Browser und
Datenbank laufen. Google Drive und IndexedDB bleiben noch draussen.

### Phase 7: Blazor als duenne UI

Erst jetzt erstellst du ein Blazor-Webprojekt. Fuer .NET 10 ist `blazor` die
moderne Blazor-Web-App-Vorlage; `blazorwasm` bleibt fuer eine eigenstaendige
WebAssembly-App verfuegbar.

**Du:** Entscheidest bewusst das Render-Modell und baust eine einzige Seite
mit synthetischen In-Memory-Daten.

**Agent:** Darf Razor-Komponenten aus bereits fertigen View Models scaffolden
und Barrierefreiheit reviewen.

**Fertig wenn:** Die Blazor-UI keine FIFO-, Steuer- oder Importlogik enthaelt
und die Domain-Suite unveraendert gruen bleibt.

### Phase 8: Browser-, PWA- und Auth-Grenzen

IndexedDB, Service Worker, Offline-Cache, Google Identity Services und Drive
kommen zuletzt. Auch mit Blazor bleiben dies Webplattform-Themen und koennen
JavaScript-Interop erfordern.

**Du:** Entscheidest, ob der Lernwert den Aufwand rechtfertigt. Eine
Produktmigration ist ein eigenes Projekt mit Paritaets- und Rueckfallplan.

**Agent:** Erstellt eine Risikoanalyse und einen Testplan, aber keine
stillschweigende Migration realer Daten.

## VS-Code-Arbeitsablauf

Oeffne immer den Root der .NET-Solution in VS Code. Nutze den Explorer fuer
Navigation, den integrierten Test Explorer fuer einzelne Tests und das
Terminal als reproduzierbare Wahrheit.

Der normale Zyklus:

```powershell
dotnet restore
dotnet build
dotnet test
dotnet format --verify-no-changes
git diff
git status --short
```

Hinweise:

- `dotnet restore` ist meist bereits Teil von Build/Test, bleibt aber fuer die
  Fehlersuche nuetzlich.
- Starte Debugging mit F5 und setze Haltepunkte in Domain und Tests.
- Verstehe die erste Compilerwarnung, bevor du weitere Aenderungen machst.
- Verwende `dotnet format` erst bewusst; ein grosser mechanischer Diff kann
  eine kleine Lernaufgabe unnoetig verdecken.
- Committe eine Phase erst, wenn du den Diff selbst gelesen hast.

## Agenten-Kontrollschleife

Verwende fuer jede Aenderung dieselbe Schleife:

1. **Ziel festlegen:** Ein sichtbares Verhalten oder eine kleine Lernfrage.
2. **Kontext geben:** Betroffene Dateien, vorhandene Tests und fachliche Werte.
3. **Grenzen setzen:** Was darf nicht geaendert werden? Darf der Agent
   schreiben oder nur reviewen?
4. **Akzeptanzkriterien notieren:** Konkrete Eingabe, Ausgabe und
   Testkommandos.
5. **Plan pruefen:** Bei mehr als einem kleinen Schritt zuerst nur planen.
6. **Rot beweisen:** Einen neuen Vertrag zuerst als fehlschlagenden Test
   sichtbar machen.
7. **Klein implementieren:** Nur der vereinbarte Ausschnitt.
8. **Verifizieren:** `dotnet test`, gegebenenfalls `dotnet build` und Format.
9. **Diff reviewen:** Du liest `git diff`; danach kann ein Agent noch einmal
   read-only reviewen.
10. **Teach-back:** Du erklaerst dem Agenten den Datenfluss. Bitte ihn, deine
    Erklaerung auf Luecken zu pruefen oder drei Kontrollfragen zu stellen.
11. **Commit entscheiden:** Erst der Mensch entscheidet, ob der Stand
    uebernommen wird.

Diese Schleife macht Agentenarbeit nachvollziehbar. „Tests gruen“ reicht nicht,
wenn der Test die falsche Frage prueft oder du die Aenderung nicht erklaeren
kannst.

## Prompt-Vorlagen

Gute Codex-Prompts enthalten vier feste Teile: Ziel, Kontext, Grenzen und
Fertig-Kriterien. Die ausfuehrlichen Projektstandards stehen in
[dev-prompts-vorlagen.md](../dev-prompts-vorlagen.md).

### Erklaeren, ohne Code zu aendern

```text
Ziel:
Erklaere mir [Konzept oder Datei] aus Sicht eines .NET-Framework-4.8-
Entwicklers. Stelle danach drei Kontrollfragen.

Kontext:
Ich lerne modernes .NET 10 mit VS Code. Relevante Dateien: [Pfade].

Grenzen:
Nur lesen. Keine Dateien aendern, keine Pakete installieren und keine fertige
Musterloesung vorwegnehmen. Verwende ein kleines Beispiel aus diesem Projekt.

Fertig wenn:
Ich kann Verantwortung, Ein-/Ausgaben, Abhaengigkeiten und wichtigsten
Randfall in eigenen Worten erklaeren.
```

### Gefuehrte Uebung

```text
Ziel:
Ich implementiere selbst [kleine Aufgabe]. Fuehre mich mit Hinweisen und
Rueckfragen.

Kontext:
Projekt: TradeCalendar.Domain, .NET 10, xUnit. Vorhandener Test: [Name].

Grenzen:
Aendere keinen Code. Gib immer nur den naechsten Hinweis. Die komplette
Loesung erst, wenn ich ausdruecklich darum bitte.

Fertig wenn:
Mein eigener Code baut ohne Warnung, der Test ist gruen und ich habe dir
erklaert, warum die Typen und Randfaelle passen.
```

### Klar begrenzte Implementierung

```text
Ziel:
Implementiere [exaktes Verhalten].

Kontext:
Betroffene Projekte/Dateien: [Pfade]. Handwert:
[Eingabe] ergibt [Ausgabe]. Testkommando: dotnet test.

Grenzen:
Keine Aenderung an Golden Values, Paketversionen, Persistenz, Auth oder
anderen Modulen. Erst Test rot zeigen, dann minimal implementieren.
Keine echten Finanzdaten. Kein Commit oder Push.

Fertig wenn:
Der neue Normalfall, ein Randfall und ein ungueltiger Fall sind permanent
getestet; kompletter dotnet test ist gruen; git diff ist geprueft; geaenderte
Dateien und bekannte Grenzen sind berichtet.
```

### Read-only Code Review

```text
Ziel:
Reviewe meinen aktuellen Diff auf fachliche Fehler, moderne .NET-Konventionen,
fehlende Tests und unnoetige Komplexitaet.

Kontext:
Aufgabe und Akzeptanzkriterien: [Text]. Pruefe git diff und relevante
Nachbarstellen.

Grenzen:
Nichts aendern. Keine Geschmacksdiskussion ohne konkretes Risiko. Findings
nach Schwere sortieren und Datei/Zeile nennen.

Fertig wenn:
Jedes Finding erklaert Auswirkung, Reproduktion und kleinste sinnvolle
Korrektur. Wenn nichts gefunden wird, nenne verbleibende Testluecken.
```

### Bug gemeinsam verstehen

```text
Ziel:
Finde die Root Cause fuer [Symptom], ohne sofort zu fixen.

Kontext:
Fehlermeldung, reproduzierbare Schritte und Umgebung: [Details].

Grenzen:
Zuerst nur Diagnose. Keine Daten, Golden Values oder Abhaengigkeiten aendern.
Formuliere danach einen Regressionstest, der vor dem Fix rot sein muss.

Fertig wenn:
Der Fehlermechanismus, betroffene Grenze, Gegenbeispiel und erwartete
Testaussage sind nachvollziehbar. Implementierung erst nach meiner Freigabe.
```

## Vier-Wochen-Einstieg

Der Zeitbedarf ist wichtiger als ein starres Datum. Drei bis fuenf Einheiten
von jeweils 45 bis 90 Minuten pro Woche reichen fuer einen soliden Einstieg.

| Woche | Dein Schwerpunkt | Sinnvolle Agentenrolle | Ergebnis |
| --- | --- | --- | --- |
| 1 | Setup, CLI, SDK-style, Records, Nullable, Datum | Erklaerer und Quizpartner | Kleine Console App ohne Warnungen |
| 2 | xUnit, Test-first, `decimal`, erste Domain Records | Reviewer, nicht Autor | `TradePnl` und Handwerttests |
| 3 | FIFO, LINQ, Unveraenderlichkeit, Golden Values | Pairing fuer Randfaelle | Gruene `TradeCalendar.Domain`-Suite |
| 4 | Application-Grenzen, Repository-Interface, erste Razor-Seite | Architekturreview und Scaffold nach Freigabe | Kleine Blazor-UI auf synthetischen Daten |

Wenn du eine Phase nicht selbst erklaeren kannst, verlaengerst du sie. Das ist
kein Rueckschritt, sondern verhindert, dass generierter Code dein Wissen
ueberholt.

## Wann du bereit fuer eine echte Portierungsentscheidung bist

Ein Lern-Port ist noch keine Produktmigration. Bewerte eine Migration erst,
wenn alle folgenden Aussagen wahr sind:

- Die .NET-Domain reproduziert alle synthetischen Golden Values.
- Import-, Datums-, Steuer- und Deduplizierungsregeln sind paritaetisch
  getestet.
- Du kannst Domain, Application, Infrastructure und UI ohne Agent erklaeren.
- Offline-, PWA-, IndexedDB-, OAuth- und Drive-Risiken sind separat geplant.
- Es gibt einen Rueckfall auf die bestehende PWA und eine sichere
  Datenmigration.
- Der Rewrite liefert einen klaren Produktnutzen, nicht nur vertrautere
  Syntax.

Bis dahin ist die bestehende PWA dein laufendes Produkt und die .NET-Solution
dein Lernlabor. Diese Trennung gibt dir maximalen Lernwert bei minimalem Risiko.

## Offizielle Quellen

Die Versionsangaben wurden am 19. Juli 2026 gegen aktuelle Primaerquellen
geprueft:

- [.NET-Downloads und Supportstatus](https://dotnet.microsoft.com/en-us/download/dotnet)
- [.NET unter Windows installieren](https://learn.microsoft.com/en-us/dotnet/core/install/windows)
- [C# Dev Kit FAQ und Grenzen klassischer .NET-Framework-Projekte](https://code.visualstudio.com/docs/csharp/cs-dev-kit-faq)
- [Console App mit VS Code erstellen](https://learn.microsoft.com/en-us/dotnet/core/tutorials/create-console-app?pivots=vscode)
- [Unit Tests mit xUnit und `dotnet test`](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-csharp-with-xunit)
- [Blazor-Tooling und Templates](https://learn.microsoft.com/en-us/aspnet/core/blazor/tooling?view=aspnetcore-10.0)
- [Neues in C# 14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14)
- [.NET-Framework-Portierungsuebersicht](https://learn.microsoft.com/en-us/dotnet/core/porting/framework-overview)
- [Codex Best Practices](https://learn.chatgpt.com/guides/best-practices)

