# CLAUDE.md – PowerShell Leestrainer (ps-trainer)

## Wat dit project is
Een leertool om PowerShell-scripts voor Microsoft 365 en Azure te leren **lezen**: begrijpen wat een script doet, wat het wijzigt en waar de valkuilen zitten. Website op `ps-trainer.pdscloud.nl` (GitHub Pages) plus later een Foundry-agent "PS Coach" met een Azure Function als tussenlaag. Eigenaar Peter de Swart (geen developer); methode 4D, we zitten in **Develop** (meer: `docs/werkwijze.md`).

## Lees eerst
- `DEFINE.md`: wat en waarom (versie 0.9, akkoord).
- `DESIGN.md`: hoe (versie 1.22, definitief). **Leidend voor alle technische keuzes.**
- Twijfel je of mist er iets? Vraag Peter. Verzin niets en maak geen aannames over scope.
- `docs/sessies/`: een overdracht per sessie. Begin een nieuwe sessie met het nieuwste bestand: de stand van zaken, besluiten en wat er openstaat.

## Werkwijze (verplicht; uitwerking in `docs/werkwijze.md`)
1. Antwoord in het Nederlands. Code, cmdlets en technische termen blijven Engels.
2. Peter is geen developer: leg bij elk bestand dat je maakt of wijzigt kort uit wat het doet en waarom.
3. **Eén stap tegelijk.** Na elke stap: wijzigingen tonen, controles, onafhankelijke review; daarna zelf commit, push, PR en merge, zonder daarvoor om akkoord te vragen. Wacht op Peters akkoord vóór een stap die scope, scriptlijst of ontwerpbesluit bepaalt.
4. Lever altijd **volledige bestanden**, nooit instructies om losse regels te vervangen.
5. Branches: `main` = productie (beschermd), `feature/*` = werk, vanaf `main`, via pull request. Er is geen `develop`.
6. **Nooit rechtstreeks pushen naar `main`.** Claude merget zelf (`gh pr merge`, squash) pas als check "Validatie" groen is (`gh pr checks --watch`) en de review is verwerkt; anders niet mergen maar melden. Nooit forceren, `--admin`, protectie omzeilen of `--auto`. Een merge gaat direct live.
7. Commitberichten in het Nederlands, kort en beschrijvend.
8. Na elke push: wacht zelf op het groene vinkje en meld de uitkomst.
9. Windows met PowerShell: geef PowerShell-commando's, geen bash. Zips met Windows-`tar` (pad met `C:/`), niet `Compress-Archive`.

## Werkwijze in VS Code
- `DEFINE.md` en `DESIGN.md` zijn leidend; verandert een ontwerpbesluit, werk het document zelf bij (versie omhoog, statusregel) en meld het.
- **Onafhankelijke review:** vóór "klaar" beoordeelt een aparte subagent met schone context de wijziging. Meld bevindingen eerlijk. Onzekere cmdlets/parameters: `nog_te_controleren`.
- **Stoppunten (Peters akkoord):** Azure-resources, kosten, DNS, nieuw domein of nieuwe omgeving, en alles wat scope, scriptlijst of ontwerpbesluit bepaalt.

## Node-versie (hier is het vijf keer misgegaan)
Begin elke sessie met `node -v` en `git branch --show-current`; stop en meld het bij afwijking van `.nvmrc`. Details en lessen: `docs/node-versies.md`.

## Afwijkingen van Peters standaardstack (bewust, niet "corrigeren")
- Geen React, Vite of Tailwind: platte HTML, CSS en JavaScript-modules. Eén klein Node-script bouwt `data/index.json` in CI.
- AI loopt via Microsoft Foundry (gpt-5-mini), **niet** via de Claude API.
- Geen online testomgeving (ondanks skill `pdscloud-project-setup`): Peter test lokaal met `npm run dev`; alleen `main` wordt gedeployed. Details: `docs/werkwijze.md`.
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
