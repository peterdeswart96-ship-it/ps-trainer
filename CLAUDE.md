# CLAUDE.md – PowerShell Leestrainer (ps-trainer)

## Wat dit project is
Een leertool om PowerShell-scripts voor Microsoft 365 en Azure te leren **lezen**: begrijpen wat een script doet, wat het wijzigt en waar de valkuilen zitten. Website op `ps-trainer.pdscloud.nl` (GitHub Pages) plus later een Foundry-agent "PS Coach" met een Azure Function als tussenlaag.

Eigenaar: Peter de Swart (IT-engineer, geen developer, wil beter worden in PowerShell). Projectmethode: 4D (Define, Design, Develop, Deploy). Define en Design zijn klaar; we zitten in **Develop**.

## Lees eerst
- `DEFINE.md`: wat en waarom (versie 0.9, akkoord).
- `DESIGN.md`: hoe (versie 1.22, definitief). **Leidend voor alle technische keuzes.**
- Twijfel je of mist er iets? Vraag Peter. Verzin niets en maak geen aannames over scope.
- `docs/sessies/`: een overdracht per sessie. Begin een nieuwe sessie met het nieuwste bestand: de stand van zaken, besluiten en wat er openstaat.

## Werkwijze (verplicht)
1. Antwoord in het Nederlands. Code, cmdlets en technische termen blijven Engels.
2. Peter is geen developer: leg bij elk bestand dat je maakt of wijzigt kort uit wat het doet en waarom.
3. **Eén stap tegelijk.** Na elke stap: laat zien wat er is gewijzigd, voer de controles uit en laat de onafhankelijke review doen. Commit, push, pull request en merge doe je daarna zelf (zie punt 6), zonder daarvoor om akkoord te vragen. Wacht wel op Peters akkoord voordat je een volgende stap begint die iets nieuws beslist: de scope, de lijst met scripts van een onderwerp of een ontwerpbesluit.
4. Lever altijd **volledige bestanden**, nooit instructies om losse regels te vervangen.
5. Branches: `main` = productie (beschermd), `feature/*` = werk. Er is geen `develop`. Maak feature-branches vanaf `main` en lever wijzigingen via een pull request naar `main`.
6. **Nooit rechtstreeks pushen naar `main`.** Wijzigingen gaan via een pull request, en Claude Code merget die zelf met `gh pr merge` (squash) zodra de check "Validatie" groen is (wacht erop met `gh pr checks --watch` en controleer het resultaat) en de onafhankelijke review is verwerkt. Is de check rood of is een bevinding niet verwerkt, dan merge je niet maar meld je dat aan Peter. Nooit forceren, nooit `--admin`, nooit de branch-protectie omzeilen en nooit auto-merge (`--auto`). Let op: een merge naar `main` gaat direct live (`deploy.yml`). Peter mag een merge altijd zelf doen of een pull request tegenhouden.
7. Commitberichten in het Nederlands, kort en beschrijvend.
8. Na elke push: wacht zelf op het **groene vinkje** in GitHub Actions en meld de uitkomst aan Peter. Peter hoeft niet meer te wachten voordat hij test.
9. Werkomgeving is Windows met PowerShell. Geef PowerShell-commando's, geen bash. Zips voor handmatige deploys met Windows-`tar` (volledig pad met `C:/`), niet met `Compress-Archive`.

## Werkwijze in VS Code
De repo is de bron van waarheid; `DEFINE.md` en `DESIGN.md` zijn leidend. Verandert een ontwerpbesluit, werk het document dan zelf bij (versie verhogen, statusregel bovenaan) en meld het.
- **Onafhankelijke review:** laat voor je een stap als klaar meldt een aparte subagent met schone context de wijziging beoordelen (correctheid, regressies, tegenstrijdigheid met `DESIGN.md`/`CLAUDE.md`). Meld de bevindingen eerlijk. Markeer onzekere cmdlets/parameters als `nog_te_controleren`.
- **Stoppunten (Peters akkoord):** Azure-resources, kosten, DNS, nieuw domein of nieuwe omgeving, en alles wat scope, scriptlijst of ontwerpbesluit bepaalt.

## Node-versie (hier is het vijf keer misgegaan)
Begin elke sessie met `node -v` en `git branch --show-current`; stop en meld het bij afwijking van `.nvmrc`. Details en lessen: `docs/node-versies.md`.

## Afwijkingen van Peters standaardstack (bewust, niet "corrigeren")
- Geen React, Vite of Tailwind: platte HTML, CSS en JavaScript-modules. Eén klein Node-script bouwt `data/index.json` in CI.
- AI loopt via Microsoft Foundry (gpt-5-mini), **niet** via de Claude API.
- Geen online testomgeving en geen `.test.pdscloud.nl`, ondanks de skill `pdscloud-project-setup`. Peter test lokaal met `npm run dev`; GitHub Actions doet validatie, bouw en rooktest op elke push naar een feature-branch, en elke pull request naar `main` wordt gevalideerd (check "Validatie"). Alleen `main` wordt gedeployed: `deploy.yml` (later) draait alleen op een push naar `main`, dus op het merge-moment.
- `api/` blijft leeg tot release 2.2. Bouw niets voor de backend eerder.

## Inhoudsregels voor scripts en vragen
Gebruik alleen cmdlets en parameters waarvan je zeker bent (anders `check.status` = `nog_te_controleren`; ShareGate altijd) en alleen `contoso`-voorbeelden. Alle regels: `docs/inhoudsregels.md`.

## Beveiliging
- Geen sleutels, tokens of wachtwoorden in code, JSON, workflows of commits.
- Tekst uit JSON altijd escapen; geen `innerHTML` met ongecontroleerde data. Scripts worden nooit uitgevoerd in de app.
- Bij `feature/deploy` alleen een allowlist van sitebestanden publiceren; nooit `tests/`, `tools/`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `.github/`.
- Overige regels (vaste URL's, `PAGINAS` in smoke.mjs, lokale server, iconen): `docs/beveiliging.md`.

## Voortgang
De checklist van Develop (release 2.0) staat in `docs/voortgang.md`. Houd hem bij: vink af wat klaar is en voeg nieuwe punten toe.
