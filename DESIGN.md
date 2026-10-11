# DESIGN – PowerShell Leestrainer

Status: versie 1.1 (11 oktober 2026), definitief. Wijziging t.o.v. 1.0: correctie in paragraaf 7.1 en 3: npm controleert `engines` alleen bij installeren, niet bij `npm run`; daarom is er een eigen controlescript `tools/check-node.mjs`. Geen open vragen.

## 1. Besluiten

| Onderwerp | Besluit |
| --- | --- |
| Pagina's en URL's | Meerdere pagina's met nette, vaste URL's. De PS Coach kan direct naar een pagina of script linken. |
| Opslag van een oefenscript | Per script een echt `.ps1`-bestand plus een `meta.json` met vragen, niveau en status. |
| Controle in GitHub Actions | Eerst JSON-controle en PowerShell-syntaxcheck. De controle van cmdlets en parameters tegen de geïnstalleerde modules komt erbij zodra de eerste scripts er staan. |
| Navigatie | Startpagina met onderwerpkaarten (met voortgang), daarna filteren op niveau. De werkbank uit v1 blijft de oefenpagina. |
| Stack website | Platte HTML, CSS en JavaScript-modules. Geen React, geen Vite, geen Tailwind. Eén klein Node-script in GitHub Actions bouwt de index van alle scripts. |
| Hosting | GitHub Pages, gedeployed via GitHub Actions, op `ps-trainer.pdscloud.nl` |
| Backend (vanaf 2.2) | Azure Function App met aanmelden via Entra ID, die de Foundry-agent "PS Coach" aanroept met een managed identity |
| Taal van de Function | Node.js. Versie per scope vastgelegd; de versie van de Function wordt in Azure bewezen met een runtime-test voordat er iets gebouwd wordt (paragraaf 7.1). |
| Hostingplan Function | Flex Consumption. Terugval: Linux Consumption met Node 22 (bewezen in `mokum-competitie`), als de runtime-test op Flex faalt. Windows Consumption valt af. |
| Node-scopes | Tooling op Node 24 (gelijk aan de laptop, v24.18.0). Function op de versie die de runtime-test in Azure bewijst, verwacht Node 22. |
| Testen | Alleen lokaal (`npm run dev`), geen online testomgeving. Op elke push en pull request draaien validatie, bouw en rooktest in GitHub Actions. |
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
│  ├─ topics.json                 De 5 onderwerpen (naam, omschrijving, volgorde, status)
│  ├─ dictionary.json             Woordenboek (ook voor de flashcards)
│  └─ scripts/
│     └─ <onderwerp>/<script-id>/
│        ├─ script.ps1            De code
│        └─ meta.json             Titel, niveau, status, vragen
├─ agent/instructions.md          Instructies van de PS Coach, onder versiebeheer
├─ api/                           Azure Function (vanaf 2.2)
├─ schema/script.schema.json      JSON Schema voor meta.json
├─ tools/
│  ├─ build-index.mjs             Bouwt data/index.json uit alle meta.json-bestanden
│  ├─ validate.mjs                Controleert alle meta.json tegen het schema en regelnummers tegen de .ps1
│  ├─ Test-Syntax.ps1             PowerShell-syntaxcheck van alle .ps1-bestanden
│  ├─ check-node.mjs              Stopt direct als de Node-hoofdversie niet gelijk is aan .nvmrc
│  ├─ dev-server.mjs              Kleine lokale webserver zonder extra pakketten (bouwt eerst de index)
│  └─ smoke.mjs                   Rooktest: alle pagina's geven HTTP 200 en index.json is geldig
├─ .nvmrc                         De vaste Node-versie (zie 7.1)
├─ .npmrc                         engine-strict=true (npm weigert installeren bij een verkeerde Node-versie)
├─ package.json                   Scripts (dev, validate, smoke) en "engines" voor de Node-versie
├─ .github/workflows/             validate.yml en deploy.yml
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
| `topic` | `migraties`, `sharepoint`, `foundry`, `purview` of `entra-id`. |
| `level` | `basis`, `gevorderd` of `expert`. |
| `risk` | `read` of `write`. Toont het label "alleen lezen" of "wijzigt". |
| `check.status` | `gecontroleerd` of `nog_te_controleren`. De ShareGate-scripts staan op `nog_te_controleren` en tonen een zichtbare waarschuwing. |
| `question.type` | `mc` (meerkeuze), `bug` (zoek de fout) of `open` (zelf formuleren). In 2.2 komt `explain-line` erbij. |
| `question.step` | Een van de vijf leesstappen: `parameters`, `bron`, `bewerking`, `wijziging`, `uitvoer`. Hiermee kan de voortgangspagina laten zien welke stap je het zwakst beheerst. |
| `question.lines` | Regelnummers in `script.ps1` die oplichten. De controle in `validate.mjs` faalt als een regelnummer buiten het script valt. |
| `explanation` | Eenvoudige opmaak: alleen `` `code` `` en `**vet**`. De pagina escaped alle tekst; er wordt nooit HTML uit data geïnjecteerd. |

### 4.2 Overige bestanden

- **`topics.json`:** per onderwerp `id`, `name`, `summary`, `order`, `status` (`live` of `in-opbouw`). Een onderwerp zonder scripts toont "nog in opbouw" in plaats van een lege lijst.
- **`dictionary.json`:** groepen met items (`term`, `explanation`, `example`, `risk`, optioneel `topics`). Dezelfde data voedt het woordenboek en de flashcards.
- **`index.json`** (gebouwd in CI, niet in git): per script de velden uit `meta.json` behalve de vragen, plus het aantal vragen per type. De startpagina en filters gebruiken alleen dit bestand.

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

- **Overname van v1:** bij het eerste bezoek leest de pagina de oude sleutel `ps-leestrainer-v1` (formaat `<legacyId>:<index>`) en zet die om naar `<id>:q<index+1>`. Daarom blijven de vraag-volgorde en `legacyId` van de 4 bestaande scripts gelijk.
- **Klaar voor 2.3:** elk antwoord heeft een tijdstempel, zodat voortgang later per antwoord samengevoegd kan worden (nieuwste wint) in plaats van het hele bestand te overschrijven.
- Alle toegang tot `localStorage` zit in `try/catch` (zoals in v1). Zonder opslag werkt de site gewoon, alleen zonder voortgang.

## 5. Schermen

| Pagina | Release | Inhoud |
| --- | --- | --- |
| **Startpagina** `/` | 2.0 | Leesmethode (5 stappen), kaarten per onderwerp met aantal scripts, voortgang en status ("nog in opbouw" waar nodig). |
| **Oefenen** `/oefenen/?script=<id>` | 2.0 | De werkbank uit v1: script met regelnummers links, vragen rechts die regels oplichten. Bovenaan filters voor onderwerp, niveau en soort vraag. Waarschuwingsbalk bij `nog_te_controleren`. Op een telefoon staat de code boven de vragen. |
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

**Uiterlijk en toegankelijkheid:** het huidige ontwerp blijft (kleurvariabelen, licht en donker via `prefers-color-scheme` plus een handmatige keuze, IBM Plex en Source Sans). Elke vraagkaart is met het toetsenbord te bedienen, kleur is nooit het enige signaal (goed/fout krijgt ook tekst), en animaties respecteren `prefers-reduced-motion`.

## 6. Controle van de inhoud (GitHub Actions)

| Stap | Release | Wat |
| --- | --- | --- |
| JSON-controle | 2.0 | `validate.mjs`: elk `meta.json` tegen het schema; unieke `id`'s; `lines` binnen het script; precies één correct antwoord bij `mc` en `bug`; alle onderwerpen en niveaus geldig. |
| Syntaxcheck | 2.0 | `Test-Syntax.ps1` leest elk `script.ps1` met de PowerShell-parser en faalt bij syntaxfouten. Let op: scripts met een bewuste fout (functie 9) moeten syntactisch wel kloppen. |
| Cmdlet-controle | zodra de eerste scripts er staan | Haalt met de PowerShell-AST alle cmdlets en parameters uit de scripts en toetst ze tegen de geïnstalleerde modules (Microsoft.Graph, PnP.PowerShell, Az, ExchangeOnlineManagement; waar mogelijk op een Windows-runner). Modules die niet te installeren zijn (SPMT, ShareGate) blijven `nog_te_controleren`. Dit vangt verzonnen cmdlets en parameters, de grootste kans op fouten. |
| Indexbouw | 2.0 | `build-index.mjs` maakt `data/index.json` voor de gedeployde site. |
| Rooktest | 2.0 | `smoke.mjs` start de site lokaal in de workflow en controleert dat elke pagina laadt en `index.json` klopt. Dit vervangt een online testomgeving. |

`main` wordt alleen gedeployed nadat alle stappen groen zijn. Zoals altijd: wachten op het groene vinkje voordat je test.

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
| Rechten | Branch-protectie op `main`; nooit automatisch mergen zonder mijn akkoord. |

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
- **Deploy:** GitHub Actions (`upload-pages-artifact` en `deploy-pages`) zodat de gebouwde index meegaat zonder die in git te zetten.
- **Verschil met de skill `pdscloud-project-setup`:** die gaat uit van een testomgeving op `<naam>.test.pdscloud.nl` voor `develop`. Hier is bewust gekozen voor alleen lokaal testen; dit staat ook in `CLAUDE.md`.
- **Branches en testen:** `main` is productie, `develop` is de integratietak, `feature/*` voor nieuwe functies. Er is geen online testomgeving; ik test lokaal met `npm run dev` (een webserver is nodig, want `fetch` van JSON werkt niet via `file://`). Op elke push en pull request draait de workflow met validatie, bouw en rooktest. Alleen `main` wordt gedeployed, en alleen na mijn expliciete akkoord. Nadeel: de eerste echte test op `ps-trainer.pdscloud.nl` gebeurt na de merge. De rooktest en mijn controle direct na livegang (in `DEPLOY.md`) dekken dat af; terugdraaien kan met een revert-commit.
- **Azure:** `rg-ps-trainer` voor de Function App en opslag; de bestaande Foundry-resource uit `rg-foundry-lab` wordt hergebruikt, met een eigen project voor de PS Coach.

## 11. Plan voor Develop (release 2.0)

Kleine stappen, elk op een eigen feature-branch en elk met mijn akkoord vóór de volgende:

1. `feature/repo-en-validatie`: repo-indeling, `.nvmrc` en `package.json` met `engines` (paragraaf 7.1), schema, `validate.mjs`, `Test-Syntax.ps1`, `dev-server.mjs`, `smoke.mjs`, workflow `validate.yml`.
2. `feature/omzetten-v1`: de 4 scripts, 26 vragen en het woordenboek uit v1 omzetten naar `.ps1`, `meta.json` en `dictionary.json`; v1-voortgang overnemen.
3. `feature/startpagina-en-werkbank`: startpagina met onderwerpkaarten, oefenpagina met filters, woordenboekpagina, "nog in opbouw", waarschuwing bij `nog_te_controleren`.
4. `feature/deploy`: `deploy.yml`, DNS, eerste livegang van een lege maar werkende 2.0.
5. `feature/inhoud-migraties`, `...-sharepoint`, `...-foundry`, `...-purview`: de nieuwe scripts per onderwerp, elk met een eigen live-moment. Ik controleer elk script voordat het naar `main` gaat.
6. `CLAUDE.md` voor Claude Code, met de afwijking van mijn standaardstack erin.

## 12. Open vragen
Geen. Na akkoord start Develop met `feature/repo-en-validatie` (paragraaf 11).
