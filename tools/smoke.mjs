// Rooktest: start de site lokaal en controleert dat elke pagina laadt en index.json klopt.
//
// BELANGRIJK: elke nieuwe pagina moet hieronder in PAGINAS worden toegevoegd (bijvoorbeeld '/oefenen/').
// Van elke HTML-pagina worden ook de scripts en stijlbladen gecontroleerd waarnaar de pagina vanaf de root
// verwijst (src="/..." en <link href="/...">): die moeten HTTP 200 geven. Links naar andere pagina's
// (<a href>) controleren we niet; die staan zelf in PAGINAS.
//
// De test werkt op een tijdelijke kopie van de repo (zonder .git en node_modules), zodat
// data/index.json in de echte repo niet verandert. De server draait op een vrije poort.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bouwIndex, schrijfIndex } from './build-index.mjs';
import { startServer } from './server.mjs';

const PAGINAS = ['/', '/oefenen/', '/woordenboek/'];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'ps-trainer-smoke-'));
let server;
let fouten = 0;
const mislukt = (bericht) => { console.error(`FOUT  ${bericht}`); fouten++; };

try {
  cpSync(root, tmp, { recursive: true, filter: (bron) => !['.git', 'node_modules'].includes(basename(bron)) });

  const gebouwd = bouwIndex({ scriptsMap: join(tmp, 'data', 'scripts'), topicsBestand: join(tmp, 'data', 'topics.json') });
  if (gebouwd.fouten.length > 0) {
    for (const regel of gebouwd.fouten) console.error(regel);
    throw new Error('index bouwen mislukt');
  }
  schrijfIndex(gebouwd.index, join(tmp, 'data', 'index.json'));

  server = await startServer({ root: tmp, port: 0 });
  const basis = `http://127.0.0.1:${server.address().port}`;

  for (const pad of [...PAGINAS, '/data/index.json']) {
    const antwoord = await fetch(basis + pad);
    if (antwoord.status !== 200) { mislukt(`${pad} gaf HTTP ${antwoord.status}`); continue; }
    console.log(`OK  200  ${pad}`);
    if ((antwoord.headers.get('content-type') ?? '').startsWith('text/html')) {
      const html = await antwoord.text();
      const verwijzingen = [...html.matchAll(/(?:src="|<link[^>]*?href=")(\/(?!\/)[^"]*)"/g)].map((m) => m[1]);
      // Alle bronnen die de pagina nodig heeft, inclusief de modules die JavaScript-bestanden zelf importeren
      // (import ... from './x.js'): een hernoemd of verwijderd modulebestand moet de rooktest laten falen.
      const wachtrij = [...new Set(verwijzingen)].map((v) => ({ pad: v, door: pad }));
      const gezien = new Set();
      while (wachtrij.length > 0) {
        const { pad: bronPad, door } = wachtrij.shift();
        if (gezien.has(bronPad)) continue;
        gezien.add(bronPad);
        const bron = await fetch(basis + bronPad);
        if (bron.status !== 200) { mislukt(`${door} verwijst naar ${bronPad}: HTTP ${bron.status}`); continue; }
        console.log(`OK  200  ${bronPad} (door ${door})`);
        // Een stijlblad verwijst met url(...) naar afbeeldingen (de iconen als masker): ook die moeten bestaan.
        if ((bron.headers.get('content-type') ?? '').startsWith('text/css')) {
          const css = await bron.text();
          for (const m of css.matchAll(/url\(\s*['"]?(\/(?!\/)[^'")\s]+)['"]?\s*\)/g)) wachtrij.push({ pad: m[1], door: bronPad });
        }
        if ((bron.headers.get('content-type') ?? '').startsWith('text/javascript')) {
          const code = await bron.text();
          for (const m of code.matchAll(/(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g)) {
            const doel = new URL(m[1] ?? m[2], `http://localhost${bronPad}`);
            if (doel.origin === 'http://localhost') wachtrij.push({ pad: doel.pathname, door: bronPad });
          }
        }
      }
    }
    if (pad === '/data/index.json') {
      const index = await antwoord.json();
      if (!Array.isArray(index.scripts)) mislukt('index.json bevat geen lijst scripts');
      if (!Array.isArray(index.topics)) mislukt('index.json bevat geen lijst topics');
    }
  }
} catch (e) {
  mislukt(e.message);
} finally {
  // Eerst alle (keep-alive)verbindingen sluiten en wachten tot de server echt dicht is; zo staat er niets
  // meer open als het proces eindigt (anders crasht Node op Windows soms met een libuv-fout).
  if (server) {
    server.closeAllConnections();
    await new Promise((klaar) => server.close(klaar));
  }
  rmSync(tmp, { recursive: true, force: true });
}

console.log(fouten === 0 ? 'Rooktest geslaagd' : `Rooktest mislukt: ${fouten} fouten`);
process.exitCode = fouten === 0 ? 0 : 1;
