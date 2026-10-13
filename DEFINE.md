# DEFINE – PowerShell Leestrainer

Status: versie 0.9 (13 oktober 2026). Wijziging t.o.v. 0.8, op verzoek van Peter (issue #35): Exchange is wel een eigen onderwerp, en er komen PowerShell-basis, Security, Azure en Microsoft 365 bij, met subcategorieen (Migraties onder SharePoint, Entra ID en Purview onder Security, Foundry onder Azure). De nieuwe onderwerpen starten zonder scripts ("nog in opbouw"). Eerdere wijziging (0.8), t.o.v. 0.7, op verzoek van Peter: de werkbank filtert niet meer op niveau, alleen op onderwerp en soort vraag (het niveau blijft wel een eigenschap van elk script). Eerdere wijzigingen (0.7, akkoord van Peter op 11 oktober 2026), t.o.v. 0.6: omvang release 2.0 bevestigd, geen ShareGate-toegang vastgelegd, Foundry-scripts omvatten zowel beheer als aanmaken. Geen open vragen meer.

## Besluiten

| Onderwerp | Besluit |
| --- | --- |
| Naam en adres | `ps-trainer`, live op `ps-trainer.pdscloud.nl`; repo `peterdeswart96-ship-it/ps-trainer` |
| Doelgroep | In eerste instantie alleen ik zelf; collega's mogelijk later |
| AI | Via Microsoft Foundry (gpt-5-mini), niet via de Claude API |
| Stack | Eerst de huidige HTML-pagina uitbreiden en de inhoud naar JSON-bestanden verplaatsen; geen herbouw in React |
| Scope | Alle 12 functies uit de lijst hieronder, gefaseerd opgeleverd |
| Inhoud | Gericht op de functie AI, Apps & Agents Consultant bij InSpark (start als engineer). Prioriteit: **Migraties, SharePoint en Foundry**. Minder belangrijk: Purview, Entra ID. Exchange Online is een eigen onderwerp (sinds 0.9). |
| Migratiescenario's | (1) Fileshare naar SharePoint Online, met SPMT of ShareGate; (2) SharePoint on-premises naar SharePoint Online. Tenant-to-tenant valt buiten scope. |
| Verwijzen agent ↔ website | De PS Coach (Foundry) linkt vanuit de chat naar de website voor onderdelen als examenmodus en flashcards. De website linkt niet terug naar de agent. |
| Fasering | Volgorde 2.0, 2.1, 2.2, 2.3 blijft zoals voorgesteld. Het alvast aanmaken van `rg-ps-trainer` en het Foundry-project tijdens 2.1 is een optionele stap voor Design. |
| Publiceren PS Coach | Alleen Foundry-playground en website. Teams en Microsoft 365 Copilot zijn "later, als collega's gaan meedoen". |
| Omvang release 2.0 | Bevestigd: Migraties, SharePoint en Foundry volledig (3 scripts per niveau); Purview 1 script per niveau; Entra ID alleen de 2 bestaande scripts. Zie "Omvang release 2.0". |
| ShareGate | Geen toegang tot ShareGate Migrate. ShareGate-scripts baseren zich op de documentatie van de leverancier en krijgen het label "nog te controleren". |
| Foundry-scripts | Beide kanten: beheer lezen (resources, RBAC, kosten, governance) én scripts die resources, deployments en agents aanmaken. |
| Budget | Maximaal €10 per maand voor Foundry en Azure samen |

## Doel
Een complete leertool waarmee ik PowerShell-scripts leer lezen, gericht op de onderwerpen van mijn nieuwe functie. De tool bestaat uit een website (`ps-trainer.pdscloud.nl`) en een agent in Microsoft Foundry die samenwerken.

Tweede doel: tijdens het bouwen Foundry, Azure Functions, Entra ID-authenticatie en managed identities in de praktijk leren.

## Aansluiting op de vacature en mijn cv

**Vacature:** AI, Apps & Agents Consultant bij InSpark. Ik start in eerste instantie als engineer, niet direct als consultant. De vacature noemt onder meer: Microsoft 365 en AI-strategie, een solide AI-fundament (governance, lifecycle, identity, security), slimme apps en agents bouwen (Copilot Studio, Foundry), inrichten van Teams, SharePoint en compliance, en workshops en demo's geven.

**Wat mijn cv al sterk heeft** (hier is de trainer vooral een opfriscursus): Entra ID (Conditional Access, PIM), Purview (DLP, eDiscovery, retention), SharePoint Online-beheer, Exchange Online, Intune, PowerShell voor beheertaken en Copilot Studio.

**Waar de trainer het meeste kan toevoegen** (de kennishiaten, dus de nadruk):
- **Migraties naar SharePoint Online** met SPMT en ShareGate. Mijn cv noemt een cut-over migratie van devices, apps en gebruikers en servermigraties, maar geen SharePoint-migratietools.
- **Foundry en de Azure-laag eromheen** (resources, RBAC, deployments, netwerk, sleutels, kosten). Het cv heeft Azure-beheer en AZ-305, maar nog geen Foundry in de praktijk.
- **PowerShell lezen en beoordelen:** de kern van de trainer. Het cv noemt PowerShell-automatisering, maar ik wil scripts van collega's of AI snel en veilig kunnen beoordelen.

**Niet in de trainer, maar wel in de vacature:** Copilot Studio, Power Platform en adviesvaardigheden (workshops, roadmap). Dit is geen PowerShell en blijft buiten scope van dit project.

## Gebruikers
- Nu: ik zelf
- Later mogelijk: collega's (dan ook Teams/Copilot en een hoger budget heroverwegen)

## Functies (alle 12 in scope)

| # | Functie | Waar | Nodig |
| --- | --- | --- | --- |
| 1 | Meer scripts: Migraties, SharePoint, Foundry, Purview, Entra ID | Website | JSON-bestanden |
| 2 | Moeilijkheidsniveaus: basis, gevorderd, expert | Website | Veld in JSON |
| 3 | Filteren op onderwerp en soort vraag | Website | – |
| 4 | Flashcards van het woordenboek | Website | – |
| 5 | Examenmodus met tijd en eindscore | Website | – |
| 6 | Herhaal je fouten | Website | Voortgang opslaan |
| 7 | "Wat doet deze regel?": zelf uitleg schrijven per regel | Website | Combineert met 10 |
| 8 | Eigen script plakken en laten uitleggen in de vijf leesstappen | Foundry | Azure Function |
| 9 | Nieuwe oefenscripts genereren, met én zonder bewuste fout | Foundry | Azure Function |
| 10 | AI-feedback op je eigen uitleg bij open vragen en bij functie 7 | Foundry | Azure Function |
| 11 | Voortgang per onderwerp en niveau | Website | Voortgang opslaan |
| 12 | Voortgang op meerdere apparaten | Website + Azure | Aanmelden + opslag |

## Inhoud: onderwerpen en modules

| Prioriteit | Onderwerp | PowerShell-module | Voorbeelden van oefenscripts (nog te controleren) |
| --- | --- | --- | --- |
| Hoog | Migraties | Eigen pre-scan, SPMT-module, ShareGate-module | Pre-scan fileshare (padlengte, verboden tekens, bestandsgrootte), SPMT-migratie van fileshare, ShareGate-migratie van fileshare, migratie van SharePoint on-premises naar SharePoint Online, delta-migratie, validatie en rapportage na migratie |
| Hoog | SharePoint | Microsoft.Online.SharePoint.PowerShell, PnP.PowerShell | Site-inventaris, deelinstellingen en oversharing (klaar voor Copilot?), sitebeheerders, opslag per site |
| Hoog | Foundry | Az (Az.Accounts, Az.Resources, Az.CognitiveServices) | Resources inventariseren, RBAC-rollen controleren, deployments en quota opvragen, kosten en tags controleren, opruimen met `-WhatIf` |
| Middel | Purview | ExchangeOnlineManagement (`Connect-IPPSSession`) | Overzicht gevoeligheidslabels, DLP-beleid en -regels, retentiebeleid |
| Laag | Entra ID | Microsoft.Graph | Inactieve gebruikers, apparaten uitschakelen (bestaande scripts) |

Let op bij Foundry: veel Foundry-werk gaat via de portal, Azure CLI of de Python-SDK. PowerShell gebruik je vooral voor de Azure-resources eromheen (resourcegroepen, rollen, sleutels, netwerk, beleid, kosten). Dat is precies het "AI-fundament" uit de vacature (governance, identity, security). De oefenscripts richten zich daarop.

Let op bij Migraties: SPMT en ShareGate hebben eigen modules. Hun cmdlets en parameters staan niet in de gewone Microsoft-documentatie (SPMT) of alleen in de documentatie van de leverancier (ShareGate). Controle vraagt dus de leveranciersdocumentatie of een geïnstalleerde module.

### Indeling van de 4 bestaande scripts (voorstel, nog bijsturen)

| Script | Onderwerp | Niveau |
| --- | --- | --- |
| Migratie met ShareGate | Migraties | Gevorderd of expert |
| SharePoint-sites inventariseren | SharePoint | Basis |
| Inactieve gebruikers | Entra ID | Basis |
| Oude apparaten uitschakelen | Entra ID | Gevorderd |

### Omvang release 2.0 (bevestigd)

| Onderwerp | Scripts in 2.0 | Waarvan al aanwezig | Nieuw te schrijven |
| --- | --- | --- | --- |
| Migraties | 9 (3 per niveau) | 1 | 8 |
| SharePoint | 9 (3 per niveau) | 1 | 8 |
| Foundry | 9 (3 per niveau) | 0 | 9 |
| Purview | 3 (1 per niveau) | 0 | 3 |
| Entra ID | 2 (bestaand) | 2 | 0 |
| **Totaal** | **32** | **4** | **28** |

- Ongeveer 6 vragen per script: circa 170 nieuwe vragen, en alles moet door mij gecontroleerd worden.
- Volgorde van schrijven: eerst Migraties en SharePoint, dan Foundry, dan Purview. 2.0 kan desnoods in stappen live (bijvoorbeeld eerst Migraties en SharePoint).
- Purview en Entra ID worden in latere releases aangevuld tot 3 scripts per niveau.
- Extra controletijd: Migraties (leveranciersmodules) en Purview (nog geen scripts, grootste kans op verzonnen cmdlets).
- De filters tonen bij onderwerpen die nog niet af zijn "nog in opbouw" in plaats van een lege lijst.

## Hoe website en Foundry samenwerken

**Website (`ps-trainer.pdscloud.nl`):** alle oefeningen, woordenboek, flashcards, examenmodus en voortgang. De AI-knoppen (functies 8, 9 en 10) roepen een Azure Function aan, die de Foundry-agent aanspreekt.

**Foundry-agent "PS Coach":** dezelfde AI-functies, maar dan als chat in de Foundry-playground. Voor onderdelen die beter op de website werken, zoals de examenmodus of de flashcards, verwijst de agent met een link naar de juiste pagina van de website. Die pagina's krijgen daarom vaste, stabiele URL's (bijvoorbeeld `/exam` en `/flashcards`).

Eén agent, met dezelfde instructies, voor beide ingangen. Dat houdt het beheer eenvoudig.

## Fasering

| Release | Functies | Waarom deze volgorde |
| --- | --- | --- |
| 2.0 | 1, 2, 3 + inhoud naar JSON | Fundament: zonder inhoud en structuur heeft de rest geen waarde. Volledig statisch, geen kosten. |
| 2.1 | 4, 5, 6, 11 | Oefenvormen en voortgang in de browser. Nog steeds statisch. Optioneel: `rg-ps-trainer` en het Foundry-project alvast aanmaken. |
| 2.2 | 8, 9, 10, 7 | Foundry-agent + Azure Function met aanmelden via Entra ID en managed identity. |
| 2.3 | 12 | Voortgang in Azure Table Storage, gekoppeld aan je aanmelding uit 2.2. |

Daarna: aanvullen van Purview en Entra ID tot het eindbeeld van 3 scripts per niveau, en eventueel publiceren naar Teams of Microsoft 365 Copilot.

## Buiten scope
- Scripts uitvoeren in de app
- Echte klantscripts of tenantgegevens opslaan
- Publiceren naar Teams of Microsoft 365 Copilot (later, bij collega's)
- Tenant-to-tenant-migraties
- Scripts voor Exchange, Security, Azure, Microsoft 365 en PowerShell-basis in release 2.0 (de onderwerpen staan er wel, nog zonder scripts)
- Copilot Studio, Power Platform en adviesvaardigheden (geen PowerShell)

## Succescriteria
- Eindbeeld: per onderwerp minimaal 3 scripts op elk niveau. Voor release 2.0 geldt dit voor Migraties, SharePoint en Foundry; Purview en Entra ID volgen in latere releases.
- Alle cmdlets en parameters bestaan echt in de genoemde modules (door mij gecontroleerd in de documentatie of in een geïnstalleerde module). Uitzondering: ShareGate-scripts, waarvoor ik geen toegang heb; die staan zichtbaar als "nog te controleren" tot ik de documentatie heb nagelopen.
- Nieuw oefenscript toevoegen kan zonder codewijziging
- Geen sleutels in de website of in GitHub; de Azure Function gebruikt een managed identity
- De AI-functies werken alleen na aanmelden met mijn account
- De totale Azure- en Foundry-kosten blijven onder €10 per maand
- Werkt op laptop en telefoon, in licht en donker thema

## Aandachtspunten voor Design
- **Aanmelden:** App Service Authentication met Entra ID op de Function App. Nodig voor 8, 9, 10 en 12.
- **Opslag voortgang:** Azure Table Storage is goedkoop en eenvoudig; alternatief Cosmos DB (gratis laag). Keuze in Design.
- **Kwaliteit van gegenereerde scripts (9):** gpt-5-mini kan cmdlets of parameters verzinnen. Opties: de agent laat elke cmdlet controleren via de Learn MCP-server, of gegenereerde scripts krijgen het label "AI, niet gecontroleerd". Voor SPMT en ShareGate werkt de Learn MCP-server niet; daar is het label extra belangrijk.
- **Budget en harde rem:** een budget in Azure Cost Management waarschuwt alleen (bijvoorbeeld bij 50%, 80% en 100% van €10) en stopt niets. Voor een harde rem: een limiet op het aantal AI-aanroepen per dag in de Function, een maximale scriptlengte en een maximaal aantal tokens per aanroep.
- **Kosten per onderdeel:** GitHub Pages gratis; Function App op consumption-plan; Table Storage centen per maand; Foundry per token. Actuele prijzen controleren in de Azure-prijscalculator.
- **Azure-indeling:** Function App en Storage in `rg-ps-trainer`; de Foundry-resource in `rg-foundry-lab` hergebruiken, met een eigen project voor de PS Coach.
- **Vaste URL's** voor de pagina's waar de PS Coach naar verwijst (`/exam`, `/flashcards`, enzovoort).
- **Lege onderwerpen:** de filters moeten netjes omgaan met onderwerpen zonder scripts ("nog in opbouw").
- **Inhoudsbeheer bij 32+ scripts:** een JSON-bestand per script en een indexbestand, zodat nieuwe scripts toevoegen geen codewijziging vraagt.
- **Afwijking van de standaardstack:** dit project gebruikt bewust geen React/Vite/Tailwind en Foundry in plaats van de Claude API. Dat staat in Design en `CLAUDE.md` vermeld, zodat Claude Code niet terugvalt op de standaard.

- **Veld "gecontroleerd" per script:** elk script in de JSON krijgt een status (gecontroleerd of nog te controleren), zodat ShareGate-scripts zichtbaar gemarkeerd zijn.
- **Foundry-scripts die iets aanmaken:** niet alle Foundry-onderdelen (zoals agents) hebben een Az-cmdlet; dan loopt het via REST-aanroepen met `Invoke-RestMethod`. De juiste aanpak per script uitzoeken in Design en controleren in de documentatie. Aanmaak-scripts altijd met `-WhatIf` of een duidelijke waarschuwing in de leesstappen.
- **Veiligheid in de oefenscripts:** geen echte tenant-ID's, sleutels of sitenamen in de voorbeelden.

## Open vragen
Geen. Na jouw akkoord op dit document start ik met Design (`DESIGN.md`).
