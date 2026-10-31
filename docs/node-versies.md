# Node-versie (hier is het vijf keer misgegaan)
- Begin elke sessie met `node -v` en `git branch --show-current`. Stop en meld het als de Node-hoofdversie afwijkt van `.nvmrc`.
- Tooling (repo-root): Node 24 (`.nvmrc`); elk npm-script begint met `tools/check-node.mjs`. Function (`api/`, vanaf 2.2): Node 22 (`api/.nvmrc`), nooit 24 aannemen voor Azure Functions. Windows Consumption is uitgesloten.
- GitHub Actions: `actions/setup-node` met `node-version-file`, nooit een los getal, `latest` of `lts/*`.
- Les uit `mokum-competitie`: Node 24 op Linux Consumption gaf permanent 503 terwijl `az functionapp show` `Running` meldde. Alleen een echte HTTP-aanroep bewijst dat een Function werkt; in 2.2 eerst een runtime-test (`process.version`, HTTP 200).
