# Overdracht – Microsoft 365-scripts (13 oktober 2026)

Onderwerp: alle 9 scripts van het onderwerp Microsoft 365 (`m365`), PR 81 t/m 89. De site heeft nu 50 scripts.
Dit document vervolgt `2026-10-13-overdracht-onderwerpen-en-powershell-basis.md`. Lees ook `CLAUDE.md`, `DESIGN.md` (1.22, leidend) en `DEFINE.md` (0.9).

## Rode draad

Peter vroeg om de scriptlijst voor Microsoft 365 en keurde die goed ("akkoord"). Daarna werkte Claude Code alle 9 scripts zelfstandig af, elk op een eigen feature-branch: gedrag eerst testen, `script.ps1` en `meta.json` schrijven, `npm run validate`, `npm run syntax`, onafhankelijke review door een subagent, bevindingen verwerken, pull request, check "Validatie" afwachten, squash-merge. Elke merge zette de site direct live. Alle 9 staan op `nog_te_controleren`: niets is tegen een echte tenant gedraaid.

| PR | Script | Niveau | Soort | Module |
| --- | --- | --- | --- | --- |
| 81 | `m365-licenties-per-sku` | basis | leest | Microsoft.Graph |
| 82 | `m365-gebruikers-zonder-licentie` | basis | leest | Microsoft.Graph |
| 83 | `m365-teams-eigenaren` | basis | leest | MicrosoftTeams |
| 84 | `m365-gastgebruikers-groepen` | gevorderd | leest (schrijft een lokale CSV) | Microsoft.Graph |
| 85 | `m365-licenties-terughalen` | gevorderd | wijzigt, `-WhatIf` | Microsoft.Graph |
| 86 | `m365-groepen-zonder-eigenaar` | gevorderd | leest | Microsoft.Graph |
| 87 | `m365-gebruiksrapport-verwerken` | expert | leest (schrijft het rapport naar de tijdelijke map) | Microsoft.Graph |
| 88 | `m365-teams-beleid-vergelijken` | expert | leest | MicrosoftTeams |
| 89 | `m365-licentie-wisselen-bulk` | expert | wijzigt, `-WhatIf` | Microsoft.Graph |

## Hoe de cmdlets zijn getoetst (nieuw in deze sessie)

Eerst waren de modules niet geïnstalleerd. Claude Code heeft ze met `Save-Module` opgeslagen in een tijdelijke map buiten de repo (zonder iets te installeren) en met `$env:PSModulePath` geladen. Zo zijn cmdlets, parameters, modeltypen (met `GetProperties()`), `Mandatory`-instellingen, `ValidateSet`, helpteksten en proxyfuncties getoetst. Dat heeft meerdere aannames weerlegd (`Get-MgUser` heeft geen `-Select` maar `-Property`; `-CountVariable` zet de variabele standaard in de globale scope; `-OutFile` is verplicht bij het gebruiksrapport). De Teams-cmdlets hebben geen uitvoertypen in hun metadata; daar is op de modeltypes in de DLL en op de helptekst gesteund. De logica is getest met nagebootste cmdlets (functies met dezelfde naam, voor het script gedefinieerd) in `pwsh` en Windows PowerShell 5.1. Wie dit wil herhalen: `Save-Module -Name <module> -Path <map>` en dan `$env:PSModulePath = '<map>' + [IO.Path]::PathSeparator + $env:PSModulePath`.

## Wat de reviews vonden (de rode draad voor de volgende scripts)

- **Stellige uitleg die het script of de module tegenspreekt.** Voorbeelden: een script dat "stopt" bij een deling door nul maar doorgaat (alleen het ene object ontbreekt); `[datetime]'11-10-2026'` is niet taalafhankelijk maar leest altijd maand-eerst (10 november), terwijl `[datetime]::Parse` en `Get-Date` de taalinstelling volgen; `-CountVariable` zet de variabele in de globale scope, niet in jouw scope. Test elke claim in de uitleg, ook in beide PowerShell-versies.
- **Alleen het begin van de uitvoer bekijken.** Dat leidde tot de eerste fout. Bekijk de volledige uitvoer.
- **Getallen of voorbeelden in een uitleg die uit de eigen testdata komen** maar niet in de vraag staan ("licentie Power BI Pro in het voorbeeld", "4 in plaats van 2"). Zet ze in de vraag of formuleer het als voorbeeld.
- **Het goede antwoord was te vaak het langste, of juist het kortste.** Controleer lengte en positie met een klein node-script (`len.mjs`) vóór de review. Beide richtingen zijn een patroon.
- **`$naam:` in een string** wordt als station gelezen en geeft een parserfout; schrijf `${naam}:` (kwam weer voor, de syntaxcontrole en de mock-test vingen het).
- **`replace` in JavaScript leest `$\`` en `$&` in de vervangtekst als patroon.** Dat beschadigde een JSON-bestand en leidde tot een rode check (PR 82 is daarna hersteld, er is niets rood gemerged). Gebruik `t.replace(a, () => b)`, schrijf aanpassingsscripts via de Write-tool en zet de hele keten achter `&&`, zodat niets doorloopt na een mislukte stap. Controleer na een merge of de laatste check groen is (`gh pr checks` toont ook oudere, rode runs).
- **`npm run validate | tail -1` geeft altijd exitcode 0.** Controleer met een bestand en `&&` of kijk expliciet naar het aantal fouten.

## Besluiten van Peter

- De lijst van 9 scripts voor Microsoft 365 is goedgekeurd, en daarna zelfstandig afgemaakt (zie de lijst in de vorige sessie en de tabel hierboven).
- Keuzes die Peter kan terugdraaien: gasten (4) en vertrokken medewerkers (5) staan bij Microsoft 365 en niet bij Entra ID; de Teams-scripts gebruiken de module MicrosoftTeams en niet Graph; Exchange (postvakken) is bewust weggelaten.

## Wat er nog open staat

1. **Scriptlijsten voor Exchange en de aanvulling van Security en Azure.** Exchange heeft nog geen scripts. Security heeft Entra ID (2) en Purview (3) en Azure heeft Foundry (9). Een nieuwe lijst per onderwerp kiest Peter (CLAUDE.md, werkwijzepunt 3).
2. **Issue #36** (zoekfunctie, label "later") wacht op een besluit van Peter.
3. **Controle van de scripts**: Migraties (zes), SharePoint (negen), Purview (drie), Foundry (negen) en Microsoft 365 (negen) staan op `nog_te_controleren`. Echt draaien tegen een tenant of abonnement is een stoppunt dat Peter goedkeurt. Per m365-script staan de open punten in `note`; de belangrijkste: de minimale scopes, groepslicenties intrekken, `SignInActivity` (AuditLog.Read.All en een P1/P2-licentie), `RenewedDateTime` zonder vervalbeleid, de Teams-uitvoereigenschappen en `EffectivePolicyAssignments`.
4. **Cmdlet-controle in CI** (DESIGN.md regel 194): de aanpak met `Save-Module` en `Get-Command` uit deze sessie is een goede basis. Het bouwen blijft een besluit van Peter.
5. Nog open uit eerdere overdrachten: het examen- en voortgangsontwerp zonder niveau, kijken in Safari, Firefox en op een echte telefoon, en geen test op de reset van de ingeklapte waarschuwingen bij scriptwissel.
6. **De Copilot-prompt (issue #72) is gebouwd** (PR 78). Peter heeft die nog niet beoordeeld in zijn Copilot; de grens van 8000 tekens is een aanname.

## Waar de kennis staat

`CLAUDE.md`, `DESIGN.md` (1.22), `DEFINE.md` (0.9), issue #36 en deze en de eerdere overdrachten in `docs/sessies/`. De scripts staan in `data/scripts/m365/`. De opgeslagen modules en testbestanden staan niet in de repo (tijdelijke map van de sessie).
