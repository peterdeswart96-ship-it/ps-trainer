# Overdracht – Onderwerpenboom, PowerShell-basis en werkbank (13 oktober 2026)

Onderwerp: issue #35 (onderwerpen en subcategorieën), alle 9 scripts van PowerShell-basis, een uitklapmenu, een compactere werkbank en een nieuw issue (#72).
Dit document vervolgt `2026-10-13-overdracht-foundry-compleet.md`. Lees ook `CLAUDE.md`, `DESIGN.md` (versie 1.21, leidend) en `DEFINE.md` (0.9).

## Rode draad

Peter koos de besluiten voor issue #35, daarna de iconen, de naam en het menu. Claude Code bouwde alles op eigen feature-branches, liet elke stap door een subagent met schone context beoordelen, verwerkte de bevindingen en merget via een pull request na de groene check "Validatie". Elke merge zette de site direct live. De site heeft nu 41 scripts en 215 tests slagen.

| PR | Wat |
| --- | --- |
| 62 | Onderwerpen als boom met twee niveaus; vijf nieuwe hoofdonderwerpen (DESIGN 1.18, DEFINE 0.9) |
| 63 | Alle officiële Microsoft-iconen verwijderd, eigen iconen; "Migraties" heet nu "SP Migraties" (DESIGN 1.19) |
| 64 t/m 70, 73, 76 | De 9 scripts van PowerShell-basis (zie hieronder) |
| 71 | Reviewcorrecties op script 7, per ongeluk niet meegenomen in PR 70 |
| 74 | Subcategorieën in een uitklapmenu onder het hoofdonderwerp (DESIGN 1.20) |
| 75 | Compactere kop en scorerij op de werkbank (DESIGN 1.21) |

## Onderwerpen en subcategorieën (issue #35, gesloten)

Besluiten van Peter: een script staat op precies één plek (boom, geen labels); Migraties onder SharePoint, Entra ID en Purview onder Security, Foundry onder Azure; "algemeen" heet PowerShell-basis; startpagina met tegels per hoofdonderwerp.

- `data/topics.json` heeft optioneel `parent`. Hoogstens twee niveaus; `tools/build-index.mjs` weigert een onbekende parent, drie niveaus en dubbele id's. De index heeft per onderwerp `scriptCount` (alleen het onderwerp zelf), `totalCount` (inclusief subcategorieën) en `status`, en staat in boomvolgorde.
- Script-id's, mappen (`data/scripts/<topic>/<id>`), `?script=`/`?topic=` en voortgang zijn ongewijzigd. Een oude URL zoals `?topic=migraties` werkt nog en toont "SharePoint › SP Migraties". Het id van Migraties blijft `migraties`; alleen de weergavenaam veranderde.
- Hoofdonderwerpen: `algemeen` (PowerShell-basis), `sharepoint` (met `migraties`), `exchange`, `security` (met `entra-id`, `purview`), `azure` (met `foundry`), `m365`. Exchange en Microsoft 365 hebben nog geen scripts ("Nog in opbouw"). Security en Azure tonen alleen wat hun subcategorieën hebben.
- Per onderwerp (ook subcategorie) bestaan een felle en een pastelkleur, een filterknopregel, een tegelregel, een `ico-<id>` in `app.css` en een SVG in `assets/img/icons`. Een test dwingt dat af.
- `DEFINE.md` zegt sinds 0.9 dat Exchange wél een eigen onderwerp is.
- Bewuste beperking (Peter: "niet nodig"): de 9 eigen SharePoint-scripts naast SP Migraties zijn niet apart te filteren, alleen "Alles" of een subcategorie.

## Iconen

Op verzoek van Peter zijn alle officiële Microsoft-iconen weg (map `assets/img/microsoft`, `OFFICIELE_ICONEN`, rooktest, tests, `.gitattributes`). Foundry en Entra ID hebben nu eigen iconen. De CLAUDE.md-regel over officiële iconen is vervangen door: geen officiële Microsoft-iconen of -logo's.

## Uitklapmenu (PR 74)

Een klik op een hoofdonderwerp met subcategorieën (SharePoint, Security, Azure) kiest het onderwerp en klapt een menu met "Alles" en de subcategorieën open onder de knop. Een keuze, Escape of een klik elders sluit het; de knop toont daarna "Onderwerp › Subcategorie". Op een smal scherm staat het menu naast de knop in de schuifbare rij (een zwevend menu zou daar worden afgesneden) en schuift in beeld. De toetsenbordfocus blijft op de juiste knop (sleutel `fid` per knop; `renderFilters` herstelt de focus). Bewuste keuze: een gedeelde vlag `klikInMenu`, omdat `renderFilters` de aangeklikte knop vervangt en de pagina daarna niet meer kan zien waar de klik was.

## Compacte werkbank (PR 75)

Op de werkbankpagina (`<div class="wrap compact">`) staan logo, titel en menu op één rij, met de uitleg als smalle regel eronder; de scorerij kost minder hoogte. Onder de 900px blijft de gewone indeling (bij 700 tot 900px wrapte de kop niet netjes). Alleen `oefenen/index.html` heeft de class.

## PowerShell-basis (`data/scripts/algemeen/`)

Peter koos het onderwerp en de lijst van 9 scripts (3 per niveau). Alle 9 zijn `gecontroleerd`: ze hebben geen module nodig en elk gedrag uit de vragen is uitgevoerd in PowerShell 7.6.6 en Windows PowerShell 5.1.

| Niveau | Script | Kern |
| --- | --- | --- |
| basis | `algemeen-pipeline-filteren` | Where-Object, Sort-Object, Select-Object; `>` is een omleiding; `.Count` op één object |
| basis | `algemeen-variabelen-arrays-hashtables` | hashtable opzoeken, `+=` kopieert, onbekende sleutel geeft `$null` |
| basis | `algemeen-foreach-berekende-eigenschappen` | foreach/continue, berekende eigenschappen, `$null / 1024` is 0 |
| gevorderd | `algemeen-try-catch-erroraction` | `-ErrorAction Stop`, catch-volgorde (parserfout), finally bij throw |
| gevorderd | `algemeen-functie-pipeline-invoer` | `process`/`end`, ValueFromPipelineByPropertyName, ValidateRange |
| gevorderd | `algemeen-splatting-whatif` | splatting, `SupportsShouldProcess`; `risk: write` (maakt mappen in de tijdelijke map) |
| expert | `algemeen-groeperen-rapporteren` | Group-Object, CSV/JSON; verschillen 5.1/7 (datum, BOM, sorteerstabiliteit); `risk: write` |
| expert | `algemeen-regex-logregels` | `-match`, `$Matches` blijft staan na een mislukte match |
| expert | `algemeen-retry-paginering` | backoff, paginering, `Start-Sleep -Seconds` rondt af naar 0 in 5.1, `$script:` |

Werkwijze per script: gedrag eerst in `pwsh` en `powershell` testen in een tijdelijke map, dan `script.ps1` en `meta.json`, `npm run validate`, `npm run syntax`, `npm test`, onafhankelijke review, bevindingen verwerken, pull request, check afwachten, squash-merge.

## Valkuilen (nuttig voor de volgende scripts)

- **Het goede antwoord was te vaak het langste.** Dat gebeurde bij vrijwel elk script en de reviewers wezen er telkens op. Controleer lengte en positie met een klein node-script vóór de review.
- **Keten van commando's.** Een mislukt aanpassingsscript gevolgd door `;` liet de commit en merge toch doorgaan (PR 70, gecorrigeerd in PR 71). Gebruik `&&` (of `set -e`) over de hele keten. Vervangteksten in zo'n script moeten letterlijk in het bestand staan; bij opties zonder de omringende aanhalingstekens.
- **Tekst uit de werkbank:** de werkbank toont `note` niet bij `gecontroleerd`; zet iets wat de leerling moet zien in de vraag of in `check.source`.
- **Culturele verschillen in uitvoer:** tabellen tonen datums en decimalen volgens de taalinstelling, tekstregels met punt. Noem in een uitleg liever geen decimalen die per versie verschillen.
- **Windows PowerShell 5.1 versus 7:** `.Count` op één `pscustomobject` is leeg in 5.1; `Sort-Object` is alleen in 7 stabiel; `Start-Sleep -Seconds` rondt af; `ConvertTo-Json` schrijft datums anders; `-Encoding UTF8` schrijft in 5.1 een BOM. Komma-parameters (`-Afdelingen IT,HR`) werken niet via `pwsh -File`, wel via `& ./script.ps1`.

## Besluiten van Peter

- Issue #35: boom met één plek per script, indeling en weergave zoals boven.
- Iconen: alle officiële Microsoft-iconen weg.
- Naam: "SP Migraties".
- Lijst van 9 scripts voor PowerShell-basis goedgekeurd en daarna zelfstandig afgemaakt.
- Tiende Foundry-script (private endpoints en VNet): niet nodig.
- Subcategoriefilter: uitklapmenu onder het hoofdonderwerp. Eigen scripts van SharePoint apart tonen: niet nodig.
- Kop en scorerij van de werkbank compacter.

## Wat er nog open staat

1. **Issue #72**: knop om bij elke vraag een Copilot-prompt te genereren. Open vragen voor Peter staan in het issue (waar de knop komt, welke Copilot, het antwoord meesturen of niet).
2. **Issue #36**: zoekfunctie (label "later"): wacht op een besluit van Peter.
3. **Scripts voor de overige onderwerpen**: Exchange en Microsoft 365 hebben er nog geen, Security heeft alleen Entra ID (2) en Purview (3), Azure alleen Foundry (9). Een nieuwe scriptlijst per onderwerp kiest Peter (CLAUDE.md, werkwijzepunt 3).
4. **Controle van de scripts**: Migraties (zes), SharePoint (negen), Purview (drie) en Foundry (negen) blijven `nog_te_controleren`; echt draaien tegen een tenant of abonnement is een stoppunt.
5. **Cmdlet-controle in CI** (DESIGN.md regel 194), het examen- en voortgangsontwerp zonder niveau, en kijken in Safari, Firefox en op een echte telefoon staan nog open.
6. **Niet apart getest**: forced-colors voor het uitklapmenu, en de kop tussen 900 en 1100px alleen met een screenshot.
7. Geen test bewaakt de reset van de ingeklapte waarschuwingen bij scriptwissel (uit eerdere overdrachten).

## Waar de kennis staat

`CLAUDE.md`, `DESIGN.md` (1.21), `DEFINE.md` (0.9), issues #36 en #72, deze en de eerdere overdrachten in `docs/sessies/`. De negen scripts staan in `data/scripts/algemeen/`.
