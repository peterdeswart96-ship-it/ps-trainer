# Overdracht – Foundry compleet (13 oktober 2026)

Onderwerp: alle 9 scripts van het onderwerp Foundry (PR 52 t/m 60). Daarmee zijn Migraties, SharePoint, Foundry en Purview volledig; alleen Entra ID heeft de 2 bestaande scripts.
Dit document vervolgt `2026-10-12-overdracht-sharepoint-compleet.md`. Lees ook `CLAUDE.md`, `DESIGN.md` (versie 1.17, leidend) en `DEFINE.md` (0.8). De Purview-scripts (PR 49 t/m 51) kregen een eigen sessie zonder overdracht; ze staan hieronder kort vermeld.

## Rode draad

Peter keurde de lijst van 9 Foundry-scripts goed (zonder kosten- en agent-scripts, zie "Besluiten") en gaf daarna toestemming om alle 9 af te maken zonder tussentijds akkoord. Per script werkte Claude Code op een eigen feature-branch: documentatie opzoeken (Microsoft Learn), `script.ps1` en `meta.json` schrijven, `npm run validate`, `npm run syntax` en `npm test`, onafhankelijke review door een subagent met toegang tot de documentatie, bevindingen verwerken, pull request, check "Validatie" afwachten en squash-mergen. Elke merge zet de site direct live.

| PR | Script | Niveau | Soort |
| --- | --- | --- | --- |
| 52 | `foundry-resources-inventaris` | basis | leest; over alle abonnementen, met `Set-AzContext` |
| 53 | `foundry-rbac-rollen-controleren` | basis | leest; `Get-AzRoleAssignment -Scope`, kolom `Herkomst` (direct of niet direct) |
| 54 | `foundry-tags-controleren` | basis | leest; verplichte tags per resource |
| 55 | `foundry-deployments-en-quota` | gevorderd | leest; deployments en quotaregels boven een drempel |
| 56 | `foundry-netwerk-en-sleutels` | gevorderd | leest; publieke toegang, firewall, lokale sleutels, risico hoog/middel/laag |
| 57 | `foundry-resource-aanmaken` | gevorderd | schrijft; `SupportsShouldProcess`, splatting |
| 58 | `foundry-deployment-aanmaken` | expert | schrijft; quotacontrole vooraf, `-WhatIf` |
| 59 | `foundry-rbac-toewijzen-managed-identity` | expert | schrijft; rol op één resource, idempotent |
| 60 | `foundry-opruimen-whatif` | expert | verwijdert; verloopdatum-tag, `ConfirmImpact High`, geen purge |

Alle 9 staan op `nog_te_controleren`: niets is tegen een echte omgeving gedraaid, en de open punten staan per script in `note` en `check.source`. De index heeft nu 32 scripts; 203 tests slagen. `CLAUDE.md` is bijgewerkt (regel "Inhoud Foundry" afgevinkt).

Purview (eerdere sessie, PR 49 t/m 51): `purview-gevoeligheidslabels-overzicht`, `purview-dlp-beleid-en-regels`, `purview-retentiebeleid-controleren`, alle `nog_te_controleren`.

## Hoe het in elkaar zit (voor wie er verder aan werkt)

- **Cmdlets en eigenschappen:** alles gebruikt `Az.Accounts`, `Az.Resources` en `Az.CognitiveServices`. De uitvoereigenschappen staan vaak niet op de cmdletpagina. Niet bevestigd zijn onder meer de waarden van `AccountType` voor Foundry (`AIServices`) en Azure OpenAI (`OpenAI`), het type van `Tags`, de vorm van `Sku` en de naamvorm van usage-regels in PowerShell.
- **Foundry-rollen zijn hernoemd** (Foundry User heette Azure AI User). De rol-ID's zijn gelijk gebleven; de documentatie raadt aan in code het ID te gebruiken. Het script voor de toewijzing doet dat (`53ca6127-db72-4b80-b1b0-d745d6d5456d`).
- **Quota:** per abonnement, regio, model en deployment-type. `CurrentValue` is toegewezen quota, niet verbruik. Capaciteit 1 is bij veel chatmodellen 1.000 tokens per minuut, maar de verhouding verschilt per model. Voor quota noemt de documentatie de rol Cognitive Services Usages Reader op abonnementsniveau.
- **Verwijderen:** een verwijderde Foundry-resource is volgens de documentatie 48 uur te herstellen en de naam blijft in die tijd bezet; kosten van provisioned deployments lopen door tot de purge. Het opruimscript purget niet en slaat resources met deployments over.
- **`-WhatIf`:** `New-AzRoleAssignment` heeft in de documentatie geen `-WhatIf`, dus de droge run van dat script komt van `ShouldProcess` in het script zelf. `Connect-AzAccount` krijgt in de schrijvende scripts `-WhatIf:$false` mee, zodat een droge run toch inlogt.
- **Validatiewaarschuwing:** `foundry-resources-inventaris` geeft de waarschuwing dat `Set-AzContext` een wijzigende cmdlet is. Dat is bewust: `risk` blijft `read`, want alleen je sessie verandert. De waarschuwing blokkeert niets.

## Valkuilen die de reviews vonden (nuttig voor de volgende scripts)

- **Niet-afbrekende fouten laten variabelen staan.** In `foundry-opruimen-whatif` gaf `$resource.Tags[...]` op een resource zonder tags een niet-afbrekende fout; `$geldig` hield de waarde van de vorige ronde en de resource kwam ten onrechte in de verwijderlijst. Opgelost met `$geldig = $false` bovenaan de lus, een expliciete controle op tags en `-ErrorAction Stop` bij de opzoekingen. In `pwsh` met nagebootste cmdlets getest, en er is vraag q3 over bijgekomen.
- **`@($null).Count` is 1.** Gebruik `($x | Measure-Object).Count`, of zorg dat een lus in `@( )` staat (zie `foundry-tags-controleren`).
- **Overerving van rollen:** een roltoewijzing op een resource geldt ook voor wat eronder valt (zoals een project). Een eerdere uitleg beweerde het tegendeel en is gecorrigeerd in `foundry-rbac-toewijzen-managed-identity`.
- **`"$regio:"` in een string** wordt gelezen als een variabele met een scope; gebruik `"${regio}:"`.
- **Antwoordlengtes en posities:** reviews wijzen steeds op het goede antwoord dat het langste is of vaak op positie 1 staat. Controleer beide met een klein node-script vóór de review.

## Besluiten van Peter

- De lijst van 9 Foundry-scripts is goedgekeurd, zonder kosten (te wisselvallig gedocumenteerd in PowerShell) en zonder agents aanmaken (geen Az-cmdlets; dat gaat via REST of de SDK). Een tiende script voor private endpoints en VNet-integratie valt buiten de 9.
- Peter gaf toestemming om alle 9 af te maken zonder tussentijds akkoord voor elk script.

## Keuzes van Claude Code die Peter kan terugdraaien

- **Script 1:** bewust met `Set-AzContext` per abonnement (en `risk: read`), in plaats van Azure Resource Graph, dat een extra module en een zwaarder script geeft.
- **Script 6:** gebruikt `New-AzCognitiveServicesAccount -Type AIServices`. De officiële quickstart gebruikt Bicep, en de cmdletpagina noemt geen parameter voor projectbeheer; of de resource Foundry-projecten ondersteunt is niet bevestigd (zie `note`). Standaard `-DisableLocalAuth $true`.
- **Script 9:** kandidaten komen uit tags (`VerlooptOp`, `Omgeving`), niet uit meetgegevens over gebruik; het script purget niet.

## Wat er nog open staat

1. **Issues #35** (meer onderwerpen en subcategorieën) en **#36** (zoeken): wachten op besluiten van Peter.
2. **Controle van de scripts:** alle scripts van Migraties (zes), SharePoint (negen), Purview (drie) en Foundry (negen) staan op `nog_te_controleren`. De open punten per script staan in `note` en `check.source`. Het echt draaien tegen een tenant of abonnement is een stoppunt (Azure en kosten) dat Peter moet goedkeuren.
3. **Cmdlet-controle in CI** (DESIGN.md regel 194), het examen- en voortgangsontwerp zonder niveau, en kijken in Safari, Firefox en op een echte telefoon staan nog open uit de vorige overdrachten.
4. **Entra ID** heeft alleen de 2 bestaande scripts (volgens DEFINE bewust minder belangrijk).
5. **Geen test** bewaakt de reset van de ingeklapte waarschuwingen bij scriptwissel (uit de vorige overdrachten).

## Waar de kennis staat

`CLAUDE.md`, `DESIGN.md` (1.17), `DEFINE.md` (0.8), issues #35 en #36, en deze en de eerdere overdrachten in `docs/sessies/`. De negen scripts staan in `data/scripts/foundry/`.
