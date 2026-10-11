# Overdracht – inhoud Migraties en SharePoint, controles en nieuwe werkbank (11 oktober 2026, derde sessie die dag)

Onderwerp: Migraties afgemaakt (9 scripts), SharePoint voor een groot deel (6 van 9), de uitkomst van een controle van beweringen tegen de documentatie, een nieuwe werkwijze (Claude Code merget zelf), een nieuwe indeling van de werkbank en twee GitHub-issues voor een grote change.
Dit document vervolgt `2026-10-11-overdracht-livegang.md`. Lees ook `CLAUDE.md` (werkwijze en voortgang), `DESIGN.md` (versie 1.15, leidend) en `DEFINE.md` (versie 0.8).

## Rode draad

Begonnen met de site live en vier Migraties-scripts nog niet geschreven; geëindigd met 17 scripts in de index, een werkbank in een nieuwe indeling en een werkwijze waarin Claude Code zelf commit, pusht, een pull request maakt en mergt. Alles ging via pull requests naar `main` (PR 16 t/m 38). Elke merge zet de site direct live (`deploy.yml`).

Twee dingen die de sessie bepaalden:
- **Elk script kreeg een onafhankelijke review** door een subagent met schone context, en die vond elke keer iets. De terugkerende vondst: het juiste antwoord van een meerkeuzevraag was het langste of kortste (te raden). Daarom meet ik de lengtes nu zelf met een klein node-script voordat ik een script aanlever.
- **Groene tests bewezen niet dat de pagina werkt.** Het filter "soort vraag" gaf in een echte browser een `TypeError` (`kaart.attributen` bestaat alleen in het nepdocument van de tests) en stond zo al op de livesite. Gevonden door een review, hersteld in PR 32, en een test bewaakt nu dat `assets/js` nooit onderdelen van het nepdocument gebruikt.

## Pull requests

| PR | Wat |
| --- | --- |
| 16 t/m 22 | Migraties: pre-scan padlengte, ongeldige namen, bestandsgrootte; validatie na migratie; SPMT fileshare, on-premises naar Online, delta-migratie |
| 23, 25 | Voortgangsregel in CLAUDE.md voor Migraties |
| 24 | Migraties-rapportage-na-migratie toegevoegd en twee scripts naar expert: 9 scripts, 3 per niveau (DEFINE.md) |
| 26, 30, 31, 34, 37 | SharePoint: opslag per site, sitebeheerders, deelinstellingen, externe gebruikers, sitebeheerder toevoegen |
| 27 | Controle van beweringen tegen de documentatie verwerkt (zie hieronder); werkbank toont geen waarschuwing bij `gecontroleerd` |
| 28 | Werkwijze: Claude Code commit, pusht, maakt PR's en mergt zelf na groene check |
| 29 | Reparatie van `sharepoint-site-inventaris` (`SharingCapability` bij `-Limit`) |
| 32, 33, 38 | Werkbank: nieuwe indeling; vragenbox links; pastelkleur per onderwerp, geen niveaufilter, scriptkeuze op één regel |

## Besluiten van Peter (deze sessie)

- **Werkwijze (PR 28):** Claude Code mag zelf committen, pushen, PR's maken en mergen (`gh pr merge`, squash) zodra "Validatie" groen is en de review is verwerkt. Nooit rechtstreeks pushen naar `main`, nooit forceren of `--admin`, nooit auto-merge. Stoppunten blijven: Azure, kosten, DNS, nieuw domein of nieuwe omgeving, en een volgende stap die scope, scriptlijst of ontwerp bepaalt. Peter draait Claude Code met `--dangerously-skip-permissions`; de automatische modus had eerder een merge geweigerd ("Merge Without Review") en een toegevoegde permissieregel hielp daar niet tegen.
- **Omvang:** DEFINE.md (bevestigd) vraagt per hoofdonderwerp 9 scripts, 3 per niveau. Ik had dat bij Migraties eerst gemist (8 scripts, verkeerde niveaus); met Peters akkoord opgelost met één nieuw expert-script en twee scripts naar expert (PR 24).
- **SharePoint-scriptlijst (9, akkoord):** zie "Wat er nog open staat".
- **Werkbankindeling** volgens Peters schetsen: bovenbalk met filters en scripts; het hele script over de volle breedte zonder schuifbalk; daaronder links de vragenbox (vraagnummer, vraag, knoppen Vorige en Volgende met pijl) en rechts de antwoorden en uitleg; een vraag tegelijk; op een telefoon alles onder elkaar met de vragenbox eerst. Elk onderwerp een eigen pastelkleur op de filterknop (4% tint, rand in de onderwerpkleur, gekozen knop 2px en 26%). **Het niveaufilter is helemaal weg** (knoppen, `&level=`, code, tests; een oude `&level=` wordt genegeerd). Scriptkeuze op één regel met schuifbalk. Het veld `level` van een script blijft bestaan (kop, startpagina, standaardscript). DESIGN.md 1.12 tot 1.15 en DEFINE.md 0.8.
- **Voor een gecontroleerd script verdwijnt elke waarschuwing**, ook de `note`; open punten staan dan in `check.source`.
- **Garantietaal weg:** "veilig om op een productietenant te draaien" is overal vervangen door "het script wijzigt niets in de tenant".
- **GitHub-issues (open):** #35 "Meer onderwerpen en subcategorieën voor een grote MSP" (algemeen, Exchange, security, Azure, M365; subcategorieën, bijvoorbeeld Migraties onder SharePoint) en #36 "Zoekfunctie" (label `later`, niet voor nu). In #35 staan open vragen die een besluit van Peter nodig hebben: kan een script in meer dan één categorie staan, waar horen Entra ID, Purview en Foundry onder, wat is "algemeen". #35 wijzigt een besluit uit DEFINE.md (Exchange was geen eigen onderwerp).

## Controle van beweringen tegen de documentatie

Peter liet Cowork 14 punten nalopen (prompt in de chat; resultaat stond in `Downloads\ps-trainer-controles.txt`, niet in de repo). Ik controleerde de belangrijkste citaten zelf bij de bron voordat iets op `gecontroleerd` kwam. Kern:
- **Bevestigd:** pad maximaal 400 tekens gedecodeerd; 250 GB per bestand (en 250 MB voor een lijstbijlage); niet-toegestane namen (`.lock`, CON/PRN/AUX/NUL, COM0 t/m 9, LPT0 t/m 9, `_vti_` overal in de naam, `desktop.ini`, `~$`, `forms` in de root van een bibliotheek, spaties aan begin of eind); een punt aan het eind is een naam die OneDrive automatisch hernoemt, geen hard verbod; `-ClientId` bij `Connect-PnPOnline -Interactive` is in de praktijk nodig sinds 9 september 2024; PnP.PowerShell vereist PowerShell 7.4 of hoger; de SPMT-module werkt alleen in Windows PowerShell 5.x; `-EnableMultiRound` doet tot 5 controlerondes; volgens de SPMT-documentatie slaat een tweede run bestaande objecten over en migreert alleen nieuwere bestanden (hernoemen of verplaatsen voor de laatste run leidt tot overschrijven).
- **Afwijkend:** `#` en `%` zijn niet overal verboden maar sommige organisaties ondersteunen ze nog niet (waarschuwing, geen fout); ondersteunde bronversies van SPMT zijn SharePoint Server 2010, 2013, 2016 en 2019.
- **Niet te achterhalen (blijft `nog_te_controleren`):** of de domeinnaam meetelt in de 400 tekens; een lengtelimiet voor één naam in SharePoint Online (255 geldt voor Verkenner en Finder); de PnP-veldnamen `File_x0020_Size` en `FileRef`; of `Start-SPMTMigration` zonder `-NoShow` wacht; wat een array bij `-SkipListsWithName` doet; de JSON-sleutel `EnableIncremental`; het gedrag van `Get-ChildItem` boven 260 tekens in Windows PowerShell 5.1.
- **Eén punt waar Cowork het mis had:** het meldde dat `-MigrateWithoutRootFolder` niet in de documentatie staat. Hij staat wel bij `Register-SPMTMigration`.
- Eigen vondsten: `Get-SPOSite -Limit` vult `SharingCapability` niet (daarom haalt `sharepoint-site-inventaris` elke site opnieuw op met `-Identity`); `Set-SPOSite` en `Set-SPOUser` hebben geen werkende `-WhatIf` (daarom een eigen droge-runschakelaar); `Get-SPOExternalUser -PageSize` is hooguit 50; `Get-SPOUser` heeft standaard 500 gebruikers en `IsSiteAdmin` staat niet in de officiële documentatie.

## Stand van de inhoud

- **Migraties: 9 scripts (3 basis, 3 gevorderd, 3 expert).** Gecontroleerd: de drie pre-scans (padlengte, ongeldige namen, bestandsgrootte). `nog_te_controleren`: ShareGate, SPMT (3 scripts; volgens DESIGN.md regel 193 blijft SPMT altijd zo), en de twee PnP-scripts (validatie, rapportage).
- **SharePoint: 6 van 9 (3 basis, 3 gevorderd), allemaal `nog_te_controleren`:** `sharepoint-site-inventaris` (bestaand), `-opslag-per-site`, `-sitebeheerders`, `-beheerder-toevoegen` (wijzigt, droge run standaard), `-deelinstellingen`, `-externe-gebruikers`.
- **Entra ID:** 2 bestaande scripts (1 gecontroleerd). **Foundry en Purview:** nog niets.
- 17 scripts in de index; 4 gecontroleerd, 13 `nog_te_controleren`. 201 tests.

## Wat er nog open staat (in volgorde)

1. **SharePoint, drie expert-scripts** (afgesproken lijst):
   - `sharepoint-unieke-rechten` (alleen lezen, PnP.PowerShell: `Get-PnPList`, eigenschap `HasUniqueRoleAssignments`). Let op: PnP vraagt PowerShell 7.4+, de SPO-module Windows PowerShell 5.1 (in PowerShell 7 met `Import-Module ... -UseWindowsPowerShell`). Eerst opzoeken in de documentatie.
   - `sharepoint-copilot-gereedheid` (alleen lezen). **Nog niet onderbouwd:** welke instellingen daarvoor bestaan is niet opgezocht. Lukt onderbouwen niet, dan een ander script voorleggen aan Peter in plaats van iets te verzinnen.
   - `sharepoint-inactieve-sites-vergrendelen` (wijzigt, `Set-SPOSite -LockState` met waarden NoAccess, ReadOnly, Unlock; niet op de root-site; `-WhatIf` werkt niet, dus eerst een rapport en een eigen droge-runschakelaar).
2. **Foundry (9 scripts) en Purview (3 scripts)**, volgens DEFINE.md, elk met onderzoek in de documentatie vooraf.
3. **Issue #35** (onderwerpen en subcategorieën) vraagt eerst besluiten van Peter; **issue #36** (zoeken) pas daarna.
4. **Examen- en voortgangsontwerp (release 2.1)** in DESIGN.md noemt nog niveau (`/examen/?topic=&level=`, matrix onderwerp × niveau). Die pagina's bestaan niet; Peter moet beslissen of ze ook zonder niveau moeten.
5. **Cmdlet-controle in CI** (DESIGN.md regel 193) is nog niet gebouwd; geen enkel script is tegen een echte module of tenant gedraaid.
6. Niet bekeken door een mens: Safari, Firefox, een echte telefoon, forced-colors. Het label van de themaknop bij donker thema ("Donker thema") is niet onderzocht.
7. De hulpscripts voor Chrome via het DevTools-protocol (schermafbeeldingen, klikken, console-fouten, breedtemeting) stonden in de scratchpad en zijn niet bewaard; zie het geheugenbestand `reference_chrome-headless-cdp` voor de aanpak.

## Werkwijze die goed werkte

- Per script: documentatie opzoeken (Microsoft Learn via de ophaaltool; lange pagina's met `offset`), script schrijven, **testen met nagebootste cmdlets in zowel Windows PowerShell 5.1 als PowerShell 7** (een nagebootste cmdlet moet `[CmdletBinding()]` hebben, anders respecteert hij `-ErrorAction Stop` niet), meta schrijven met een node-script dat de antwoordlengtes meet, review door een subagent, bevindingen verwerken, daarna commit, push, PR, `gh pr checks --watch` en `gh pr merge --squash`.
- Een UI-wijziging pas klaar noemen na bekijken in echte Chrome (licht en donker, 1400 en 390 px), inclusief klikken en console-fouten. Chrome zonder venster kan niet smaller dan ongeveer 500 px: gebruik `Emulation.setDeviceMetricsOverride`.
- Bij een afwijking van DEFINE.md of DESIGN.md: document bijwerken met versie en statusregel en dat expliciet melden.
- Tooling-valkuilen: de Bash-tool breekt op heredocs met backslashes en aanhalingstekens; schrijf bestanden met de Write-tool en voer ze met `node` uit. Een lange `Start-Sleep` is geblokkeerd; gebruik `gh pr checks --watch` of de Monitor-tool.

## Waar de kennis staat

- `CLAUDE.md`: werkwijze (nu inclusief zelfstandig mergen), voortgang, inhouds- en beveiligingsregels.
- `DESIGN.md` (1.15): alle technische keuzes, inclusief de nieuwe werkbankindeling en de onderwerpkleuren; `DEFINE.md` (0.8): scope en omvang (9 scripts per hoofdonderwerp).
- Issues #35 en #36 op GitHub.
- Dit document en de twee eerdere overdrachten van 11 oktober in `docs/sessies/`.
