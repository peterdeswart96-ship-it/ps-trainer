# Beveiliging: detailregels
- Geen sleutels, tokens of wachtwoorden in code, JSON, workflows of commits.
- Tekst uit JSON altijd escapen voor weergave. Geen `innerHTML` met ongecontroleerde data.
- Scripts worden nooit uitgevoerd in de app.
- Vaste URL's (`/oefenen/?script=`, `/examen/`, `/flashcards/`, `/woordenboek/`) mogen niet veranderen zonder de agentinstructies aan te passen.
- Elke nieuwe pagina wordt toegevoegd aan `PAGINAS` in `tools/smoke.mjs`, anders test de rooktest haar niet.
- De lokale server (`tools/server.mjs`) geeft 404 voor dotfiles (`.env`, `.git/`) en `node_modules`; alleen `/.well-known/` is toegestaan.
- Geen officiële Microsoft-iconen of -logo's: alle iconen zijn eigen SVG's in `assets/img/icons` (besluit van Peter, 13 oktober 2026). Elk onderwerp, ook een subcategorie, heeft een eigen `ico-<id>` in `app.css` en een bijbehorend SVG-bestand; een test dwingt dat af.
- Bij `feature/deploy` wordt alleen een allowlist van sitebestanden gepubliceerd (`index.html`, pagina-mappen, `assets/`, `data/`, `schema/`, `CNAME`). Nooit `tests/`, `tools/`, `DESIGN.md`, `CLAUDE.md`, `package.json`, `.github/` of andere repo-bestanden publiceren.
