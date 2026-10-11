# CLAUDE.md – PowerShell Leestrainer (ps-trainer)

## Wat dit project is
Een leertool om PowerShell-scripts voor Microsoft 365 en Azure te leren **lezen**: begrijpen wat een script doet, wat het wijzigt en waar de valkuilen zitten. Website op `ps-trainer.pdscloud.nl` (GitHub Pages) plus later een Foundry-agent "PS Coach" met een Azure Function als tussenlaag.

Eigenaar: Peter de Swart (IT-engineer, geen developer, wil beter worden in PowerShell). Projectmethode: 4D (Define, Design, Develop, Deploy). Define en Design zijn klaar; we zitten in **Develop**.

## Lees eerst
- `DEFINE.md`: wat en waarom (versie 0.7, akkoord).
- `DESIGN.md`: hoe (versie 1.1, definitief). **Leidend voor alle technische keuzes.**
- Twijfel je of mist er iets? Vraag Peter. Verzin niets en maak geen aannames over scope.

## Werkwijze (verplicht)
1. Antwoord in het Nederlands. Code, cmdlets en technische termen blijven Engels.
2. Peter is geen developer: leg bij elk bestand dat je maakt of wijzigt kort uit wat het doet en waarom.
3. **Eén stap tegelijk.** Na elke stap: laat zien wat er is gewijzigd, voer de controles uit, en wacht op Peters akkoord vóór je commit of verdergaat.
4. Lever altijd **volledige bestanden**, nooit instructies om losse regels te vervangen.
5. Branches: `main` = productie, `develop` = integratie, `feature/*` = werk. Maak feature-branches vanaf `develop`.
6. **Nooit mergen naar `main`, nooit pushen naar `main`, zonder Peters expliciete akkoord.**
7. Commitberichten in het Nederlands, kort en beschrijvend.
8. Na elke push: herinner Peter eraan te wachten op het **groene vinkje** in GitHub Actions voordat hij test.
9. Werkomgeving is Windows met PowerShell. Geef PowerShell-commando's, geen bash. Zips voor handmatige deploys met Windows-`tar` (volledig pad met `C:/`), niet met `Compress-Archive`.

## Node-versie (op deze plek is het vijf keer misgegaan, wees precies)
- Begin elke sessie met `node -v` en `git branch --show-current`. Stop en meld het als de Node-hoofdversie niet gelijk is aan `.nvmrc`.
- **Tooling (repo-root):** Node 24, vastgelegd in `.nvmrc`. Elk npm-script begint met `tools/check-node.mjs`, want npm controleert `engines` alleen bij installeren.
- **Function (`api/`, vanaf release 2.2):** de versie die in Azure aantoonbaar draait, verwacht Node 22. Eigen `api/.nvmrc`. Nooit Node 24 aannemen voor Azure Functions.
- GitHub Actions: `actions/setup-node` met `node-version-file`. Nooit een los getal, `latest` of `lts/*`.
- Les uit `mokum-competitie`: Node 24 op Linux Consumption gaf permanent 503, terwijl `az functionapp show` `Running` meldde en `az functionapp list-runtimes` 24 toonde. Alleen een echte HTTP-aanroep bewijst dat een Function werkt. In 2.2 komt eerst een runtime-test (eindpunt dat `process.version` teruggeeft, HTTP 200) voordat er functiecode wordt geschreven.
- Windows Consumption is uitgesloten (standaard Node v0.10).

## Afwijkingen van Peters standaardstack (bewust, niet "corrigeren")
- Geen React, Vite of Tailwind: platte HTML, CSS en JavaScript-modules. Eén klein Node-script bouwt `data/index.json` in CI.
- AI loopt via Microsoft Foundry (gpt-5-mini), **niet** via de Claude API.
- Geen online testomgeving en geen `.test.pdscloud.nl`, ondanks de skill `pdscloud-project-setup`. Peter test lokaal met `npm run dev`; GitHub Actions doet validatie, bouw en rooktest op elke push. Alleen `main` wordt gedeployed.
- `api/` blijft leeg tot release 2.2. Bouw niets voor de backend eerder.

## Inhoudsregels voor scripts en vragen
- Elk oefenscript is een map `data/scripts/<onderwerp>/<id>/` met `script.ps1` en `meta.json` (zie DESIGN.md paragraaf 4).
- **Correctheid:** gebruik alleen cmdlets en parameters waarvan je zeker bent dat ze bestaan. Twijfel je, zeg het en zet `check.status` op `nog_te_controleren`. Peter heeft **geen toegang tot ShareGate Migrate**: ShareGate-scripts staan altijd op `nog_te_controleren`.
- Voorbeelden gebruiken `contoso`; nooit echte tenant-ID's, sleutels, sitenamen of klantgegevens.
- Elke vraag hoort bij één van de vijf leesstappen: `parameters`, `bron`, `bewerking`, `wijziging`, `uitvoer`.
- Houd `.ps1`-bestanden bij voorkeur ASCII (Windows PowerShell 5.1 leest UTF-8 zonder BOM als ANSI).
- Uitlegtekst in JSON gebruikt alleen `` `code` `` en `**vet**`.

## Beveiliging
- Geen sleutels, tokens of wachtwoorden in code, JSON, workflows of commits.
- Tekst uit JSON altijd escapen voor weergave. Geen `innerHTML` met ongecontroleerde data.
- Scripts worden nooit uitgevoerd in de app.
- Vaste URL's (`/oefenen/?script=`, `/examen/`, `/flashcards/`, `/woordenboek/`) mogen niet veranderen zonder de agentinstructies aan te passen.
- Elke nieuwe pagina wordt toegevoegd aan `PAGINAS` in `tools/smoke.mjs`, anders test de rooktest haar niet.

## Voortgang Develop (release 2.0) – houd dit bij
- [x] Repo `peterdeswart96-ship-it/ps-trainer` met `main` en `develop`
- [x] Feature-branch `feature/repo-en-validatie` aangemaakt
- [x] `.gitattributes`, `.gitignore`, `.npmrc`, `.nvmrc`, `package.json`, `tools/check-node.mjs`
- [x] Stap 3: `schema/script.schema.json`, `tools/validate.mjs`, testfixtures en tests
- [x] Stap 4a: `tools/Test-Syntax.ps1` en uitgebreide validatietests
- [x] Stap 4b: `data/topics.json`, `tools/build-index.mjs`, `tools/server.mjs`, `tools/dev-server.mjs`, `tools/smoke.mjs` en `tests/tools.test.mjs`
- [ ] Stap 5: workflow `validate.yml`
- [ ] `feature/omzetten-v1`: 4 scripts, 26 vragen en woordenboek uit v1 omzetten
- [ ] `feature/startpagina-en-werkbank`
- [ ] `feature/deploy` (`deploy.yml`, DNS, eerste livegang)
- [ ] Inhoud: Migraties, SharePoint, Foundry, Purview (elk eigen feature-branch)
