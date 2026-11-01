# Werkwijze: details

Uitwerking van de korte regels in `CLAUDE.md`. Bij tegenstrijdigheid geldt `CLAUDE.md`. De regelnummers verwijzen naar de nummering daar.

## Pull request en merge (regel 6)
- **Nooit rechtstreeks pushen naar `main`.** Wijzigingen gaan via een pull request.
- Claude Code merget die zelf met `gh pr merge` (squash) zodra de check "Validatie" groen is (wacht erop met `gh pr checks --watch` en controleer het resultaat) en de onafhankelijke review is verwerkt.
- Is de check rood of is een bevinding niet verwerkt, dan merge je niet maar meld je dat aan Peter.
- Nooit forceren, nooit `--admin`, nooit de branch-protectie omzeilen en nooit auto-merge (`--auto`).
- Let op: een merge naar `main` gaat direct live (`deploy.yml`).
- Peter mag een merge altijd zelf doen of een pull request tegenhouden.

## Na elke push (regel 8)
Wacht zelf op het **groene vinkje** in GitHub Actions en meld de uitkomst aan Peter. Peter hoeft niet meer te wachten voordat hij test.

## Werkomgeving (regel 9)
Windows met PowerShell. Geef PowerShell-commando's, geen bash. Zips voor handmatige deploys met Windows-`tar` (volledig pad met `C:/`), niet met `Compress-Archive`.

## Eén stap tegelijk (regel 3)
Na elke stap: laat zien wat er is gewijzigd, voer de controles uit en laat de onafhankelijke review doen. Commit, push, pull request en merge doe je daarna zelf (zie hierboven), zonder daarvoor om akkoord te vragen. Wacht wel op Peters akkoord voordat je een volgende stap begint die iets nieuws beslist: de scope, de lijst met scripts van een onderwerp of een ontwerpbesluit.

## Werkwijze in VS Code
- De repo is de bron van waarheid; `DEFINE.md` en `DESIGN.md` zijn leidend. Verandert een ontwerpbesluit, werk het document dan zelf bij (versie verhogen, statusregel bovenaan) en meld het.
- **Onafhankelijke review:** laat voor je een stap als klaar meldt een aparte subagent met schone context de wijziging beoordelen (correctheid, regressies, tegenstrijdigheid met `DESIGN.md`/`CLAUDE.md`). Meld de bevindingen eerlijk. Markeer onzekere cmdlets/parameters als `nog_te_controleren`.
- **Stoppunten (Peters akkoord):** Azure-resources, kosten, DNS, nieuw domein of nieuwe omgeving, en alles wat scope, scriptlijst of ontwerpbesluit bepaalt.

## Testen en deployen (afwijking van de standaardstack)
Geen online testomgeving en geen `.test.pdscloud.nl`, ondanks de skill `pdscloud-project-setup`. Peter test lokaal met `npm run dev`. GitHub Actions doet validatie, bouw en rooktest op elke push naar een feature-branch, en elke pull request naar `main` wordt gevalideerd (check "Validatie"). Alleen `main` wordt gedeployed: `deploy.yml` (later) draait alleen op een push naar `main`, dus op het merge-moment.

## Over het project
Eigenaar: Peter de Swart (IT-engineer, geen developer, wil beter worden in PowerShell). Projectmethode: 4D (Define, Design, Develop, Deploy). Define en Design zijn klaar; we zitten in **Develop**.
