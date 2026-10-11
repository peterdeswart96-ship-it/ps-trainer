# Overdracht – livegang van 11 oktober 2026 (tweede sessie die dag)

Onderwerp: de eerste livegang van de site, controle na livegang en de zoektocht naar officiële iconen voor SharePoint en Purview.
Dit document vervolgt `2026-10-11-overdracht.md`. Wat daar over PR #12 en "Pages nog niet ingeschakeld" staat, is **achterhaald**. Lees ook `CLAUDE.md` (voortgang) en `DEPLOY.md`.

## Rode draad

PR #12 (deploy) is gemerged en de site staat live op **https://ps-trainer.pdscloud.nl/**. Pages (bron GitHub Actions), het eigen domein en HTTPS waren door Peter ingesteld voordat de merge plaatsvond. Daarna is de site visueel en technisch gecontroleerd en is de voortgangslijst bijgewerkt. Aan het eind is gezocht naar officiële producticonen voor SharePoint en Purview; die bestaan niet in de beschikbare Microsoft-sets, dus er is niets toegevoegd.

| PR | Wat |
| --- | --- |
| #12 | Deploy: `deploy.yml`, `tools/build-site.mjs`, `DEPLOY.md`, tests, `CNAME`. Gemerged (squash, `aa8f78c`). |
| #14 | `CLAUDE.md`: voortgang bijgewerkt (`feature/deploy` afgevinkt, visuele controle gedaan). Gemerged (squash, `fd56c97`). |

## Wat er gebeurd is

- **Merge van PR 12:** eerst geweigerd door een merge-conflict in `CNAME`. Oorzaak: Peter had via GitHub "Create CNAME" op `main` gedaan, terwijl de feature-branch hetzelfde bestand ook aanmaakte (zelfde inhoud, ander regeleinde). Peter heeft het conflict zelf in zijn terminal opgelost (merge van `origin/main` in `feature/deploy`, push); daarna was "Validatie" groen en is gemerged. De permissie-classifier blokkeerde mijn eigen poging omdat het een `CNAME`-bestand (domein) betrof; daar is niet omheen gewerkt.
- **Deploy-run:** workflow Deploy op `main` geslaagd (36 s), gevolgd door de Pages-publicatie.
- **Controle na livegang (HTTP):** `/`, `/oefenen/`, `/woordenboek/` en `/data/index.json` geven 200. `/tools/validate.mjs`, `/DESIGN.md` en `/.git/config` geven 404, dus de allowlist werkt.
- **Visuele controle:** headless Chrome op de livesite, drie pagina's, desktop (1280 px) en telefoon (390 px), licht en donker (12 combinaties). Geen horizontale scroll, geen kapotte afbeeldingen, layout en contrast in orde. Vier screenshots zijn bekeken, de rest alleen geautomatiseerd gecontroleerd.
- **Iconen:** zie Besluiten.

## Besluiten van Peter (deze sessie)

- "merge pr 12" (uitdrukkelijke opdracht per PR) en "merge pr 14". Daarnaast gaf Peter voor **die sessie** akkoord om zelf naar `main` te mergen en pushen. Dat akkoord geldt niet voor een volgende sessie; terug naar CLAUDE.md werkwijzepunt 6.
- Voortgangslijst in `CLAUDE.md` bijwerken via een feature-branch en pull request (gedaan, #14).
- SharePoint, Purview en Migraties houden hun **eigen pictogram**. Peter downloadde `2024-microsoft-365-content-icons` en `Microsoft Entra architecture icons - Oct 2023` en gaf akkoord om iconen toe te voegen "voor zover mogelijk"; er was niets passends, dus er is niets toegevoegd.

## Bevindingen over de iconensets (voor een volgende poging)

- `2024-microsoft-365-content-icons` (ook de download bij `https://go.microsoft.com/fwlink/?linkid=869455`) bevat algemene pictogrammen in productkleuren (Microsoft Blue/Purple, Teams Purple, Planner Green, Project Green, SharePoint Teal), **geen productlogo's**. SharePoint Teal heeft alleen `Organization`; Microsoft Purple alleen `Settings`, `Tap` en `Building`. Er is geen voorwaardenbestand bij. Een algemeen pictogram als "SharePoint-icoon" gebruiken zou de regel in `assets/img/microsoft/BRON.md` schenden (alleen voor het product waarvoor het is gemaakt).
- De Visio-stencils (`linkid=2056186`) bevatten alleen algemene symbolen.
- De Azure-set V24 heeft geen SharePoint of Purview; alleen `Compliance Center` en `Azure Information Protection`, dat zijn andere producten.
- De Entra-set bevat zeven Entra-iconen (ID, ID Governance, Internet Access, Private Access, Verified ID, Workload ID, Product Family), geen SharePoint of Purview.
- Purview heeft wel [referentiearchitectuurdiagrammen in PowerPoint](https://techcommunity.microsoft.com/blog/microsoft-purview-blog/microsoft-purview-referential-architecture-diagrams/4510925), maar dat is geen iconenpakket en de voorwaarden zijn onbekend; een icoon daaruit zou geen ongewijzigd bronbestand met controlesom zijn.
- Wat nog kan: Peter levert zelf een officieel SharePoint- of Purview-bestand met voorwaarden aan (bijvoorbeeld via het Microsoft Brand Center). Dan ongewijzigd toevoegen in `assets/img/microsoft`, `bron.json` (met SHA-256), `BRON.md` en `OFFICIELE_ICONEN` in `assets/js/start.js`. Dit staat in `CLAUDE.md` en `BRON.md`.

## Wat er nog open staat

- **Inhoud voor release 2.0:** Migraties, SharePoint, Foundry, Purview, elk op een eigen feature-branch (28 scripts, circa 170 vragen volgens de vorige overdracht). Peters controle vóór ze live gaan.
- **Mogelijk te onderzoeken:** de themaknop heet in donkere modus nog "Donker thema". Niet getest of dit een label is dat niet meeverandert of bewust gedrag. Niet bevestigd.
- **Nog niet bekeken door een mens:** Safari, Firefox en een echte telefoon.
- Open punten over scripts (`entra-oude-apparaten` scope, `sharepoint-site-inventaris`, ShareGate `nog_te_controleren`) staan in `2026-10-11-overdracht.md` en zijn niet veranderd.
- Release 2.1 en verder en `api/` (vanaf 2.2): niet gestart.

## Werkwijze die goed werkte

- Eerst `gh pr checks <nr>` en dan pas mergen; bij een weigering de oorzaak zoeken (`gh pr merge` meldt "not mergeable").
- Headless Chrome via het DevTools-protocol voor visuele controle (zie het geheugenbestand `reference_chrome-headless-cdp`). Het hulpscript stond in de scratchpad en is niet bewaard.
- Gedownloade bestanden alleen lezen en bekijken, niet uitvoeren; officiële sets zelf opnieuw ophalen via de links hierboven om te vergelijken.
