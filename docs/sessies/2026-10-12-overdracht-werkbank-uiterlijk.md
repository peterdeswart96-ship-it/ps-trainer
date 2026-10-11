# Overdracht – uiterlijk van de werkbank (11 en 12 oktober 2026, vierde sessie)

Onderwerp: vier kleine uiterlijkwijzigingen aan de werkbank (`/oefenen/`) op basis van Peters geannoteerde schermafbeeldingen.
Dit document vervolgt `2026-10-11-overdracht-inhoud-en-werkbank.md`. Lees ook `CLAUDE.md`, `DESIGN.md` (versie 1.17, leidend) en `DEFINE.md` (0.8).

## Rode draad

Peter stuurde schermafbeeldingen met gele aantekeningen; elke wijziging ging via een eigen feature-branch en pull request naar `main`, door Claude Code zelf gemerged na een groene check "Validatie" en een onafhankelijke review (subagent met schone context). Elke merge zet de site direct live.

| PR | Wat |
| --- | --- |
| 40 | Filter "soort vraag" rechts uitgelijnd, elk soort een eigen pastelkleur (meerkeuze groen, zoek de fout geel, zelf formuleren paars); scripttegels in de scriptkeuze krijgen de kleur van hun onderwerp; knoppen Vorige en Volgende compact (30 px hoog) en onderaan in de vragenbox; DESIGN.md 1.16 |
| 41 | Lettergrootte van de vraag teruggezet naar de oude waarde (Peter vond de grotere letter niets); DESIGN.md bijgewerkt |
| 42 | Kleur van "Zelf formuleren" minder fel (`--st-open` / `--sp-open`) |
| 43 | Waarschuwingen bij een script dat nog te controleren is staan ingeklapt achter een knop met waarschuwingsicoon rechts naast de titel ("Nog te controleren", "Toon uitleg"/"Verberg uitleg", `aria-expanded`); nieuw icoon `assets/img/icons/waarschuwing.svg`; DESIGN.md 1.17 |

## Hoe het in elkaar zit (voor wie er verder aan werkt)

- **Kleuren soort vraag:** CSS-variabelen `--st-<soort>` (rand/felle kleur) en `--sp-<soort>` (pastel) staan in drie blokken (licht, donker via media-query, donker via `data-theme`) naast de onderwerpkleuren in `assets/css/app.css`. De namen beginnen bewust niet met `--t-` of `--p-`: een bestaande test telt die per onderwerp. Een eigen test in `tests/pages.test.mjs` leest de `--st-`/`--sp-` kleuren op positie (18 stuks) en bewaakt contrast; voeg je een soort toe, pas dan die test aan.
- **JS:** `assets/js/oefenen.js` zet `data-soort` op de soortknoppen en `data-onderwerp` op de scripttegels; de soortgroep krijgt de klasse `chips rechts`. Alleen echte DOM-API's gebruiken (geen onderdelen van het nepdocument uit de tests).
- **Waarschuwingen:** `renderKop` bouwt `div.kopbalk` (titel + knop `waarschuwknop`) en `div#waarschuwingen` (verborgen). De ingeklapte staat wordt bij elk script opnieuw gezet. Een gecontroleerd script heeft geen knop en geen waarschuwing (ook de `note` niet).
- **Vragenbox:** de box is zo hoog als het antwoordvak en de navigatie staat onderaan (`.qbox` met `grid-template-rows: auto auto 1fr`).
- 203 tests. In Chrome bekeken: licht en donker, 1400 en 390 px, zonder console-fouten.

## Besluiten van Peter

- Soortfilter rechts met eigen pastelkleuren in dezelfde opmaak als de onderwerpknoppen; tegels dezelfde kleur als hun onderwerp.
- Vraag niet groter: lettergrootte blijft zoals die was.
- "Zelf formuleren" rustiger van kleur.
- Waarschuwingen inklapbaar met een icoon en uitleg erbij. Mijn keuze (niet apart besproken): standaard ingeklapt.

## Wat er nog open staat

1. **Aanraakdoel van Vorige en Volgende:** "59% kleiner" is uitgelegd als ongeveer 41% van het oude formaat (30 px hoog, `.8rem`). Dat haalt WCAG 2.2 2.5.8 (24 px) maar is op een telefoon klein; Peter heeft hier nog niet op gereageerd. Eventueel 36 px of `@media (pointer: coarse)` groter.
2. **Standaard ingeklapt** bij de waarschuwingen: Peter moet bevestigen of dat zo goed is of dat ze open moeten staan.
3. Alles uit de vorige overdracht blijft staan: SharePoint (3 expert-scripts), Foundry (9) en Purview (3), issues #35 (onderwerpen en subcategorieën, vraagt eerst besluiten) en #36 (zoeken), examen- en voortgangsontwerp zonder niveau, cmdlet-controle in CI, kijken in Safari, Firefox en op een echte telefoon.
4. Er is geen test die de reset van de ingeklapte staat bij scriptwissel bewaakt (alleen openen en dichtklappen).

## Werkwijze-aantekeningen

- `pkill` bestaat niet in deze Bash-omgeving; stop de dev-server met PowerShell (`Get-CimInstance Win32_Process` op `dev-server` en `Stop-Process`) of start hem niet op de achtergrond.
- De hulpscripts voor Chrome (`shot.mjs` in de scratchpad) zijn niet bewaard; aanpak staat in het geheugenbestand `reference_chrome-headless-cdp`.
- Een tweede Claude-sessie werkt tegelijk in dezelfde map; commit daarom alleen expliciet de eigen bestanden (`git add <bestanden>`), nooit `git add -A`.

## Waar de kennis staat

`CLAUDE.md`, `DESIGN.md` (1.17), `DEFINE.md` (0.8), issues #35 en #36, en deze en de eerdere overdrachten in `docs/sessies/`.
