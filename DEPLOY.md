# DEPLOY – PowerShell Leestrainer

De site staat op **https://ps-trainer.pdscloud.nl** (GitHub Pages). Dit document beschrijft hoe die live komt, hoe je het controleert en hoe je het terugdraait. Wat Claude Code hier nooit zelf doet: DNS, de Pages-instellingen en de livegang vragen altijd Peters uitdrukkelijke akkoord (CLAUDE.md).

## Hoe het werkt

- Een push naar `main` (dus het moment dat Peter een pull request merget) start de workflow **Deploy** (`.github/workflows/deploy.yml`). Handmatig opnieuw publiceren kan via Actions → Deploy → **Run workflow** (alleen vanaf `main`).
- De workflow draait eerst dezelfde controles als bij een pull request (`validate`, `test`, `syntax`, `smoke`), bouwt dan het sitepakket (`npm run build-site`), test het pakket zelf (`npm run smoke-site`) en publiceert het.
- **Alleen de allowlist** komt in het pakket: `index.html`, `CNAME`, en de mappen `oefenen/`, `woordenboek/`, `assets/`, `data/` (met een verse `data/index.json`) en `schema/`. Nooit `tests/`, `tools/`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `.github/`, `legacy/` of andere repo-bestanden. Een test bewaakt dit (`tests/site.test.mjs`).
- Een nieuwe pagina toevoegen? Zet haar map in `TOEGESTANE_MAPPEN` (`tools/build-site.mjs`) en haar pad in `PAGINAS` (`tools/smoke.mjs`); de tests falen als je dat vergeet.
- Kosten: GitHub Pages en Actions zijn gratis voor een publieke repo. Er zijn geen Azure-resources en geen geheimen nodig.

## Eenmalig instellen (in deze volgorde)

De volgorde is belangrijk: zonder eigen domein staat de site op `https://peterdeswart96-ship-it.github.io/ps-trainer/`, en dan kloppen de paden vanaf de root (`/assets/...`) niet.

0. **Voorbereiding (eenmalig, aanbevolen):**
   - *Domeinverificatie:* verifieer `pdscloud.nl` in GitHub (https://github.com/settings/pages → Add a domain; je krijgt een TXT-record `_github-pages-challenge-<gebruiker>`). Zo kan niemand anders een subdomein van jou aan een eigen GitHub Pages-site koppelen.
   - *CAA-records:* controleer bij TransIP of er een CAA-record staat op `pdscloud.nl`; zo ja, dan moet `letsencrypt.org` zijn toegestaan, anders lukt *Enforce HTTPS* niet.
   - *Bestaande records:* bestaande subdomeinen (`mokumntfy`, `ntfy`) blijven ongemoeid; je voegt alleen het record `ps-trainer` toe. Controleer dat het nog niet bestaat: `Resolve-DnsName ps-trainer.pdscloud.nl -Type CNAME` (geen resultaat is goed) en dat er geen wildcard- of A-record voor `ps-trainer` bestaat.
1. **DNS in TransIP** (op het domein zelf, **niet** in de "Standaard DNS-instellingen"): transip.nl → Domein & Hosting → `pdscloud.nl` → DNS. Voeg toe:

   | Naam | TTL | Type | Waarde |
   | --- | --- | --- | --- |
   | `ps-trainer` | 5 Min. | CNAME | `peterdeswart96-ship-it.github.io.` |

   Opslaan en controleren op https://dnschecker.org/#CNAME/ps-trainer.pdscloud.nl. Zet de TTL na propagatie terug naar 1 uur.
2. **GitHub Pages inschakelen met GitHub Actions als bron:** repo → Settings → Pages → *Build and deployment* → **Source: GitHub Actions**. (Dus niet "Deploy from a branch", anders dan de skill `github-pages-subdomain` beschrijft: de gebouwde index zit niet in git.)
   Met de GitHub CLI: `gh api -X POST repos/peterdeswart96-ship-it/ps-trainer/pages -f build_type=workflow` (geeft *409* als Pages al bestaat: gebruik dan `gh api -X PUT repos/peterdeswart96-ship-it/ps-trainer/pages -f build_type=workflow`)
3. **Eigen domein instellen:** Settings → Pages → *Custom domain* → `ps-trainer.pdscloud.nl` → Save. Wacht op "DNS check successful" (5 tot 15 minuten).
   Met de GitHub CLI: `gh api -X PUT repos/peterdeswart96-ship-it/ps-trainer/pages -f cname=ps-trainer.pdscloud.nl`
4. **HTTPS afdwingen:** zodra het certificaat er is (5 tot 15 minuten na de DNS-check), vink *Enforce HTTPS* aan.
   Met de GitHub CLI: `gh api -X PUT repos/peterdeswart96-ship-it/ps-trainer/pages -F https_enforced=true`
5. **Omgeving controleren (verplicht):** alleen `main` mag naar Pages deployen, ook als iemand de workflow op een andere branch start. Settings → Environments → `github-pages` → *Deployment branches and tags* → alleen `main`. Controleren met `gh api repos/peterdeswart96-ship-it/ps-trainer/environments/github-pages --jq '{regel: .deployment_branch_policy}'`: er moet een regel staan (`custom_branch_policies: true`), niet `null`. Staat het niet goed, stel het dan in via de instellingen; de omgeving bestaat zodra Pages met GitHub Actions is ingeschakeld (stap 2).
6. **Eerste deploy:** merge de pull request met `deploy.yml`. **Die merge is zelf de livegang** (push naar `main`), dus stap 0 tot en met 5 moeten dan klaar zijn; anders wordt de deploy rood (er wordt dan niets gepubliceerd). Daarna kan Deploy ook handmatig via Actions. Wacht op het **groene vinkje** voordat je test.

> Het bestand `CNAME` staat in het pakket (allowlist), maar bij een deploy via Actions bepaalt de instelling bij stap 3 het domein; het bestand wordt genegeerd.

## Controle direct na livegang

Open de site en loop dit na (laptop en telefoon, licht en donker):

- [ ] https://ps-trainer.pdscloud.nl/ laadt met logo, onderwerpkaarten en iconen (HTTPS-slotje aan).
- [ ] `/oefenen/` opent het standaardscript; een antwoord geven werkt en de voortgang blijft na verversen staan.
- [ ] `/woordenboek/?q=where` toont resultaten.
- [ ] Console (F12) zonder fouten, ook geen CSP-meldingen; de lettertypen (IBM Plex, Source Sans) laden.
- [ ] Alles wat niet gepubliceerd hoort te zijn geeft **404**. In PowerShell:
  ```powershell
  foreach ($pad in '/.git/config', '/tools/validate.mjs', '/tests/', '/DESIGN.md', '/CLAUDE.md', '/package.json', '/legacy/ps-leestrainer-v1.html', '/.github/workflows/deploy.yml', '/data/index.json', '/data/topics.json', '/data/dictionary.json') {
      $status = curl.exe -s -o NUL -w "%{http_code}" "https://ps-trainer.pdscloud.nl$pad"
      '{0,-45} {1}' -f $pad, $status
  }
  ```
  De eerste acht moeten **404** geven en de laatste drie (`/data/...`) **200**. `000` betekent niet bereikbaar (bijvoorbeeld DNS nog niet doorgekomen), dat is dus geen 404. Het bestand `/CNAME` mag 200 geven; dat is onschadelijk.
- [ ] Heb je v1 eerder in deze browser gebruikt: je oude voortgang staat er na het eerste bezoek weer (overname van v1).

## Terugdraaien

- **Revert:** open de gemergde pull request in GitHub → *Revert* → merge de nieuwe pull request. `main` krijgt dan weer de vorige inhoud en Deploy publiceert die automatisch.
- **Of** een eerdere succesvolle deploy opnieuw publiceren: Actions → Deploy → die run → *Re-run all jobs* (publiceert exact dat commit opnieuw).

## Problemen

| Melding | Oorzaak en oplossing |
| --- | --- |
| Deploy rood bij "Publiceren": *Pages site not found* of *Get Pages site failed* | Stap 2 is nog niet gedaan: Source staat niet op GitHub Actions. Los het op en kies daarna Actions → Deploy → *Re-run failed jobs*. |
| De site toont niets of stijlen ontbreken op `…github.io/ps-trainer/` | Het eigen domein (stap 3) is nog niet actief; de paden werken alleen vanaf de root van een domein. |
| "DNS check unsuccessful" in GitHub | DNS is nog niet doorgekomen, of het record staat in de standaardinstellingen in plaats van op het domein zelf. Wachten of controleren. |
| *Enforce HTTPS* is grijs | Het certificaat wordt nog aangemaakt; wacht 5 tot 15 minuten. |
| Rooktest op het pakket faalt | Een pagina of bestand ontbreekt in het pakket: controleer `TOEGESTANE_MAPPEN` in `tools/build-site.mjs`. |
