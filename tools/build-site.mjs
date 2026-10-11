// Bouwt het pakket dat naar GitHub Pages gaat: alleen de toegestane sitebestanden (allowlist), met een
// verse data/index.json. Alles wat niet op de allowlist staat (tests, tools, DESIGN.md, CLAUDE.md,
// package.json, .github, legacy, ...) komt er nooit in (CLAUDE.md, "Beveiliging").
//
// Gebruik:  node tools/build-site.mjs [doelmap]      (standaard: _site in de repo)
// De doelmap wordt eerst leeggemaakt; die moet binnen de repo liggen en mag niet de repo zelf zijn.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bouwIndex, schrijfIndex } from './build-index.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

// De allowlist. Een nieuwe pagina (map met index.html) moet hier bij; tests/site.test.mjs controleert
// dat elke pagina in het pakket terechtkomt.
export const TOEGESTANE_BESTANDEN = ['index.html', 'CNAME'];
export const TOEGESTANE_MAPPEN = ['oefenen', 'woordenboek', 'assets', 'data', 'schema'];

// Nooit meenemen, ook niet binnen een toegestane map: dotfiles en node_modules, en de lokale index
// (die bouwen we hieronder opnieuw, zodat er nooit een verouderde index meegaat).
const nietMeenemen = (bron, mapRoot) => {
  const naam = bron.split(sep).pop();
  if (naam.startsWith('.') || naam === 'node_modules') return false;
  return relative(mapRoot, bron) !== join('data', 'index.json');
};

function tel(map) {
  let bestanden = 0;
  let bytes = 0;
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    const info = statSync(pad);
    if (info.isDirectory()) { const sub = tel(pad); bestanden += sub.bestanden; bytes += sub.bytes; } else { bestanden++; bytes += info.size; }
  }
  return { bestanden, bytes };
}

// Bouwt het pakket en geeft { doel, bestanden, bytes } terug. Gooit een fout bij een ongeldige doelmap, een
// ontbrekend toegestaan bestand of een mislukte indexbouw.
export function bouwSite({ root = repo, doel = join(repo, '_site') } = {}) {
  const doelPad = resolve(doel);
  const rootPad = resolve(root);
  const binnenRepo = doelPad.startsWith(rootPad + sep) || !relative(rootPad, doelPad).startsWith('..');
  if (doelPad === rootPad || !doelPad.startsWith(rootPad + sep) && binnenRepo && relative(rootPad, doelPad) === '') {
    throw new Error('De doelmap mag niet de repo zelf zijn');
  }
  if (!doelPad.startsWith(rootPad + sep)) throw new Error(`De doelmap moet binnen de repo liggen: ${doelPad}`);
  // Nooit een map leegmaken die op de allowlist staat of de bronnen bevat
  const eersteDeel = relative(rootPad, doelPad).split(sep)[0];
  if ([...TOEGESTANE_MAPPEN, ...TOEGESTANE_BESTANDEN, '.git', 'tools', 'tests', 'legacy', 'node_modules'].includes(eersteDeel)) {
    throw new Error(`De doelmap mag niet in ${eersteDeel} liggen`);
  }

  for (const naam of [...TOEGESTANE_BESTANDEN, ...TOEGESTANE_MAPPEN]) {
    if (!existsSync(join(rootPad, naam))) throw new Error(`Toegestaan sitebestand ontbreekt: ${naam}`);
  }

  const { fouten, index } = bouwIndex({ scriptsMap: join(rootPad, 'data', 'scripts'), topicsBestand: join(rootPad, 'data', 'topics.json') });
  if (fouten.length > 0) throw new Error(`index bouwen mislukt:\n${fouten.join('\n')}`);

  rmSync(doelPad, { recursive: true, force: true });
  mkdirSync(doelPad, { recursive: true });
  for (const naam of TOEGESTANE_BESTANDEN) cpSync(join(rootPad, naam), join(doelPad, naam));
  for (const naam of TOEGESTANE_MAPPEN) {
    cpSync(join(rootPad, naam), join(doelPad, naam), { recursive: true, filter: (bron) => nietMeenemen(bron, rootPad) });
  }
  schrijfIndex(index, join(doelPad, 'data', 'index.json'));

  return { doel: doelPad, ...tel(doelPad), aantalScripts: index.scripts.length };
}

// Alleen uitvoeren als dit bestand direct wordt gestart (niet bij import door de tests).
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const resultaat = bouwSite({ doel: process.argv[2] ? resolve(process.argv[2]) : join(repo, '_site') });
    console.log(`Site gebouwd: ${relative(process.cwd(), resultaat.doel) || '.'} (${resultaat.bestanden} bestanden, ${Math.round(resultaat.bytes / 1024)} kB, ${resultaat.aantalScripts} scripts)`);
  } catch (fout) {
    console.error(`FOUT  ${fout.message}`);
    process.exit(1);
  }
}
