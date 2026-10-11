# Overdracht – sessie van 11 oktober 2026

Onderwerp: Develop van release 2.0 (repo, validatie, tooling, CI, omzetting van v1, webpagina's, iconen) en de voorbereiding van de livegang.
Lees eerst `CLAUDE.md` (werkwijze en voortgang), `DESIGN.md` (versie 1.11, leidend) en `DEPLOY.md` (runbook). Dit document is de brug naar de volgende chat.

## Rode draad

Begonnen met een lege repo met alleen `main`; geëindigd met een werkende, geteste site (start, werkbank, woordenboek) en een kant-en-klare deploy-workflow die nog **niet** is gemerged. Alles liep via pull requests naar `main` (beschermd, check "Validatie" verplicht). Er is geen `develop` meer.

| PR | Wat |
| --- | --- |
| #1 | Repo, schema en `validate.mjs`, `Test-Syntax.ps1`, `build-index.mjs`, dev-server, rooktest, workflow `validate.yml` |
| #2 | CI bijwerken: `ubuntu-24.04` vastgezet, actions op v7 (node24) |
| #3 | v1 omgezet: 4 scripts, **27 vragen** (niet 26), woordenboek (40 items), `migreerV1()`, regressietest tegen `legacy/` |
| #4 | Werkwijzeregel: Claude merget alleen na uitdrukkelijke opdracht per PR |
| #5 | Voortgangslijst in CLAUDE.md |
| #6 tot #9 | Webpagina's: gedeelde basis, woordenboek, startpagina, werkbank |
| #10 | Eigen logo en iconen, pastelkleurige tegels, basisscript als standaard |
| #11 | Officiële Microsoft-iconen voor Foundry en Entra ID |
| **#12** | **Deploy: workflow, sitepakket, runbook en tests. OPEN. Het mergen is de livegang.** |

## Wat er staat

- **Site (statisch, platte HTML/CSS/JS-modules, geen frameworks):** `/` (onderwerpkaarten met voortgang), `/oefenen/?script=<id>` (werkbank met filters), `/woordenboek/?q=`. Strikte CSP via een `meta`-tag, nooit `innerHTML` (een test verbiedt het), licht en donker.
- **Inhoud:** 4 scripts (`entra-inactieve-gebruikers`, `entra-oude-apparaten`, `sharepoint-site-inventaris`, `migraties-sharegate-bibliotheken`), 27 vragen, 40 woordenboekitems. Onderwerpen Foundry en Purview zijn "nog in opbouw".
- **Tooling:** `npm run validate | test | syntax | smoke | build-index | build-site | smoke-site | dev`. 195 tests (`node:test`, alleen ingebouwde modules, enige extra pakket is `ajv`).
- **Deploy-voorbereiding (PR #12):** `deploy.yml`, `tools/build-site.mjs` (allowlist-pakket `_site`), rooktest op het pakket zelf, `DEPLOY.md`, `CNAME`.

## Besluiten van Peter (deze sessie)

- Branches: alleen `main` en `feature/*`, altijd een pull request. Peter merget zelf, **tenzij hij per PR "merge PR N" zegt** (CLAUDE.md, werkwijzepunt 6). Deze sessie gaf hij daarnaast eenmalig opdracht om alle PR's van die sessie te mergen zodra de check groen was; dat gold niet voor PR #12 (livegang) en geldt niet voor de volgende sessie.
- Filters op de werkbank: onderwerp en niveau kiezen scripts, "soort vraag" filtert vragen; `?script=` blijft ongewijzigd (vast voor de PS Coach); zonder `?script=` opent het **standaardscript**: laagste niveau, bij gelijk niveau eerst een gecontroleerd script (nu "Inactieve gebruikers").
- Lege onderwerpen zijn een niet-klikbare tegel "Nog in opbouw".
- v1-look behouden; voortgang uit v1 wordt eenmalig overgenomen (tijd `1970-01-01` = onbekend).
- Eigen `>_`-logo, niet het PowerShell-logo (handelsmerk; Microsoft-iconen mogen het eigen product niet vertegenwoordigen).
- Officiële Microsoft-iconen alleen voor Foundry en Entra ID, ongewijzigd, met productnaam; Peter accepteerde de voorwaarden voor trainingsdoeleinden (zie `assets/img/microsoft/BRON.md`). SharePoint en Purview hebben in de Microsoft-sets geen productpictogram en houden een eigen icoon.
- Afwijkingen van v1 (met akkoord): graph-devices q2 optie A en uitleg, q7 extra punt over `$null -lt $grens`; ShareGate q6 zonder tenant-to-tenant; graph-users q4 (links/rechts bij `$null -eq` was omgedraaid; extra, door mij hersteld en gemeld).

## Wat er nog open staat (in volgorde)

**Livegang (PR #12)** – nog niets live gezet:
1. DNS-record `ps-trainer` is **door Peter gedaan en werkt** (CNAME naar `peterdeswart96-ship-it.github.io`). Peter meldde ook de voorbereiding (CAA-controle, domeinverificatie) als gedaan.
2. **Pages is nog niet ingeschakeld** (GitHub geeft 404). Te doen na Peters uitdrukkelijke "ja": `gh api -X POST repos/peterdeswart96-ship-it/ps-trainer/pages -f build_type=workflow`, daarna het eigen domein (`-f cname=ps-trainer.pdscloud.nl`), wachten op de DNS-check en het certificaat, dan `https_enforced`. De exacte commando's staan in `DEPLOY.md`.
3. De omgeving `github-pages` moet alleen `main` toestaan (verplichte stap 5 in `DEPLOY.md`; controleren met `gh api repos/.../environments/github-pages`).
4. Daarna "merge PR 12" (= de eerste deploy), wachten op het groene vinkje, en de controlelijst in `DEPLOY.md` doorlopen (404 voor `.git`, `tools`, `tests`, `DESIGN.md` enzovoort; 200 voor `/data/*.json`).

**Inhoud (Peters controle nodig):**
- ShareGate-script blijft `nog_te_controleren` (geen toegang).
- `entra-oude-apparaten`: de scope. De documentatie van `Update-MgDevice` noemt voor delegated toegang `Directory.AccessAsUser.All`, het script vraagt `Device.ReadWrite.All`.
- `sharepoint-site-inventaris`: volgens de documentatie worden bij `-Limit` sommige eigenschappen (zoals `SharingCapability`) mogelijk niet gevuld; eenheid van `StorageUsageCurrent` niet bevestigd.
- Suggestie (niet gedaan): bij `entra-inactieve-gebruikers` een `note` of vraag over `lastSuccessfulSignInDateTime` en de P1/P2-licentie.
- **Nog te schrijven voor release 2.0:** 28 scripts (Migraties 8, SharePoint 8, Foundry 9, Purview 3), circa 170 vragen; volgorde Migraties, SharePoint, Foundry, Purview; elk script krijgt Peters controle voordat het live gaat.

**Overig:**
- Nog niet door een mens bekeken: Safari en Firefox (de iconen gebruiken `mask-image`, de tegels `color-mix`; oudere browsers vallen terug op een witte tegel zonder icoon), een echte telefoon. Chrome is wel gecontroleerd (licht, donker, 390 en 1280 px).
- Release 2.1 en verder (flashcards, examen, voortgangspagina) en de backend (`api/`, vanaf 2.2) zijn niet gestart; `api/` blijft leeg tot 2.2.
- Het v1-bestand `legacy/ps-leestrainer-v1.html` blijft in de repo als bron voor de regressietest; het wordt niet gepubliceerd.

## Werkwijze die goed werkte (en valkuilen)

- **Elke stap:** bouwen, tests, onafhankelijke review door een aparte subagent met schone context, bevindingen eerlijk verwerken, pull request, wachten op het groene vinkje. De reviews vonden steeds echte punten (focus na een antwoord, dataverlies bij open vragen, een icoon dat een effen vierkant werd).
- **Visueel controleren kan:** Chrome staat op `C:\Program Files\Google\Chrome\Application\chrome.exe`. Met `--remote-debugging-port` en de ingebouwde `WebSocket` van Node 24 is het DevTools-protocol aan te sturen (viewport, kleurthema, klikken, schermafbeelding), zonder extra pakketten. De hulpscripts stonden in de tijdelijke scratchpad en zijn niet bewaard; schrijf ze desnoods opnieuw.
- **Tooling-valkuilen:** de Bash-tool breekt op heredocs met aanhalingstekens of backslashes; schrijf zulke bestanden met de Write-tool en voer ze met `node` uit. `$TMP` is niet de scratchpad. Git Bash-`tar` snapt `C:` niet: gebruik Windows-`tar` via PowerShell. Regexes in strings die door meerdere lagen gaan verliezen backslashes: controleer ze na het schrijven.
- **Contrast** is berekend en wordt door een test bewaakt voor de tegelkleuren; een nieuw onderwerp zonder icoon, kleur of allowlist-regel laat de tests falen.

## Waar de kennis staat

- `CLAUDE.md`: werkwijze (verplicht), voortgangslijst, beveiligings- en inhoudsregels.
- `DESIGN.md` (1.11): alle technische keuzes; §6.2 deploy, §8 beveiliging, §10 domein en hosting.
- `DEPLOY.md`: instellen in vaste volgorde, controle na livegang, terugdraaien.
- `assets/img/microsoft/BRON.md` en `bron.json`: bron en voorwaarden van de officiële iconen.
- Dit document: de stand van zaken per einde van deze sessie.
