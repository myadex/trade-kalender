# Von .NET zu diesem Projekt

Diese Anleitung richtet sich an Entwickler, die hauptsächlich C# und .NET
kennen. Sie übersetzt die Architektur und die wichtigsten JavaScript-Muster
des Trade Kalenders in vertraute .NET-Begriffe. Die technische Referenz bleibt
die [Architekturdokumentation](../architecture/ARCHITECTURE.md); hier geht es
um das mentale
Modell beim Lesen und Lernen.

Die wichtigste Erkenntnis zuerst: In diesem Projekt gibt es kaum `class`-
Deklarationen, aber sehr wohl klar getrennte Verantwortungen. Die Einheit, die
du in C# oft als Klasse oder Service kennst, ist hier meistens ein ES-Modul.

Wenn du modernes .NET nicht nur zuordnen, sondern mit VS Code und Coding-Agents
praktisch lernen willst, gehe danach mit dem
[.NET-/Agenten-Lernplan](DOTNET-AGENT-LEARNING.md) weiter.

## Das mentale Übersetzungsmodell

| C#/.NET | Dieses Projekt |
| --- | --- |
| `.csproj` und Namespaces | Ordnerstruktur und ES-Module |
| `using TradeCalendar.Domain` | `import { ... } from './fifo.js'` |
| `public` | `export` |
| `internal` oder `private` | Nicht exportierte Funktion im Modul |
| Statische Serviceklasse | Modul mit exportierten puren Funktionen |
| `record` oder DTO | JavaScript-Objekt mit festem Datenvertrag |
| `List<T>` / `IReadOnlyList<T>` | `Array` |
| LINQ `Where/Select/Aggregate` | `filter/map/reduce` |
| `Task<T>` | `Promise<T>` |
| `async` / `await` | `async` / `await` mit fast gleicher Bedeutung |
| `HttpClient` | Browser-`fetch` |
| Constructor Injection | Abhängigkeit als Funktionsparameter |
| Repository/Adapter | `storage.js` oder `local-storage.js` |
| Controller/Orchestrator | `app.js` |
| Razor-Komponente | HTML plus kleines DOM-/Dialogmodul |
| `Program.cs` / Composition Root | Modulstart und `bootApp()` in `app.js` |
| xUnit-Testprojekt | `test/test_pwa.cjs` |

ES-Module werden einmal geladen und besitzen einen eigenen gekapselten Scope.
Nicht exportierte Variablen sind von außen unsichtbar. Das kommt einer
statischen Klasse mit privaten Membern nahe, ohne dass dafür eine Klasse
deklariert werden muss.

## Warum kaum Klassen?

Die Kernlogik ist bewusst funktional aufgebaut. Eine Berechnung erhält alle
Eingaben als Parameter und liefert ein neues Ergebnis zurück. Sie besitzt
keinen versteckten Zustand und greift weder auf DOM noch Netzwerk zu.

Ein typisches Beispiel aus `fifo.js`:

```javascript
export function tradePnl(buy, sell, tax) {
  return +(sell - buy - tax).toFixed(2);
}
```

Das C#-Gegenbild wäre beispielsweise:

```csharp
public static class TradeCalculator
{
    public static decimal CalculatePnl(
        decimal buy,
        decimal sell,
        decimal tax)
        => decimal.Round(sell - buy - tax, 2);
}
```

Eine Instanz von `TradeCalculator` hätte keinen Zustand und keinen
Lebenszyklus. Die Klasse wäre nur ein Behälter für eine Funktion. Das
JavaScript-Modul übernimmt bereits diese Kapselung, daher bringt eine
zusätzliche Klasse hier wenig Nutzen.

Klassen wären sinnvoll, wenn mehrere Operationen echte gemeinsame
Instanzinvarianten oder einen eigenen Lebenszyklus hätten. Das trifft auf die
meisten Berechnungen des Projekts nicht zu. Die einzige echte Fehlerklasse
`DriveConflictError` in `storage.js` ist deshalb auch tatsächlich eine
`class`: Sie braucht eine erkennbare Laufzeitidentität für `instanceof` und
trägt Statusdaten.

## Modul-zu-.NET-Zuordnung

Die folgende Tabelle liest jedes wichtige Modul so, als wäre es Teil einer
klassischen .NET-Solution:

| JavaScript-Modul | Gedankliches .NET-Gegenstück | Verantwortung |
| --- | --- | --- |
| `config.js` | `static class AppOptions` | Konstanten, Scope, Steuersatz und App-Version |
| `app-data.js` | DTOs plus Validator/Mapper | Kanonischen Zustand erzeugen und fremde JSON normalisieren |
| `fifo.js` | Domain Service | FIFO, Steuer, P&L und offene Lots berechnen |
| `import.js` | Parser plus Application Service | Broker-CSV validieren, deduplizieren und Ledger pflegen |
| `views.js` | Query Services | Kalender, Kennzahlen und Statistikprojektionen berechnen |
| `helpers.js` | Kleine Utility-Klassen | Datum, Formatierung und Ausgabeabsicherung |
| `safety-backups.js` | Snapshot Service | Interne Zustandskopien bilden und restaurieren |
| `storage-migration.js` | Application Service | Zwei Speicherstände vergleichen und einen Zielstand bilden |
| `storage.js` | `GoogleDriveRepository` / API-Client | Drive lesen und mit ETag sicher schreiben |
| `local-storage.js` | `IndexedDbTradeRepository` | Lokalen Zustand und Speichermodus persistieren |
| `backup-crypto.js` | Crypto Service | Backup-Envelope ver- und entschlüsseln |
| `navigation.js` | Presenter/Razor-Komponente | Haupt- und Statistiknavigation im DOM steuern |
| `trade-dialogs.js` | Formular-Komponente | Hinzufügen-/Bearbeiten-Dialog lesen und darstellen |
| `position-dialog.js` | Formular-Komponente | Positionsschließung und Vorschau darstellen |
| `import-dialogs.js` | Import-Komponente | Dateiauswahl, Vorschau und Bericht rendern |
| `metrics-view.js` | Read-only Razor-Komponente | Fertige Kennzahlen darstellen |
| `trade-search.js` | Such-Komponente | Filter lesen und Ergebnisse rendern |
| `dialog-accessibility.js` | UI-Infrastruktur-Service | Fokus, Escape, Tab-Falle und Scrollsperre |
| `app.js` | Controller plus Composition Root | Zustand, Module, Browser-I/O und Ereignisse verbinden |
| `sw.js` | Clientseitiger Cache-Proxy | App-Shell installieren und offline ausliefern |
| `sw-register.js` | Startup-/Update-Service | Service Worker unabhängig vom Hauptmodul starten |

Wichtig: Diese Zuordnung erklärt die Rolle, sie fordert keine 1:1-Portierung.
Ein Modul kann mehrere kleine Funktionen exportieren, wo du in C# vielleicht
mehrere Klassen anlegen würdest.

## Datenobjekte: JavaScript-Objekt statt C#-Record

Der kanonische Zustand wird in `app-data.js` als Objekt erzeugt:

```javascript
export function emptyAppData() {
  return {
    trades: [],
    openLots: [],
    capital: 0,
    importRows: [],
    importBaseOpenLots: null,
    hiddenOpenPositions: [],
    safetyBackups: []
  };
}
```

Ein mögliches, vereinfachtes C#-Modell wäre:

```csharp
public sealed record Trade(
    string Uid,
    DateOnly Date,
    string Isin,
    string Description,
    decimal Shares,
    decimal Buy,
    decimal Sell,
    decimal Tax,
    decimal Pnl);

public sealed record AppData(
    IReadOnlyList<Trade> Trades,
    IReadOnlyList<OpenLot> OpenLots,
    decimal Capital,
    IReadOnlyList<ImportRow> ImportRows,
    IReadOnlyList<OpenLot>? ImportBaseOpenLots,
    IReadOnlyList<HiddenOpenPosition> HiddenOpenPositions,
    IReadOnlyList<SafetyBackup> SafetyBackups);
```

JavaScript prüft diese Typen nicht beim Kompilieren. Der Schutz liegt hier an
der Laufzeitgrenze: `normalizeAppData` akzeptiert JSON aus Drive, IndexedDB
oder Backups und baut daraus nur die erlaubte Form. Das entspricht grob einer
Kombination aus Deserialisierung, Validierung und Mapping auf ein internes DTO.

Die vollständigen Feldregeln stehen im
[Datenmodell](../architecture/DATA_MODEL.md).

## Pure Functions statt zustandsbehafteter Services

Eine pure Funktion:

- liest nur ihre Parameter,
- verändert die Parameter nicht,
- greift nicht auf globale Variablen, DOM, Uhr oder Netzwerk zu,
- liefert für dieselben Eingaben dasselbe Ergebnis.

`fifoMatch(rows, existingOpenLots)` ist deshalb gedanklich eine statische
Domain-Service-Methode. `Date.now()` oder `fetch()` werden dort nicht
aufgerufen. Benötigt eine Funktion Zeit oder eine Fremdbibliothek, wird diese
Abhängigkeit als Parameter übergeben.

Das ist Constructor Injection ohne Konstruktor:

```javascript
export function parseScalableXlsx(buffer, xlsxLib) {
  const workbook = xlsxLib.read(buffer, {
    type: 'array',
    cellDates: true
  });
  // ...
}
```

Ein C#-Gegenstück könnte so aussehen:

```csharp
public sealed class ScalableParser(IXlsxReader xlsxReader)
{
    public ParseResult Parse(ReadOnlyMemory<byte> buffer)
    {
        var workbook = xlsxReader.Read(buffer);
        // ...
    }
}
```

In JavaScript reicht bei einer einzelnen Operation der Parameter
`xlsxLib`. Im Test wird ein kontrolliertes Objekt übergeben. Das Ziel ist in
beiden Sprachen gleich: die eigene Logik kennt nur den benötigten Vertrag.

## State und unveränderliche Updates

`app.js` hält den aktuellen Zustand in `DATA`. Fachmodule greifen nicht direkt
darauf zu. Der Controller übergibt ihnen einen Snapshot und übernimmt danach
ein neues Ergebnis.

```javascript
DATA = Object.assign({}, DATA, {
  hiddenOpenPositions: restored
});
```

Das ähnelt einem C#-`record` mit `with`:

```csharp
data = data with
{
    HiddenOpenPositions = restored
};
```

JavaScript-Objekte sind allerdings nicht automatisch unveränderlich. Arrays
und Objekte können mutiert werden. Deshalb kopieren Normalisierung,
Safety-Backups und Fachfunktionen ihre Eingaben an wichtigen Grenzen. Tests
prüfen zusätzlich, dass zentrale Berechnungen die übergebenen Daten nicht
verändern.

## Asynchronität: Promise entspricht Task

`Promise<T>` entspricht gedanklich `Task<T>`. `async` und `await` funktionieren
sehr ähnlich:

```javascript
export async function downloadData(accessToken, fileId) {
  const response = await driveFetch(
    accessToken,
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );
  const text = await response.text();
  return normalizeAppData(JSON.parse(text));
}
```

Vereinfacht in C#:

```csharp
public async Task<AppData> DownloadDataAsync(
    string accessToken,
    string fileId,
    CancellationToken cancellationToken)
{
    using var response = await httpClient.GetAsync(
        $"drive/v3/files/{fileId}?alt=media",
        cancellationToken);

    response.EnsureSuccessStatusCode();
    var dto = await response.Content.ReadFromJsonAsync<AppDataDto>(
        cancellationToken);
    return normalizer.Normalize(dto);
}
```

Wichtige Unterschiede:

- Ein Promise beginnt normalerweise sofort; es ist nicht dasselbe wie eine
  noch nicht gestartete Delegate-Funktion.
- Browser-`fetch` wirft bei HTTP 404/500 nicht automatisch. `storage.js`
  prüft deshalb `response.ok`.
- JavaScript besitzt hier keinen allgemeinen `CancellationToken`. Abbruch
  würde gezielt über `AbortController` modelliert.
- Fehler in `async`-Funktionen werden abgelehnte Promises und müssen mit
  `try/catch` oder `.catch()` behandelt werden.

## Interfaces ohne `interface`

JavaScript verwendet strukturelle Verträge: Entscheidend ist, welche Methoden
ein Objekt besitzt, nicht welche Schnittstelle es deklariert.

Für einen hypothetischen .NET-Port könnte die Persistenz so abstrahiert werden:

```csharp
public interface ITradeRepository
{
    Task<AppData> LoadAsync(CancellationToken cancellationToken);

    Task SaveAsync(
        AppData data,
        CancellationToken cancellationToken);
}
```

`storage.js` und `local-storage.js` sind im aktuellen Projekt keine
Implementierungen eines gemeinsamen JavaScript-Interfaces. `app.js` wählt den
Speicherpfad explizit anhand des Modus. Das ist weniger abstrakt, aber für zwei
kleine Browseradapter gut sichtbar und ausreichend testbar.

Nicht jede fehlende Schnittstelle ist technische Schuld. Eine Abstraktion ist
erst dann hilfreich, wenn mehrere Aufrufer denselben Vertrag wirklich
benötigen oder die Auswahl sonst unübersichtlich wird.

## UI: DOM-Steuerung statt Razor-Komponenten

HTML existiert hier unabhängig vom JavaScript in `index.html`. Ein UI-Modul
sucht vorhandene Elemente und ändert Eigenschaften:

```javascript
const button = document.getElementById('btn-login');
button.disabled = false;
button.addEventListener('click', requestGoogleToken);
```

In Blazor lägen Markup, Zustand und Ereignisbindung eher zusammen:

```razor
<button disabled="@(!gisReady)" @onclick="RequestGoogleToken">
    Mit Google Drive starten
</button>
```

Der aktuelle Ansatz ähnelt MVP:

- `index.html` ist die View-Struktur,
- kleine Dialogmodule sind Presenter,
- pure Funktionen liefern View Models beziehungsweise Projektionen,
- `app.js` koordiniert Ereignis, Mutation, Speichern und erneutes Rendern.

`innerHTML` wird nur kontrolliert verwendet. Texte aus CSV und JSON müssen
vorher escaped werden. `textContent` ist für einfache Fremdtexte sicherer.

## Start und Lebenszyklus

Am Ende von `app.js` wird der Start an den DOM-Zustand gebunden:

```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
```

`bootApp()` ist zusammen mit den Modul-Imports der Composition Root. Dort
werden UI-Ereignisse verdrahtet, vorhandener Speichermodus geladen und Google
Identity Services initialisiert.

Das entspricht grob `Program.cs`, allerdings ohne Dependency-Injection-
Container:

```csharp
var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.Services.AddScoped<ITradeRepository, IndexedDbTradeRepository>();
builder.Services.AddScoped<TradeApplicationService>();
await builder.Build().RunAsync();
```

Der Browser besitzt außerdem einen zweiten Lebenszyklus: den Service Worker.
Er läuft unabhängig von der sichtbaren Seite und kontrolliert den App-Shell-
Cache. Er ist weder ein ASP.NET-Middleware-Requestpipeline-Ersatz noch ein
zuverlässiger Hintergrunddienst für Fachjobs.

## Tests aus .NET-Sicht

`test/test_pwa.cjs` ist ein eigener Test Runner ohne Jest. Das wirkt zunächst
ungewohnt, entspricht inhaltlich aber mehreren Testprojekten:

- Acorn-Parsechecks ähneln Compiler-/Roslyn-Prüfungen.
- Modulvertragschecks prüfen `import` gegen `export`.
- JSDOM-Tests ähneln Komponenten- oder bUnit-Tests.
- Pure Modulprüfungen entsprechen xUnit-Unit-Tests.
- `gold_rows.json` plus `golden.json` sind Golden-Master-Fixtures.
- Service-Worker-Mocks prüfen die Browser-Infrastrukturgrenze.

Ein Check wird über `check(name, condition)` gezählt. Es fehlen die
Komfortfunktionen eines Testframeworks, dafür läuft jede Kategorie mit einem
einzigen `npm test` und die Suite ist als ausführbare Spezifikation lesbar.

Beim Port nach .NET sollten die synthetischen Golden-Fixtures unverändert
eingelesen werden. Wenn JavaScript und C# für dieselben 19 Rohzeilen exakt 10
Trades, 1.115,44 Euro P&L, 460 Euro Steuer, drei offene Lots und 1.525 Euro
offenen Einstand liefern, ist die wichtigste fachliche Parität bewiesen.

## Typische Stolperstellen für C#-Entwickler

### Zahlen

JavaScript-`Number` ist eine Gleitkommazahl mit doppelter Genauigkeit. Es gibt
kein eingebautes `decimal`. Dieses Projekt rundet Geld daher an fachlichen
Grenzen explizit auf Cent. In C# wäre `decimal` die natürliche Wahl.

### Null und fehlende Werte

JavaScript unterscheidet `null` und `undefined`. Ein fehlendes Objektfeld ist
normalerweise `undefined`. `?.` und `??` ähneln den C#-Operatoren, aber
Truthy-/Falsy-Prüfungen behandeln zusätzlich `0`, `''` und `NaN` als falsch.
Bei Finanzwerten darf `if (!capital)` deshalb nur verwendet werden, wenn null
und echtes `0` fachlich dasselbe bedeuten.

### Gleichheit

Immer `===` und `!==` verwenden. `==` führt Typkonvertierungen durch, die es in
vergleichbarer Form in C# nicht gibt.

### Arrays

`map`, `filter` und `reduce` erinnern an LINQ, liefern aber Arrays und sind
sofort ausgewertet. Es gibt hier kein verzögertes `IEnumerable<T>`.

### Objektkopien

`{ ...obj }`, `Object.assign({}, obj)` und `[...array]` kopieren nur flach.
Enthaltene Objekte bleiben dieselben Referenzen. Für JSON-artige Snapshots
verwendet das Projekt an kontrollierten Grenzen eine tiefe Kopie.

### Datum

JavaScript-`Date` enthält Zeitpunkt und Zeitzonenverhalten; es ist kein
`DateOnly`. Der fachliche Kalendertag bleibt deshalb als `YYYY-MM-DD`-String.
`toISOString()` darf ihn nicht über UTC verschieben.

### Modulzustand

Variablen auf Modulebene sind effektiv Singletons für die geladene Seite.
`DATA` in `app.js` ähnelt einem zustandsbehafteten Scoped Service, obwohl keine
Klasse existiert. Dieser Zustand darf nicht in pure Fachmodule durchsickern.

### Nebenläufigkeit

Browser-JavaScript führt normalen Code auf einem Event Loop aus. Trotzdem
können sich asynchrone Abläufe logisch überholen. Drive-Schreibvorgänge werden
deshalb serialisiert und zusätzlich mit ETag geschützt. „Single-threaded“
bedeutet nicht „frei von Race Conditions“.

## Empfohlene Lesereihenfolge

1. [`js/app-data.js`](../../js/app-data.js) – kleinstes Modul und Datenvertrag.
2. [`js/fifo.js`](../../js/fifo.js) – zentrale, pure Fachlogik.
3. [`js/import.js`](../../js/import.js) – Parsing, Validierung und Ledger.
4. [`js/storage.js`](../../js/storage.js) und
   [`js/local-storage.js`](../../js/local-storage.js) – Infrastrukturgrenzen.
5. [`js/navigation.js`](../../js/navigation.js) – kleines DOM-Modul.
6. [`js/app.js`](../../js/app.js) – erst jetzt der vollständige Orchestrator.
7. [`sw.js`](../../sw.js) – separater PWA-Lebenszyklus.

Lies zu jedem Modul zuerst den Kopfkommentar und danach seine Exports. Die
nicht exportierten Funktionen sind Implementierungsdetails, vergleichbar mit
privaten Methoden.

## Kleine Lernaufgaben

Diese Aufgaben verändern keine Finanzdaten und eignen sich zum Verstehen:

1. Führe `npm test` aus und finde den Check für `tradePnl`.
2. Rechne einen synthetischen Trade von Hand und rufe `tradePnl` in einem
   temporären Test auf.
3. Übersetze `dayMap` aus `fifo.js` als C#-Methode mit `GroupBy`.
4. Schreibe die Records `Trade`, `OpenLot` und `AppData` nur auf Papier oder in
   einem separaten Lernprojekt.
5. Portiere `tradePnl` und `closePositionPnl` in ein xUnit-Testprojekt und
   verwende dieselben Handwerte.
6. Portiere danach `fifoMatch`; lade dabei direkt die synthetische
   `gold_rows.json`, nicht echte Brokerdaten.

So lernst du die fachlichen Schnitte, ohne die funktionierende PWA zu
gefährden.

## JavaScript oder Blazor?

Für dieses bestehende Projekt lautet die Empfehlung: Die aktuelle App nicht neu schreiben.

Der Trade Kalender läuft, ist offlinefähig, hat eine umfangreiche
Regression-Suite und besitzt bereits sichere Browser- und Drive-Integration.
Ein vollständiger Rewrite würde dieselben Bugs erneut möglich machen, ohne dem
Nutzer zunächst einen neuen Wert zu liefern.

| Ziel | Bessere Wahl |
| --- | --- |
| Web-Grundlagen, ES-Module, DOM und PWA verstehen | Dieses JavaScript-Projekt behalten |
| Schnell und statisch über GitHub Pages ausliefern | Dieses JavaScript-Projekt behalten |
| Bestehende App sicher weiterentwickeln | Dieses JavaScript-Projekt behalten |
| Blazor, Razor-Komponenten und .NET im Browser lernen | Separaten Lern-Port beginnen |
| Domain-Code später mit einer .NET-API teilen | Blazor-Experiment kann sinnvoll sein |
| Nur Klassen verwenden, weil sie vertrauter wirken | Kein ausreichender Rewrite-Grund |

Blazor WebAssembly ist kein „besseres JavaScript“, sondern ein anderer
Technik- und Betriebsvertrag:

- C#-Typen, Records, DI, Razor und xUnit sind vertraut.
- Downloadgröße, Startzeit und Build-/Publish-Pipeline werden größer.
- DOM-nahe Browserfunktionen, Google Identity Services, IndexedDB und Teile der
  PWA-Integration benötigen Bibliotheken oder JavaScript-Interop.
- Service Worker und Cache-Update bleiben Webthemen; C# beseitigt sie nicht.
- Ein paralleler Port verdoppelt vorübergehend Implementierung und Tests.

Wenn dein Ziel ein Beispiel-Projekt für Bewerbungen oder Weiterbildung ist,
ist der Vergleich sogar stärker als ein Rewrite: Du kannst dieselbe
Fachdomäne funktional in JavaScript und typisiert in C# erklären.

## Sicherer Blazor-Lernpfad

Baue einen separaten Lern-Port, nicht eine Migration über den laufenden
Datenbestand. Eine sinnvolle Solution könnte so aussehen:

```text
TradeCalendar.sln
src/
  TradeCalendar.Domain/
    Trade.cs
    OpenLot.cs
    FifoMatcher.cs
    TradeCalculator.cs
  TradeCalendar.Application/
    ImportService.cs
    ITradeRepository.cs
  TradeCalendar.Infrastructure/
    GoogleDriveRepository.cs
    IndexedDbTradeRepository.cs
  TradeCalendar.Web/
    Pages/
    Components/
tests/
  TradeCalendar.Domain.Tests/
  TradeCalendar.Application.Tests/
```

`TradeCalendar.Domain` kennt weder Blazor noch Google Drive noch IndexedDB.
Damit ist es das direkte Gegenstück zu `fifo.js`, den fachlichen Teilen von
`import.js` und den puren Auswertungen aus `views.js`.

Empfohlene Reihenfolge:

1. C#-Records aus dem dokumentierten Datenmodell erstellen.
2. `tradePnl` und `closePositionPnl` mit xUnit und denselben Handwerten
   portieren.
3. `fifoMatch` portieren und die vorhandenen synthetischen Golden-Fixtures
   direkt im .NET-Test laden.
4. Erst bei grüner fachlicher Parität Import und Query Services ergänzen.
5. Repository-Interfaces definieren; zunächst einen In-Memory-Adapter nutzen.
6. Razor-Komponenten auf synthetischen Daten bauen.
7. IndexedDB, Google Drive, OAuth und PWA zuletzt anbinden, weil dafür
   JavaScript-Interop und Browser-Lebenszyklen verstanden werden müssen.

Die aktuelle PWA bleibt dabei Referenzimplementierung. Ein Port darf erst mit
echten Daten in Berührung kommen, wenn Golden Values, Import-Deduplizierung,
Steuervorzeichen, Datumsregeln, Backup und Konfliktschutz nachweislich
paritätisch sind.

## Was du aus dem Projekt mitnehmen solltest

Ob JavaScript oder C#: Die wertvollsten Teile sind nicht die Syntax und nicht
die Anzahl der Klassen. Es sind die Grenzen:

- Fachlogik ohne I/O,
- ein einziger kanonischer Datenvertrag,
- Infrastruktur hinter kleinen Adaptern,
- explizite Orchestrierung,
- synthetische Golden Values,
- permanente Regressionstests,
- kleine, atomar ausgelieferte Änderungen.

Diese Architekturprinzipien lassen sich direkt in ein C#-, Blazor-, ASP.NET-
oder Desktop-Projekt übertragen.
