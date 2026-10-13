# DESIGN – PowerShell Leestrainer

Status: versie 1.22 (13 oktober 2026), definitief. Wijziging t.o.v. 1.21, issue #72 op verzoek van Peter: elke vraag heeft een knop "Kopieer Copilot-prompt" tussen Vorige en Volgende (zie Oefenen en paragraaf Copilot-prompt). Eerdere wijziging (1.21), t.o.v. 1.20, op verzoek van Peter: de kop van de werkbank is compacter (logo, titel en menu op een rij, de uitleg als smalle regel eronder; op een smal scherm blijft de gewone indeling) en de scorerij kost minder hoogte, zodat er meer ruimte is voor script en vragen. Eerdere wijziging (1.20), t.o.v. 1.19, op verzoek van Peter: de subcategorieen staan niet meer in een tweede rij, maar in een uitklapmenu onder de knop van het hoofdonderwerp (zie Oefenen). Eerdere wijziging (1.19), t.o.v. 1.18, op verzoek van Peter: er zijn geen officiele Microsoft-iconen meer; elk onderwerp (ook Foundry en Entra ID) heeft een eigen icoon in `assets/img/icons`, en de weergavenaam van Migraties is "SP Migraties" (het id `migraties` blijft). Eerdere wijziging (1.18), t.o.v. 1.17 (issue #35, besluiten van Peter): onderwerpen vormen een boom met twee niveaus. Er komen de hoofdonderwerpen PowerShell-basis (`algemeen`), Exchange, Security, Azure en Microsoft 365 (`m365`) bij; Migraties wordt een subcategorie van SharePoint, Entra ID en Purview van Security en Foundry van Azure. Een script staat op precies een plek; id's, mappen, URL's en voortgang veranderen niet (paragraaf 4.2). Eerdere wijziging (1.17), t.o.v. 1.16: de waarschuwingen bij een script dat nog te controleren is staan ingeklapt achter een knop met waarschuwingsicoon rechts naast de titel (paragraaf Oefenen). Eerdere wijziging (1.16), t.o.v. 1.15: de werkbank-filter "soort vraag" staat rechts uitgelijnd en elk soort (meerkeuze, zoek de fout, zelf formuleren) heeft een eigen pastelkleur; de scripttegels in de scriptkeuze hebben de kleur van hun onderwerp; de knoppen Vorige en Volgende staan onderaan in de vragenbox, en zijn compact. Het lettertype van de vraag blijft ongewijzigd. Eerdere wijziging (1.15), t.o.v. 1.14: de werkbank heeft geen niveaufilter meer (de knoppen, de parameter `&level=` en de code erachter zijn weg; het niveau van een script blijft wel in de gegevens en in de kop), elke onderwerpknop in het filter heeft een eigen pastelkleur, en de scriptkeuze staat op één regel met een schuifbalk. Eerdere wijziging (1.14): op de werkbank staat de vragenbox links en staan de antwoorden en de uitleg rechts; op een telefoon blijft de vragenbox bovenaan. Eerdere wijziging (1.13): de werkbank heeft een nieuwe indeling (zie de rij "Oefenen" in de paginatabel): een bovenbalk met filters en scriptkeuze, daaronder het hele script over de volle breedte zonder schuifbalk, daaronder één vraag tegelijk met de vragenbox (vraagnummer en knoppen Vorige en Volgende) en de ruimte voor antwoorden en uitleg naast elkaar. Het codeblok is niet meer vastgezet (sticky). Eerdere wijziging (1.12): een script met `check.status` `gecontroleerd` toont op de werkbank geen enkele waarschuwing meer: het blok "Nog te controleren" ontbrak al, en nu wordt ook de `note` niet meer getoond. Open punten van een gecontroleerd script horen daarom in `check.source`. Geen open vragen.
Eerdere wijziging (1.11): de deploy is uitgewerkt: de workflow `deploy.yml` (paragraaf 6.2), het buildscript `tools/build-site.mjs` dat alleen de allowlist als pakket bouwt, de rooktest op het pakket zelf, het runbook `DEPLOY.md` (instellen in een vaste volgorde, controle na livegang, terugdraaien) en het bestand `CNAME`. DNS, de Pages-instellingen en de livegang zelf blijven stappen die Peter uitdrukkelijk goedkeurt.

## 1. Besluiten

| Onderwerp | Besluit |
| --- | --- |
| Pagina's en URL's | Meerdere pagina's met nette, vaste URL's. De PS Coach kan direct naar een pagina of script linken. |
| Opslag van een oefenscript | Per script een echt `.ps1`-bestand plus een `meta.json` met vragen, niveau en status. |
| Controle in GitHub Actions | Eerst JSON-controle en PowerShell-syntaxcheck. De controle van cmdlets en parameters tegen de geïnstalleerde modules komt erbij zodra de eerste scripts er staan. |
| Navigatie | Startpagina met onderwerpkaarten (met voortgang), daarna filteren op onderwerp. De werkbank uit v1 blijft de oefenpagina. |
| Stack website | Platte HTML, CSS en JavaScript-modules. Geen React, geen Vite, geen Tailwind. Eén klein Node-script in GitHub Actions bouwt de index van alle scripts. |
| Hosting | GitHub Pages, gedeployed via GitHub Actions, op `ps-trainer.pdscloud.nl` |
| Backend (vanaf 2.2) | Azure Function App met aanmelden via Entra ID, die de Foundry-agent "PS Coach" aanroept met een managed identity |
| Taal van de Function | Node.js. Versie per scope vastgelegd; de versie van de Function wordt in Azure bewezen met een runtime-test voordat er iets gebouwd wordt (paragraaf 7.1). |
| Hostingplan Function | Flex Consumption. Terugval: Linux Consumption met Node 22 (bewezen in `mokum-competitie`), als de runtime-test op Flex faalt. Windows Consumption valt af. |
| Node-scopes | Tooling op Node 24 (gelijk aan de laptop, v24.18.0). Function op de versie die de runtime-test in Azure bewijst, verwacht Node 22. |
| Testen | Alleen lokaal (`npm run dev`), geen online testomgeving. Op elke push naar een feature-branch en elke pull request naar `main` draaien validatie, bouw en rooktest in GitHub Actions. |
| Lettertypen | Google Fonts blijft, zoals in v1. |

## 2. Overzicht van de architectuur

**Release 2.0 en 2.1 (alleen statisch, geen kosten)**

```
Browser ──► GitHub Pages (HTML, CSS, JS, data/*.json, *.ps1)
   └── voortgang in localStorage
```

**Release 2.2 en 2.3 (AI en meerdere apparaten)**

```
Browser ──► GitHub Pages (statische site)
   │
   ├─ aanmelden met Entra ID (MSAL.js) ──► token
   │
   └─ POST /api/explain | /api/generate | /api/feedback  (Bearer-token)
          │
          ▼
   Azure Function App (rg-ps-trainer)  ── managed identity ──► Foundry-project, agent "PS Coach" (gpt-5-mini)
          │
          └──► Table Storage: dagteller AI-aanroepen (2.2) en voortgang per gebruiker (2.3)

PS Coach in de Foundry-playground ──► linkt naar de website (/examen/, /flashcards/, /oefenen/?script=...)
```

## 3. Repo-indeling

```
ps-trainer/
├─ index.html                     Startpagina met onderwerpkaarten
├─ oefenen/index.html             De werkbank (script + vragen)
├─ woordenboek/index.html
├─ flashcards/index.html          (2.1)
├─ examen/index.html              (2.1)
├─ voortgang/index.html           (2.1)
├─ assets/
│  ├─ css/app.css                 Thema's (licht/donker), layout
│  └─ js/                         data.js, progress.js, highlight.js, markdown-lite.js, per pagina een eigen module
├─ data/
│  ├─ topics.json                 De onderwerpen (id, naam, omschrijving, volgorde, optioneel parent; geen status, die wordt berekend)
│  ├─ dictionary.json             Woordenboek (ook voor de flashcards)
│  └─ scripts/
│     └─ <onderwerp>/<script-id>/
│        ├─ script.ps1            De code
│        └─ meta.json             Titel, niveau, status, vragen
├─ agent/instructions.md          Instructies van de PS Coach, onder versiebeheer
├─ api/                           Azure Function (vanaf 2.2)
├─ schema/script.schema.json      JSON Schema voor meta.json
├─ schema/dictionary.schema.json  JSON Schema voor dictionary.json
├─ legacy/ps-leestrainer-v1.html  De v1-bron van de omzetting; wordt niet gepubliceerd (buiten de deploy-allowlist)
├─ tools/
│  ├─ build-index.mjs             Bouwt data/index.json uit alle meta.json-bestanden
│  ├─ build-site.mjs              Bouwt het sitepakket _site (alleen de allowlist, met een verse index) voor GitHub Pages
│  ├─ validate.mjs                Controleert alle meta.json tegen het schema en regelnummers tegen de .ps1
│  ├─ Test-Syntax.ps1             PowerShell-syntaxcheck van alle .ps1-bestanden
│  ├─ check-node.mjs              Stopt direct als de Node-hoofdversie niet gelijk is aan .nvmrc
│  ├─ server.mjs                  Statische webserver (node:http, alleen 127.0.0.1), gebruikt door dev-server, smoke en tests
│  ├─ dev-server.mjs              Lokale ontwikkelserver: bouwt eerst de index en start dan server.mjs
│  └─ smoke.mjs                   Rooktest: alle pagina's geven HTTP 200 en index.json is geldig
├─ .nvmrc                         De vaste Node-versie (zie 7.1)
├─ .npmrc                         engine-strict=true (npm weigert installeren bij een verkeerde Node-versie)
├─ package.json                   Scripts (dev, build-index, validate, test, syntax, smoke) en "engines" voor de Node-versie
├─ .github/workflows/             validate.yml en deploy.yml
├─ CNAME                          ps-trainer.pdscloud.nl (staat in het pakket; bij een deploy via Actions bepaalt de Pages-instelling het domein)
├─ CLAUDE.md  DEFINE.md  DESIGN.md  DEPLOY.md
```

Een nieuw oefenscript toevoegen betekent een nieuwe map met `script.ps1` en `meta.json`. De index wordt in GitHub Actions gebouwd en niet in git opgeslagen, dus er hoeft geen code te veranderen.

## 4. Datamodel

### 4.1 `meta.json` van een script

```json
{
  "id": "entra-inactieve-gebruikers",
  "legacyId": "graph-users",
  "title": "Inactieve gebruikers",
  "topic": "entra-id",
  "level": "basis",
  "tag": "Microsoft Graph · alleen lezen",
  "summary": "Rapport van ingeschakelde accounts die 90 dagen niet hebben ingelogd.",
  "risk": "read",
  "modules": ["Microsoft.Graph.Users"],
  "note": null,
  "check": { "status": "gecontroleerd", "date": "2026-10-11", "source": "Microsoft Learn" },
  "questions": [
    {
      "id": "q1",
      "type": "mc",
      "step": "parameters",
      "lines": [2],
      "prompt": "Waarom vraagt het script om twee scopes?",
      "options": ["...", "...", "...", "..."],
      "answer": 1,
      "explanation": "Zonder `AuditLog.Read.All` blijft `SignInActivity` leeg."
    }
  ]
}
```

| Veld | Toelichting |
| --- | --- |
| `id` | Uniek en vast; wordt gebruikt in URL's en voortgang. Wijzig het nooit achteraf. |
| `legacyId` | Alleen voor de 4 scripts uit v1, om bestaande voortgang over te nemen. |
| `topic` | Een id uit `topics.json`: `algemeen`, `sharepoint`, `migraties`, `exchange`, `security`, `entra-id`, `purview`, `azure`, `foundry` of `m365`. Het is de plek van het script (precies een) en ook de mapnaam onder `data/scripts/`. |
| `level` | `basis`, `gevorderd` of `expert`. |
| `risk` | `read` of `write`. Toont het label "alleen lezen" of "wijzigt". |
| `check.status` | `gecontroleerd` of `nog_te_controleren`. De ShareGate-scripts staan op `nog_te_controleren` en tonen een zichtbare waarschuwing, met de `note`. Bij `gecontroleerd` (met `date` en `source`) toont de werkbank een regel "Gecontroleerd op ... · bron: ..." en geen waarschuwing en geen `note`; open punten staan dan in `check.source`. |
| `question.type` | `mc` (meerkeuze), `bug` (zoek de fout) of `open` (zelf formuleren). In 2.2 komt `explain-line` erbij. |
| `question.step` | Een van de vijf leesstappen: `parameters`, `bron`, `bewerking`, `wijziging`, `uitvoer`. Hiermee kan de voortgangspagina laten zien welke stap je het zwakst beheerst. |
| `question.lines` | Regelnummers in `script.ps1` die oplichten. De controle in `validate.mjs` faalt als een regelnummer buiten het script valt. |
| `explanation` | Eenvoudige opmaak: alleen `` `code` `` en `**vet**`. De pagina escaped alle tekst; er wordt nooit HTML uit data geïnjecteerd. |

### 4.2 Overige bestanden

- **`topics.json`:** per onderwerp `id`, `name`, `summary` en `order`, en optioneel `parent` (het `id` van het hoofdonderwerp: dan is dit een subcategorie). De boom heeft hoogstens twee niveaus; `build-index.mjs` weigert een onbekende parent of een subcategorie onder een subcategorie. Een hoofdonderwerp kan eigen scripts hebben en subcategorieen tegelijk (SharePoint). `order` geldt per niveau. Een onderwerp (en dus ook een script) verhuist nooit naar een andere map: een script krijgt een nieuwe plek door een nieuw script, niet door het `id` of de map te wijzigen. De indeling: SharePoint (SP Migraties, id `migraties`), Security (Entra ID, Purview), Azure (Foundry), en zonder subcategorie PowerShell-basis, Exchange en Microsoft 365. Voor nieuwe subcategorieen onder die laatste drie is een besluit van Peter nodig. In het subcategoriefilter van de werkbank kies je een subcategorie of "Alles"; de eigen scripts van een hoofdonderwerp (de 9 SharePoint-scripts naast SP Migraties) zijn er niet apart te kiezen. Dat is een bewuste beperking, tot Peter anders beslist. De status (`live` of `in-opbouw`) staat hier niet, maar wordt door `build-index.mjs` berekend: `live` bij minstens één script, anders `in-opbouw`. Een onderwerp zonder scripts toont "nog in opbouw" in plaats van een lege lijst.
- **`dictionary.json`:** een lijst groepen, elk met `id` (kebab-case, uniek), `name` en `items`. Een item heeft `term`, `explanation`, `example` (platte tekst, geen opmaak), `risk` (`read`, `write` of `neutral`) en optioneel `topics` (lijst onderwerp-id's). De `term` is uniek in het hele bestand, want de flashcards gebruiken hem als sleutel (`cards`). Schema: `schema/dictionary.schema.json`; `validate.mjs` controleert schema, unieke groep-id's en unieke termen. Dezelfde data voedt het woordenboek en de flashcards.
- **`index.json`** (gebouwd in CI, niet in git): per script de velden uit `meta.json` behalve de vragen, plus het aantal vragen per type (`counts`) en het pad naar de scriptmap. Per onderwerp komen `scriptCount` (alleen het onderwerp zelf), `totalCount` (inclusief subcategorieen) en de berekende `status` (`live` bij `totalCount` boven nul) erbij; de onderwerpen staan in boomvolgorde (een hoofdonderwerp, direct gevolgd door zijn subcategorieen). De startpagina en filters gebruiken alleen dit bestand.

### 4.3 Voortgang in de browser (2.0 en 2.1)

`localStorage`, sleutel `ps-trainer-v2`:

```json
{
  "version": 2,
  "answers": { "entra-inactieve-gebruikers:q1": { "first": 1, "correct": true, "at": "2026-10-11T11:00:00Z" } },
  "open":    { "entra-inactieve-gebruikers:q7": { "shown": true } },
  "retry":   { "entra-inactieve-gebruikers:q3": { "streak": 1 } },
  "exams":   [ { "at": "...", "topic": "sharepoint", "level": "basis", "score": 7, "of": 10, "seconds": 420 } ],
  "cards":   { "Where-Object": "weet-ik" }
}
```

- **Overname van v1:** bij het eerste bezoek leest de pagina de oude sleutel `ps-leestrainer-v1` (formaat `<legacyId>:<index>`) en zet die om naar `<id>:q<index+1>`. Daarom blijven de vraag-volgorde en `legacyId` van de 4 bestaande scripts gelijk. De overname staat als zuivere functie `migreerV1()` in `assets/js/progress.js` (testbaar zonder browser). v1 bewaarde geen tijd bij een antwoord; overgenomen antwoorden krijgen daarom de bewust oude tijd `1970-01-01T00:00:00Z` ("onbekend"), zodat een echt antwoord bij het samenvoegen in 2.3 altijd wint. `correct` wordt bepaald met het `answer` uit het `meta.json` van scripts met een `legacyId` (alleen de 4 uit v1; dat aantal groeit nooit). Bestaande v2-voortgang wordt niet overschreven en de v1-sleutel blijft staan. Een pagina die voortgang bewaart handelt eerst de overname af, want zodra `ps-trainer-v2` bestaat wordt v1 niet meer overgenomen. De themakeuze staat apart in `ps-trainer-thema` (`light` of `dark`; zonder keuze volgt de pagina het systeem) en wordt door `assets/js/theme-init.js` (een klassiek script in `<head>`) voor de eerste weergave gezet, tegen een flits van het verkeerde thema.
- **Klaar voor 2.3:** elk antwoord heeft een tijdstempel, zodat voortgang later per antwoord samengevoegd kan worden (nieuwste wint) in plaats van het hele bestand te overschrijven.
- Alle toegang tot `localStorage` zit in `try/catch` (zoals in v1). Zonder opslag werkt de site gewoon, alleen zonder voortgang.

## 5. Schermen

| Pagina | Release | Inhoud |
| --- | --- | --- |
| **Startpagina** `/` | 2.0 | Leesmethode (5 stappen), kaarten per onderwerp met aantal scripts, voortgang en status ("nog in opbouw" waar nodig). Alleen hoofdonderwerpen hebben een kaart; de scripts van subcategorieen tellen daarin mee. Een kaart opent het eerste script van het onderwerp in de werkbank (`/oefenen/?script=<id>&topic=<onderwerp>`) en toont het aantal scripts per niveau, hoeveel er nog te controleren zijn en de voortgang (beantwoord en goed bij eerste poging; open vragen tellen niet mee). |
| **Oefenen** `/oefenen/?script=<id>` | 2.0 | De werkbank uit v1, met een eigen indeling van boven naar beneden: (1) een bovenbalk met filters voor onderwerp (alleen hoofdonderwerpen, elke knop met een eigen pastelkleur) waarbij een hoofdonderwerp met subcategorieen die scripts hebben een uitklapmenu krijgt (een klik kiest het onderwerp en klapt een menu met "Alles" en de subcategorieen open onder de knop; een keuze, Escape of een klik elders sluit het; de knop toont na een keuze "Onderwerp › Subcategorie"; op een smal scherm staat het menu naast de knop in de schuifbare rij; `?topic=` accepteert elk onderwerp-id, ook dat van een subcategorie, en een hoofdonderwerp omvat zijn subcategorieen) links en soort vraag (ook elk soort met een eigen pastelkleur) rechts uitgelijnd, met daaronder de scriptkeuze op één regel met een schuifbalk, waarin elke scripttegel de kleur van zijn onderwerp heeft (er is geen niveaufilter); (2) het hele script met regelnummers over de volle breedte, zonder schuifbalk (lange regels breken af onder hun regelnummer); (3) links de vragenbox met "Vraag n van N", de vraag en onderaan de box de compacte knoppen Vorige en Volgende met een pijl, met ertussen de knop "Kopieer Copilot-prompt" (kopieert een prompt naar het klembord, zonder link naar een bepaalde Copilot; lukt dat niet, dan staat de prompt in een tekstvak om zelf te kopiëren); (4) rechts ruimte voor de antwoordopties en de uitleg. Er staat steeds één vraag in beeld; de regels van die vraag lichten op in het script. Op een telefoon staan alle onderdelen onder elkaar: eerst de vragenbox, dan de antwoorden en uitleg. Bij `nog_te_controleren` staat rechts naast de titel een knop met waarschuwingsicoon ("Nog te controleren", met "Toon uitleg"); de waarschuwingen zelf zijn standaard ingeklapt en openen met die knop (`aria-expanded`), zodat in de kop alleen titel, samenvatting en labels staan. Bij een filterwissel springt de werkbank naar het eerste passende script (blijft het huidige script passen, dan blijft het staan); een `?script=` buiten de filters blijft zichtbaar. Een antwoord wordt direct bewaard (alleen het eerste antwoord telt), staat met tekst (naast kleur) in de kaart, en de score toont "goed bij eerste poging" en "beantwoord"; "opnieuw" wist de voortgang van dat ene script. De werkbank handelt eerst de v1-overname af voordat er voortgang wordt bewaard. |
| **Woordenboek** `/woordenboek/?q=` | 2.0 | Zoeken en groepen, zoals nu; leest/wijzigt-labels blijven. |
| **Flashcards** `/flashcards/?topic=` | 2.1 | Term op de voorkant, uitleg en voorbeeld op de achterkant. "Weet ik" en "nog niet" per kaart. |
| **Examen** `/examen/?topic=&level=` | 2.1 | Kies onderwerp, niveau en aantal vragen. Timer, geen uitleg tijdens het examen, eindscore met overzicht. Open vragen tellen niet mee. Foute antwoorden gaan naar "Herhaal je fouten". |
| **Voortgang** `/voortgang/` | 2.1 | Matrix onderwerp × niveau (percentage goed bij eerste poging) en de score per leesstap. Knop "Herhaal je fouten". |
| **AI-paneel** in de werkbank | 2.2 | Knoppen "Leg mijn script uit" (plakveld), "Genereer oefenscript" en "Geef feedback op mijn antwoord". Zichtbaar na aanmelden. Alle AI-uitvoer krijgt het label "AI, niet gecontroleerd". |

**Vaste URL's voor de PS Coach** (worden opgenomen in `agent/instructions.md`; ze mogen niet meer wijzigen zonder de agent aan te passen):

| Doel | URL |
| --- | --- |
| Een script oefenen | `https://ps-trainer.pdscloud.nl/oefenen/?script=<id>` |
| Examen | `https://ps-trainer.pdscloud.nl/examen/?topic=<id>&level=<niveau>` |
| Flashcards | `https://ps-trainer.pdscloud.nl/flashcards/?topic=<id>` |
| Woordenboek | `https://ps-trainer.pdscloud.nl/woordenboek/?q=<term>` |

**Filters op de werkbank (optioneel, wijzigen de vaste URL niet):** `/oefenen/?script=<id>` blijft ongewijzigd; daarachter mogen `&topic=<onderwerp>` en `&type=<mc|bug|open>`. Een oude `&level=` wordt genegeerd. Het onderwerp bepaalt welke scripts als chips bovenin staan; "soort vraag" bepaalt welke vragen binnen het script zichtbaar zijn. Ongeldige waarden worden genegeerd. Zonder `?script=` (of met een onbekend id) opent het standaardscript (laagste niveau, bij gelijk niveau eerst een gecontroleerd script, daarna de indexvolgorde), eerst binnen de filters. Onderwerpen zonder scripts (status "in-opbouw") staan als niet-klikbare kaart met "nog in opbouw" op de startpagina.

**Uiterlijk en toegankelijkheid:** het huidige ontwerp blijft (kleurvariabelen, licht en donker via `prefers-color-scheme` plus een handmatige keuze, IBM Plex en Source Sans). Elke vraagkaart is met het toetsenbord te bedienen, kleur is nooit het enige signaal (goed/fout krijgt ook tekst), en animaties respecteren `prefers-reduced-motion`. **Logo en iconen:** het logo en de favicon zijn een eigen `>_`-prompt (`assets/img/logo.svg`); het officiële PowerShell-logo is een handelsmerk van Microsoft en wordt niet gebruikt. De navigatie-, onderwerp- en vraagsoort-iconen zijn eigen SVG's in `assets/img/icons` en worden met CSS (`mask-image`) in de tekstkleur getekend; ze zijn decoratief (`aria-hidden`). **Onderwerpkleuren:** elk onderwerp heeft een felle kleur (icoon en rand) en een pastelkleur (de tegel, 40% dekking) voor licht en donker; onbekende onderwerpen vallen terug op de accentkleur. De onderwerpknoppen in het filter van de werkbank gebruiken dezelfde kleuren: een lichte tint (4%) van de pastelkleur met een rand in de onderwerpkleur zelf (het contrast daarvan op de pagina wordt door dezelfde test bewaakt als bij de tegels). Een gekozen knop heeft een dikkere rand (2px) en een sterkere tint (26%). Een nieuw onderwerp heeft ook een regel `.chip.filter[data-onderwerp="<id>"]` in `app.css` nodig, anders valt de filterknop terug op de accentkleur; een test bewaakt dat. Een nieuw onderwerp krijgt dus een icoon (`ico-<id>`) en kleuren (`--t-<id>`, `--p-<id>`) in `app.css`; een test bewaakt dat. **Standaardscript:** `/oefenen/` zonder `?script=` opent het script met het laagste niveau, en bij gelijk niveau eerst een gecontroleerd script (daarna de indexvolgorde).

## 6. Controle van de inhoud (GitHub Actions)

| Stap | Release | Wat |
| --- | --- | --- |
| JSON-controle | 2.0 | `validate.mjs`: elk `meta.json` tegen het schema; `dictionary.json` tegen het woordenboekschema met unieke termen; unieke `id`'s; `lines` binnen het script; precies één correct antwoord bij `mc` en `bug`; alle onderwerpen en niveaus geldig. |
| Syntaxcheck | 2.0 | `Test-Syntax.ps1` leest elk `script.ps1` met de PowerShell-parser en faalt bij syntaxfouten. Let op: scripts met een bewuste fout (functie 9) moeten syntactisch wel kloppen. |
| Cmdlet-controle | zodra de eerste scripts er staan | Haalt met de PowerShell-AST alle cmdlets en parameters uit de scripts en toetst ze tegen de geïnstalleerde modules (Microsoft.Graph, PnP.PowerShell, Az, ExchangeOnlineManagement; waar mogelijk op een Windows-runner). Modules die niet te installeren zijn (SPMT, ShareGate) blijven `nog_te_controleren`. Dit vangt verzonnen cmdlets en parameters, de grootste kans op fouten. |
| Indexbouw | 2.0 | `build-index.mjs` maakt `data/index.json` voor de gedeployde site. |
| Rooktest | 2.0 | `smoke.mjs` start de site lokaal in de workflow en controleert dat elke pagina laadt en `index.json` klopt. Dit vervangt een online testomgeving. |

`main` wordt alleen gedeployed na een pull request waarvan alle stappen groen zijn. Zoals altijd: wachten op het groene vinkje voordat je test.

### 6.1 Workflow `validate.yml`

Naam "Validatie". Draait bij een push op `feature/**` en bij een pull request naar `main`. `permissions: contents: read`, geen secrets, geen deploy. `concurrency` per workflow en ref met `cancel-in-progress`, zodat een nieuwe push de oude run stopt. Eén job `validatie` op `ubuntu-24.04` (bewust vastgezet: `ubuntu-latest` migreert vanaf 19 oktober 2026 naar Ubuntu 26; overstappen doen we later, nadat `ubuntu-26.04` is getest) met `timeout-minutes: 10`. Stappen:

1. `actions/checkout@v7` (draait op node24)
2. `actions/setup-node@v7` (draait op node24) met `node-version-file: .nvmrc` en `cache: npm` (nooit een los versienummer, `latest` of `lts/*`)
3. `node -v` en `npm -v` in het log
4. `npm ci`
5. `npm run validate`
6. `npm test`
7. `pwsh -Version` (bewijs in het log dat pwsh aanwezig is), daarna `npm run syntax`
8. `npm run smoke`

### 6.2 Workflow `deploy.yml`

Naam "Deploy". Draait alleen bij een push naar `main` (dus op het merge-moment) en handmatig via "Run workflow", dat ook alleen vanaf `main` publiceert. `permissions: contents: read` voor de bouwjob; alleen de publiceerjob krijgt `pages: write` en `id-token: write`. `concurrency` groep `pages` zonder afbreken van een lopende deploy. Runner `ubuntu-24.04`, `timeout-minutes: 10` per job, geen secrets. Twee jobs:

1. **bouwen:** `actions/checkout@v7`, `actions/setup-node@v7` (`node-version-file: .nvmrc`), `npm ci`, dezelfde controles als bij een pull request (`npm run validate`, `npm test`, `pwsh -Version` en `npm run syntax`, `npm run smoke`), dan `npm run build-site` (bouwt `_site`), `npm run smoke-site` (de rooktest op het pakket zelf) en `actions/upload-pages-artifact@v5`.
2. **publiceren** (na bouwen, alleen op `main`, omgeving `github-pages`): `actions/deploy-pages@v5`.

Het pakket bevat alleen de allowlist (paragraaf 8): `index.html`, `CNAME`, `oefenen/`, `woordenboek/`, `assets/`, `data/` (met een verse `index.json`) en `schema/`; dotfiles, `node_modules` en symbolische links (die laten het bouwen falen) blijven er altijd uit. `build-site.mjs` maakt zijn doelmap leeg en accepteert daarom alleen een map direct in de repo waarvan de naam met `_site` begint. Tests bewaken de allowlist (`tests/site.test.mjs`) en de afspraken in de workflows (`tests/workflows.test.mjs`: vaste actieversies, minimale rechten, alleen vanaf `main`, volgorde van de stappen).

## 7. Backend en AI (release 2.2)

**Function App** in `rg-ps-trainer` (hostingplan en Node-versie: zie 7.1), drie eindpunten:

| Eindpunt | Doet |
| --- | --- |
| `POST /api/explain` | Uitleg van een geplakt script in de vijf leesstappen (functie 8) |
| `POST /api/generate` | Nieuw oefenscript, met of zonder bewuste fout (functie 9) |
| `POST /api/feedback` | Feedback op een eigen antwoord bij een open vraag of "Wat doet deze regel?" (functies 7 en 10) |

**Aanmelden (voorstel):** de site meldt aan met MSAL.js (een app-registratie voor de site, een tweede voor de API met een scope). De browser stuurt een Bearer-token; de Function App valideert het met App Service Authentication ("Require authentication", HTTP 401 bij geen token). Alleen mijn account heeft toegang, door "Assignment required" op de enterprise app. Reden voor dit model: de site en de API staan op verschillende domeinen, en een sessiecookie van `azurewebsites.net` wordt door browsers steeds vaker als third-party cookie geblokkeerd. Met een Bearer-token spelen cookies geen rol. Dit besluit maak ik definitief aan het begin van 2.2.

**Aanroep naar Foundry:** de Function gebruikt een system-assigned managed identity met alleen de rol die nodig is om de agent aan te roepen (de exacte rol controleer ik in de documentatie bij de bouw). Er staan geen sleutels in code, app-instellingen of GitHub.

**Harde rem op kosten** (een Azure-budget waarschuwt alleen):
1. Een dagelijkse limiet op het aantal aanroepen, geteld in Table Storage per gebruiker.
2. Een maximale invoerlengte (bijvoorbeeld 6.000 tekens) en een maximaal aantal uitvoer-tokens per aanroep.
3. Een lage tokens-per-minuut-limiet op de modeldeployment in Foundry zelf.
4. Een budget van €10 per maand met meldingen bij 50%, 80% en 100%.

### 7.1 Node.js-versie: gebaseerd op eerdere fouten en de documentatie

**Wat er in eerdere projecten is gebeurd** (uit `mokum-competitie/CLAUDE.md` en de skill `pdscloud-project-setup`):
- **Windows Consumption** geeft standaard een zeer oude Node-versie (v0.10). Niet gebruiken zonder expliciete versie.
- **Node 20** (end-of-life) gaf dezelfde problemen op Azure.
- **Node 24 op Linux Consumption** gaf na deploy permanent HTTP 503, ook op het SCM/Kudu-endpoint, meer dan 25 minuten lang. `az functionapp show` meldde ondertussen `Running`, en `az functionapp list-runtimes` toonde Node 24 als beschikbaar. Beide commando's zijn dus **geen bewijs** dat de app werkt. Oplossing was `--linux-fx-version "Node|22"`, herstart en een **verse** zip uploaden.
- Dit klopt met Microsoft Learn ("Azure Functions runtime versions", bekeken 11 oktober 2026): Node 22 is de laatste versie op Linux Consumption. Node 24 en 22 zijn GA op runtime 4 (einde ondersteuning: Node 22 op 30 april 2027, Node 24 op 30 april 2028). Linux Consumption stopt op 30 september 2028; Microsoft verwijst naar Flex Consumption. De Node-referentiepagina van Azure Functions spreekt zichzelf tegen (24 en 22 in de tabel, 18 en 20 in de voorbeelden), dus alleen de pagina over runtimeversies telt.

**Regels voor dit project**

| Regel | Uitwerking |
| --- | --- |
| Twee scopes, elk met één bron | **Tooling** (repo-root: validatie, indexbouw, dev-server, rooktest, GitHub Actions): Node 24, gelijk aan de laptop (`node -v` gaf v24.18.0). `.nvmrc`, `package.json` (`engines`) en `.npmrc` (`engine-strict`) in de root. Let op: npm controleert `engines` alleen bij installeren, niet bij `npm run`. Daarom begint elk npm-script met `tools/check-node.mjs`, dat de hoofdversie vergelijkt met `.nvmrc` en anders stopt met een foutmelding. **Function** (`api/`): de versie die in Azure aantoonbaar draait; verwachting Node 22. Eigen `api/.nvmrc` en `api/package.json` (`engines`). |
| GitHub Actions | `actions/setup-node` met `node-version-file` (root-`.nvmrc` voor tooling, `api/.nvmrc` voor de API-workflow). Nooit een los getal, `latest` of `lts/*`. |
| Lokaal | Voor elke sessie `node -v` in de map die je gebruikt. Voor `api/` moet de hoofdversie gelijk zijn aan `api/.nvmrc`; daarvoor is een versiebeheerder nodig (bijvoorbeeld fnm of nvm-windows) zodat je andere projecten niet geraakt worden. Claude Code controleert dit als eerste stap. |
| Runtime-test vóór bouwen | Eerste stap van 2.2, nog voor er functiecode is: maak de Function App aan, deploy één eindpunt dat `process.version` teruggeeft en wacht op HTTP 200. Blijft het langer dan 10 minuten op 503 (geen koude start), dan geldt je eigen les: verdenk eerst de runtimeversie. Pas daarna wordt er gebouwd. |
| Geen vertrouwen in statusmeldingen | `az functionapp show` (`Running`) en `list-runtimes` gelden niet als bewijs. Alleen een echte HTTP-aanroep op het eindpunt telt. |
| Herstelroute (uit de les) | `az functionapp config set ... --linux-fx-version "Node|22"` (bij Linux), herstart, en daarna een verse zip met alle huidige functiebestanden deployen. Een oudere zip miste eerder een nieuwe function. |
| Deploy van de backend | In `mokum-competitie` rolde de backend niet automatisch uit (alleen `frontend/**` triggerde de workflow). Hier krijgt `api/**` een eigen workflow `deploy-api.yml` met een rooktest op het eindpunt na afloop. |
| Documentatie | `CLAUDE.md` noemt beide versies, de runtime-test en de herstelroute. Een versiewissel krijgt een eigen feature-branch. |

**Hostingplan van de Function (besluit):** Flex Consumption, omdat Linux Consumption in september 2028 stopt en Node 22 in april 2027 uit ondersteuning gaat. Flex is in mijn eigen projecten nog niet bewezen, dus de runtime-test is de poort. Faalt de test (bijvoorbeeld een permanente 503), dan geldt de terugval: Linux Consumption met Node 22, met een migratiemoment vóór april 2027 ingepland. Het prijsmodel van Flex verschilt van consumption; controleren in de Azure-prijscalculator vóór het aanmaken. Windows Consumption valt af (standaard Node v0.10).

## 8. Beveiliging

| Onderwerp | Maatregel |
| --- | --- |
| Sleutels | Geen sleutels in de website, `api/` of GitHub. Managed identity naar Foundry; geheimen, als ze toch nodig zijn, in Key Vault. |
| Data in de pagina | Alle tekst uit JSON wordt geëscaped; alleen `` `code` `` en `**vet**` worden opgemaakt. Geen `innerHTML` met ongecontroleerde data. |
| AI-uitvoer | Wordt als tekst getoond (geëscaped), met het label "AI, niet gecontroleerd". Scripts worden nooit uitgevoerd. |
| Invoer van scripts | Gebruikers plakken scripts in een tekstveld. Voor verzenden controleert de pagina op herkenbare geheimen (wachtwoorden, tokens, tenant-ID's) en waarschuwt. De Function logt nooit de inhoud van aanvragen. |
| Prompt injection | De agent behandelt een geplakt script als data, niet als instructie. Dat staat in `agent/instructions.md`. |
| CORS | De Function accepteert alleen de oorsprong `https://ps-trainer.pdscloud.nl` (en bij tests de testomgeving). |
| Externe scripts | Externe bibliotheken (MSAL.js) met vaste versie en integriteitscontrole (SRI), of lokaal meegeleverd. Content-Security-Policy via een `meta`-tag, want GitHub Pages kan geen headers zetten. |
| Lettertypen | Google Fonts blijft (besluit). De CSP staat `fonts.googleapis.com` en `fonts.gstatic.com` toe. Bezoekers sturen daarbij hun IP-adres naar Google; voor een persoonlijke leertool is dat geaccepteerd. Zelf meeleveren kan later zonder ontwerpwijziging. |
| Oefenscripts | Geen echte tenant-ID's, sleutels of sitenamen; voorbeelden gebruiken `contoso`. |
| Rechten | Branch-protectie op `main`: alleen via een pull request, met de check "Validatie" als verplichte, groene check. Mijn Merge-klik in GitHub is het akkoord. Claude Code pusht nooit naar `main` en merget nooit zelf. |
| Lokale server | `tools/server.mjs` geeft 404 (met dezelfde tekst als bij een onbekend pad) voor elk padsegment dat met een punt begint en voor `node_modules`, ook in de `%2e`-variant en na het oplossen van `..`. Alleen `/.well-known/` is toegestaan. Zo komen `.env` en `.git/` niet via de dev-server of de rooktest naar buiten. |
| Publiceren | Bij een deploy gaat alleen een allowlist van sitebestanden naar GitHub Pages: `index.html`, de pagina-mappen, `assets/`, `data/`, `schema/` en `CNAME`. Nooit `tests/`, `tools/`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `.github/` of andere repo-bestanden. |

## 9. Kosten (indicatief, prijzen controleren in de Azure-prijscalculator)

| Onderdeel | Release | Verwachting |
| --- | --- | --- |
| GitHub Pages, GitHub Actions | 2.0 en verder | Gratis binnen de normale limieten voor een publieke repo |
| Function App | 2.2 | Vrijwel gratis bij eigen gebruik (gratis maandelijkse hoeveelheid aanroepen) |
| Table Storage | 2.2 en 2.3 | Centen per maand |
| Foundry (gpt-5-mini) | 2.2 | Per token; bij eigen gebruik en de limieten uit paragraaf 7 ruim onder het budget |
| Totaal | | Doel: onder €10 per maand |

## 10. Domein en hosting

- **Domein:** `ps-trainer.pdscloud.nl`; DNS bij TransIP (CNAME naar `peterdeswart96-ship-it.github.io`); HTTPS afdwingen in de Pages-instellingen. De bestaande skill `github-pages-subdomain` begeleidt dit in Deploy.
- **Deploy:** GitHub Actions (`upload-pages-artifact` en `deploy-pages`) zodat de gebouwde index meegaat zonder die in git te zetten. Pages krijgt dus **GitHub Actions als bron** (niet "Deploy from a branch" zoals de skill `github-pages-subdomain` beschrijft). Volgorde bij het instellen: eerst het DNS-record, dan Pages inschakelen en het eigen domein instellen, dan pas de eerste deploy; zie `DEPLOY.md`.
- **Verschil met de skill `pdscloud-project-setup`:** die gaat uit van een tak `develop` met een testomgeving op `<naam>.test.pdscloud.nl`. Hier zijn beide bewust vervallen: er is geen `develop` en geen online testomgeving, alleen lokaal testen; dit staat ook in `CLAUDE.md`.
- **Branches en testen:** `main` is productie (beschermd) en `feature/*` is voor werk, altijd gemaakt vanaf `main`. Er is geen `develop` en geen online testomgeving; ik test lokaal met `npm run dev` (een webserver is nodig, want `fetch` van JSON werkt niet via `file://`). Op elke push naar een feature-branch en op elke pull request naar `main` draait `validate.yml` met validatie, tests, syntaxcheck en rooktest. Wijzigingen komen alleen via een pull request in `main`; mijn Merge-klik is het akkoord.
- **Deploy:** `deploy.yml` draait alleen op een push naar `main`, dus op het merge-moment, en voert vooraf zelf `npm run validate`, `npm test` en `npm run smoke` uit als extra veiligheid. Alleen `main` wordt gedeployed. Nadeel: de eerste echte test op `ps-trainer.pdscloud.nl` gebeurt na de merge. De rooktest en mijn controle direct na livegang (in `DEPLOY.md`) dekken dat af; terugdraaien kan met Revert op de gemergde pull request.
- **Azure:** `rg-ps-trainer` voor de Function App en opslag; de bestaande Foundry-resource uit `rg-foundry-lab` wordt hergebruikt, met een eigen project voor de PS Coach.

## 11. Plan voor Develop (release 2.0)

Elke feature-branch gaat vanaf `main` en wordt via een pull request naar `main` gemerged.

Kleine stappen, elk op een eigen feature-branch en elk met mijn akkoord vóór de volgende:

1. `feature/repo-en-validatie`: repo-indeling, `.nvmrc` en `package.json` met `engines` (paragraaf 7.1), schema, `validate.mjs`, `Test-Syntax.ps1`, `dev-server.mjs`, `smoke.mjs`, workflow `validate.yml`.
2. `feature/omzetten-v1`: de 4 scripts, 27 vragen en het woordenboek uit v1 omzetten naar `.ps1`, `meta.json` en `dictionary.json`; v1-voortgang overnemen.
3. `feature/startpagina-en-werkbank`: startpagina met onderwerpkaarten, oefenpagina met filters, woordenboekpagina, "nog in opbouw", waarschuwing bij `nog_te_controleren`.
4. `feature/deploy`: `deploy.yml`, DNS, eerste livegang van een lege maar werkende 2.0.
5. `feature/inhoud-migraties`, `...-sharepoint`, `...-foundry`, `...-purview`: de nieuwe scripts per onderwerp, elk met een eigen live-moment. Ik controleer elk script voordat het naar `main` gaat.
6. `CLAUDE.md` voor Claude Code, met de afwijking van mijn standaardstack erin.

## 12. Open vragen
Geen. Na akkoord start Develop met `feature/repo-en-validatie` (paragraaf 11).

## Copilot-prompt bij een vraag (issue #72)

Elke vraag heeft een knop "Kopieer Copilot-prompt". De prompt wordt in de browser gebouwd door `assets/js/prompt.js` (zuivere functie `bouwCopilotPrompt`) uit `meta.json` en `script.ps1`; er gaat niets naar een server en de site stuurt zelf niets naar Copilot. Besluiten van Peter: de knop staat tussen Vorige en Volgende, er is geen link naar een bepaalde Copilot (alleen kopiëren), en het goede antwoord en de uitleg staan er nooit in. Daarom staat ook de `note` uit `meta.json` er niet in (die beschrijft soms het gedrag achter een antwoord); alleen de vaste waarschuwing bij `nog_te_controleren` staat erin.

- **Inhoud:** een rol en niveau ("geduldige PowerShell-docent", ik ben IT-engineer en leer scripts lezen, antwoord in het Nederlands), het hele script met regelnummers in een omheining die langer is dan elke reeks backticks in de code, titel, niveau, `risk` en modules, de vraag met leesstap, regels en antwoordopties (of de vermelding dat het een open vraag is), en acht instructies: het hele script uitleggen, elke cmdlet en parameter met verschillen tussen Windows PowerShell 5.1 en PowerShell 7, een klein uitvoervoorbeeld, valkuilen en wat het wijzigt, links naar Microsoft Learn (alleen links die Copilot zeker kent, niets verzinnen), niets uitvoeren, een vaste opbouw van het antwoord, en aan het eind controlevragen plus de vraag of alles duidelijk is of dat er meer uitleg nodig is over een onderwerp uit het script.
- **Nog te controleren:** staat `check.status` op `nog_te_controleren`, dan komt de vaste waarschuwing in de prompt, met de vraag om onzekerheden te benoemen (de `note` niet, zie hierboven).
- **Lengte:** boven 8000 tekens meldt de knop dat de prompt lang is; hij wordt toch gekopieerd. De grens van 8000 is een aanname over Microsoft 365 Copilot Chat en nog niet geverifieerd; een test bewaakt dat de prompt van elke vraag in elk echt script eronder blijft.
- **Klembord:** `navigator.clipboard.writeText`; mislukt dat (geen toestemming of geen beveiligde pagina), dan toont de kaart een alleen-lezen tekstvak met de prompt, geselecteerd.
- **Beveiliging:** alle tekst wordt als gewone tekst in de prompt en in het tekstvak gezet (`textContent` en `value`), nooit als HTML.
- **Niet gebouwd (suggesties uit het issue):** een eigen tekstveld voor "wat ik niet snap", voorgestelde vervolgvragen en een keuze om het antwoord mee te sturen.
