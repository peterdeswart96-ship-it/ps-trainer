# Overdracht – SharePoint compleet (12 oktober 2026, vijfde sessie)

Onderwerp: de laatste drie expert-scripts van het onderwerp SharePoint (PR 45, 46 en 47). Daarmee heeft SharePoint 9 scripts, 3 per niveau.
Dit document vervolgt `2026-10-12-overdracht-werkbank-uiterlijk.md`. Lees ook `CLAUDE.md`, `DESIGN.md` (versie 1.17, leidend) en `DEFINE.md` (0.8).

## Rode draad

Peter beantwoordde eerst de twee open punten uit de vorige overdracht: de knoppen Vorige en Volgende blijven 30 px hoog en de waarschuwingen blijven standaard ingeklapt. Daarna maakte Claude Code de drie resterende SharePoint-scripts, elk op een eigen feature-branch: documentatie opzoeken, script schrijven, testen met nagebootste cmdlets in Windows PowerShell 5.1 en PowerShell 7, `meta.json` schrijven, onafhankelijke review door een subagent, bevindingen verwerken, pull request, check "Validatie" afwachten en squash-mergen. Elke merge zet de site direct live.

| PR | Script | Wat |
| --- | --- | --- |
| 45 | `sharepoint-unieke-rechten` | Alleen lezen, PnP.PowerShell. Per site uit een CSV (`Url`) de lijsten en bibliotheken met `HasUniqueRoleAssignments` naar een CSV. Zeven vragen. |
| 46 | `sharepoint-inactieve-sites-vergrendelen` | Wijzigt. `Set-SPOSite -LockState` (`ReadOnly`, `NoAccess`, `Unlock`) voor de sites uit een CSV, standaard droge run, hoofdsite overgeslagen. Zeven vragen. |
| 47 | `sharepoint-copilot-gereedheid` | Alleen lezen. Rapport per site met `SharingCapability` en de status van Restricted Content Discovery (RCD, `RestrictContentOrgWideSearch`), plus de tenantinstelling voor delegatie. Zeven vragen. |

`CLAUDE.md` is bijgewerkt: de regel "Inhoud SharePoint" is afgevinkt. In de index staan nu 20 scripts; 203 tests slagen.

## Hoe het in elkaar zit (voor wie er verder aan werkt)

- **Unieke rechten:** het script loopt per site met `Connect-PnPOnline -Interactive -ClientId` (verplicht sinds 9 september 2024) en `Get-PnPList -Includes HasUniqueRoleAssignments`. Het kijkt alleen naar lijsten en bibliotheken, niet naar mappen of bestanden. Een site die een fout geeft, wordt met een waarschuwing overgeslagen en ontbreekt dan zonder melding in het rapport; dat is vraag q6.
- **Inactieve sites vergrendelen:** het script bepaalt **zelf niet** wie inactief is. Voor SharePoint Online is niet bevestigd dat `LastContentModifiedDate` een betrouwbaar signaal is (`Get-SPOSite` documenteert het niet en bronnen spreken elkaar tegen). De lijst komt van een mens, bijvoorbeeld uit het gebruiksrapport; vraag q3 gaat hierover. `Set-SPOSite` heeft volgens de documentatie geen werkende `-WhatIf` (letterlijk gecontroleerd), dus de droge run is een eigen schakelaar, zoals bij `sharepoint-beheerder-toevoegen`. De droge run toont de huidige en de nieuwe stand en is daarmee meteen het rapport.
- **Copilot-gereedheid:** dit is bewust **geen** oordeel over "gereed". RCD is volgens Microsoft een tijdelijke zichtbaarheidsmaatregel (rechten blijven gelijk, inhoud blijft in de zoekindex, niet voor OneDrive, een Copilot-licentie en SharePoint Advanced Management zijn nodig, bij meer dan 500.000 items kan een wijziging meer dan een week duren). Het script toont alleen de status. Bron: de pagina "Restrict discovery of SharePoint sites and content" op Microsoft Learn.
- **Valkuil gevonden bij het testen (vraag q6 van Copilot-gereedheid):** twee soorten objecten in één uitvoer (`Group-Object` en daarna `Get-SPOTenant | Select-Object ...`) laten de tenantwaarde verdwijnen; de eerste tabel bepaalt de kolommen. In PowerShell 7 zie je een rij met lege `Name` en `Count` 1, in 5.1 een lege regel. Het script gebruikt daarom `Write-Host` voor de tenantwaarde.

## Besluiten van Peter

- Knoppen Vorige en Volgende blijven 30 px; waarschuwingen blijven standaard ingeklapt.
- Akkoord om de SharePoint-scripts in de afgesproken volgorde af te maken, en om `sharepoint-copilot-gereedheid` te onderbouwen met de documentatie.

## Keuzes van Claude Code die Peter kan terugdraaien

- **Inactieve sites:** een CSV in plaats van zelf op datum filteren (zie boven). Wil Peter dat het script zelf filtert, dan kan dat, maar het signaal is dan minder betrouwbaar.
- **Niveau van `sharepoint-copilot-gereedheid`:** `expert`, zoals in de afgesproken lijst. De reviewer vond het script licht en dacht aan `gevorderd`; de inhoudelijke zwaarte zit in de vragen.
- **Titel van het vergrendelscript:** "Inactieve sites uit een lijst vergrendelen met droge run"; het `id` is ongewijzigd.

## Wat er nog open staat

1. **Foundry (9 scripts) en Purview (3 scripts)**, volgens DEFINE.md, elk met onderzoek in de documentatie vooraf. Onder Peters standaardwerkwijze: de scriptlijst per onderwerp moet eerst door Peter worden goedgekeurd (werkwijzepunt 3).
2. **Issues #35** (onderwerpen en subcategorieën) en **#36** (zoeken): wachten op besluiten van Peter; deze sessie niet geraakt.
3. Alles uit de vorige overdrachten blijft staan: examen- en voortgangsontwerp zonder niveau, cmdlet-controle in CI (DESIGN.md regel 194), kijken in Safari, Firefox en op een echte telefoon.
4. **Nog niet gedaan:** niets van de 9 SharePoint-scripts is tegen een echte tenant of module gedraaid; ze staan allemaal op `nog_te_controleren`. De open punten per script staan in de `note` en `check.source`.
5. Er is geen test die de reset van de ingeklapte waarschuwingen bij scriptwissel bewaakt (uit de vorige overdracht).

## Werkwijze-aantekeningen

- **Geef de reviewer-subagent toegang tot de documentatie.** De eerste twee reviews konden Microsoft Learn niet raadplegen en twijfelden daarom aan beweringen die al letterlijk bij de bron waren gecontroleerd; de derde review (met `WebFetch`) bevestigde de feiten en vond echte punten, zoals een ontbrekend `-NoTypeInformation` en een onverklaarde kolom.
- **Maak antwoordlengtes gelijk.** Reviews wijzen steeds op het juiste antwoord dat het langste is. Controleer de lengtes vóór de review (een klein node-script dat per vraag de lengtes toont is genoeg).
- `Export-Csv` in de scripts altijd met `-NoTypeInformation` (repo-conventie, ook voor 5.1).
- De testopstelling (nagebootste cmdlets met `[CmdletBinding()]`, daarna `pwsh` en `powershell` draaien) staat niet in de repo; hij staat in de scratchpad van de sessie en is niet bewaard.
- Een tweede Claude-sessie kan in dezelfde map werken; commit alleen expliciet de eigen bestanden (`git add <bestanden>`), nooit `git add -A`, en controleer vlak voor de commit de branch.

## Waar de kennis staat

`CLAUDE.md`, `DESIGN.md` (1.17), `DEFINE.md` (0.8), issues #35 en #36, en deze en de eerdere overdrachten in `docs/sessies/`. De drie scripts staan in `data/scripts/sharepoint/`.
