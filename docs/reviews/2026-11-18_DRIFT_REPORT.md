# Drift-rapport – 2026-11-18

Codebasis: origin/main per 2026-11-18. Gecontroleerd: `DEFINE.md` (v0.9), `DESIGN.md` (v1.22), `DEPLOY.md`.

**Samenvatting**
- De inhoud loopt voor op DEFINE: `algemeen` en `m365` hebben elk 9 scripts (50 in totaal), terwijl DEFINE zegt dat die onderwerpen zonder scripts starten, en ze in 2.0 buiten scope zet (32 scripts).
- De werkbank toont bij een onderwerp zonder scripts geen "nog in opbouw": het onderwerp ontbreekt in het filter, en `?topic=exchange` toont een script van een ander onderwerp.
- Onderwerp-id's staan hard in twee schema's (`schema/script.schema.json`, `schema/dictionary.schema.json`) in plaats van dat ze uit `data/topics.json` komen. `validate.mjs` leest `topics.json` niet.
- De cmdlet-controle in CI (DESIGN §6) ontbreekt, terwijl er 50 scripts zijn. 37 daarvan staan op `nog_te_controleren`, niet alleen de ShareGate-scripts.
- DESIGN §8/§10/§11 en DEPLOY zeggen dat Peter merget en dat Claude nooit zelf merget; `CLAUDE.md` (regels 15 en 18) laat Claude zelf mergen.

## DEFINE.md

- **Scripts in de nieuwe onderwerpen:** de status (0.9) en "Buiten scope" zeggen dat PowerShell-basis, Exchange, Security, Azure en Microsoft 365 in 2.0 zonder scripts starten. In werkelijkheid staan er 9 scripts in `data/scripts/algemeen/` (allemaal `gecontroleerd`) en 9 in `data/scripts/m365/`.
- **Omvang release 2.0:** de tabel noemt 32 scripts (28 nieuw). De repo heeft er 50: Migraties 9, SharePoint 9, Foundry 9, Purview 3, Entra ID 2, PowerShell-basis 9 en Microsoft 365 9. In de tabels "Inhoud: onderwerpen en modules" en "Omvang release 2.0" ontbreken `algemeen` en `m365` helemaal (geen module, geen voorbeelden, geen aantal).
- **"Nog in opbouw" in de filters:** "De filters tonen bij onderwerpen die nog niet af zijn 'nog in opbouw'" (Omvang 2.0, Aandachtspunten "Lege onderwerpen"). `assets/js/oefenen.js` `renderFilters()` (regel 315-316) laat hoofdonderwerpen zonder scripts (Exchange) weg uit het filter. Er is geen melding "nog in opbouw" op de werkbank, alleen op de startpagina (`assets/js/start.js` regel 73).
- **Foundry-scripts maken ook agents aan:** het besluit "Foundry-scripts" en Aandachtspunten noemen het aanmaken van agents via `Invoke-RestMethod`. Geen enkel `data/scripts/foundry/*/script.ps1` bevat `Invoke-RestMethod` of het aanmaken van een agent.
- **Foundry "kosten controleren":** dit voorbeeld uit de inhoudstabel ontbreekt. Er is geen Foundry-script met kosten of consumption-cmdlets (alleen `foundry-tags-controleren`).
- **Succescriterium "alle cmdlets en parameters bestaan echt":** de enige toegestane uitzondering is ShareGate. 37 van de 50 `meta.json` staan op `check.status: nog_te_controleren`, waaronder alle Foundry-, Microsoft 365-, Purview- en (op één na) SharePoint-scripts, en `entra-oude-apparaten`.
- **Vaste URL's:** DEFINE noemt `/exam` en `/flashcards`, DESIGN §5 `/examen/` en `/flashcards/`. Geen van beide pagina's bestaat (2.1), en de naam van de examenpagina spreekt elkaar tegen.
- **Indeling van de 4 bestaande scripts** is nog een "voorstel, nog bijsturen", maar het besluit is in de code al genomen: `migraties-sharegate-bibliotheken` staat op `gevorderd` (niet "gevorderd of expert"), `entra-oude-apparaten` op `gevorderd`.

## DESIGN.md

- **Lege onderwerpen op de werkbank (§4.2, §5):** "Een onderwerp zonder scripts toont 'nog in opbouw' in plaats van een lege lijst." Op de werkbank klopt dat niet. `oefenen.js` `renderFilters()` laat het onderwerp weg, en `?topic=exchange` wordt door `data.js` `leesParams()` geaccepteerd. Daarna valt `kiesScript()` terug op het standaardscript van een ander onderwerp, en `renderChips()` toont dat ene script zonder melding.
- **Validatie van onderwerpen (§6, JSON-controle "alle onderwerpen geldig"):** de geldige id's staan als harde `enum` in `schema/script.schema.json` (`properties.topic`) en `schema/dictionary.schema.json` (`items.topics.items`). `tools/validate.mjs` leest `data/topics.json` niet. Een nieuw onderwerp vraagt dus wijzigingen in twee schema's. §5 ("Een nieuw onderwerp krijgt ... in `app.css`") noemt dat niet, en geen test bewaakt dat de enum gelijk is aan `topics.json`.
- **Cmdlet-controle (§6, "zodra de eerste scripts er staan"):** niet gebouwd. Er is geen AST-cmdlet-check in `tools/`, `package.json` of `.github/workflows/validate.yml`/`deploy.yml`, terwijl er 50 scripts zijn.
- **Voorbeeld `meta.json` (§4.1):** `"note": null` is ongeldig volgens `schema/script.schema.json` (`note`: `type: string`, `minLength: 1`). Geen enkel script gebruikt `null`; het veld wordt weggelaten.
- **Ongedocumenteerde controles in `tools/validate.mjs`:** niet beschreven in §6. Het gaat om: een fout als een `mc`/`bug`-vraag geen `lines` heeft (regel 164-166), een fout als de bovenliggende map afwijkt van `topic`, de waarschuwing bij niet-ASCII-tekens in `script.ps1` (regel 172-175), de waarschuwing bij `risk: read` met wijzigende cmdlets (`SCHRIJF_CMDLET`, regel 27 en 176-181), en de controle op dubbele `legacyId`.
- **Startpagina-kaart (§5):** "Een kaart opent het eerste script van het onderwerp." `start.js` `bouwKaarten()` (regel 45) gebruikt `kiesScript()`, dus het standaardscript: laagste niveau en eerst een gecontroleerd script. Bij SharePoint is dat een script uit de subcategorie `migraties`, niet uit `sharepoint` zelf.
- **Filterwissel versus standaardscript (§5):** bij een wissel van onderwerp kiest `oefenen.js` `zetFilter()` (regel 617-618) `lijst[0]` in indexvolgorde, zonder de voorkeur voor gecontroleerde scripts. Bij het laden met `?topic=` geldt `standaardScript()` wel. Hetzelfde onderwerp opent daardoor via de URL een ander script dan via de filterknop. Het ontwerp beschrijft dit verschil niet.
- **Merge-beleid (§8 "Rechten", §10 "Branches en testen", §11):** "Claude Code ... merget nooit zelf; mijn Merge-klik is het akkoord" en "elk met mijn akkoord vóór de volgende". `CLAUDE.md` regel 15 en 18 zeggen: "daarna zelf commit, push, PR en merge" en "Claude merget zelf (`gh pr merge`, squash)".
- **Plan voor Develop (§11):** stap 5 noemt alleen inhoudsbranches voor migraties, sharepoint, foundry en purview. De 9 `algemeen`- en 9 `m365`-scripts staan niet in het plan.
- **Deploy-stappen (§10):** "voert vooraf zelf `npm run validate`, `npm test` en `npm run smoke` uit". `deploy.yml` draait ook `pwsh -Version` en `npm run syntax`. Dat staat wel in §6.2, maar §10 spreekt het tegen.
- **Repo-indeling (§3):** de map `docs/` (met `docs/sessies/`, `inhoudsregels.md`, `werkwijze.md` en andere), `tests/`, `README.md`, `.claude/`, `.gitattributes` en `.gitignore` ontbreken in de boom. Onder `assets/js/` ontbreken `prompt.js`, `theme.js` en `theme-init.js` (die laatste wel genoemd in §4.3). In `assets/img/` ontbreekt `icons/`.
- **`agent/instructions.md` (§3, §5, §8):** staat in de repo-indeling zonder release-aanduiding en is de plek voor de vaste URL's van de PS Coach. Het bestand bestaat niet. De andere nog niet gebouwde onderdelen (`api/`, `flashcards/`, `examen/`, `voortgang/`) zijn wel als 2.1/2.2 gemarkeerd.
- **Status-regel (kop):** de laatste versie is 1.22 van 13 oktober 2026. De inhoud van PowerShell-basis en Microsoft 365, en de vraag of `algemeen`/`m365` nu "live" zijn, staan nergens in het ontwerp. Alleen `topics.json` en de code weerspiegelen de huidige stand.

## DEPLOY.md

- **Wie merget:** "Een push naar `main` (dus het moment dat Peter een pull request merget)" (Hoe het werkt) en "merge de pull request" (stap 6) gaan uit van een merge door Peter. `CLAUDE.md` regel 18 laat Claude zelf mergen met `gh pr merge`, en een merge gaat direct live. DEPLOY zegt niet wie de livegang in dat geval goedkeurt.
