// Rooktest: start de site lokaal en controleert dat elke pagina laadt en index.json klopt.
//
// BELANGRIJK: elke nieuwe pagina moet hieronder in PAGINAS worden toegevoegd (bijvoorbeeld '/oefenen/').
//
// De test werkt op een tijdelijke kopie van de repo (zonder .git en node_modules), zodat
// data/index.json in de echte repo niet verandert. De server draait op een vrije poort.
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bouwIndex, schrijfIndex } from './build-index.mjs';
import { startServer } from './server.mjs';

const PAGINAS = [];

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
    if (pad === '/data/index.json') {
      const index = await antwoord.json();
      if (!Array.isArray(index.scripts)) mislukt('index.json bevat geen lijst scripts');
      if (!Array.isArray(index.topics)) mislukt('index.json bevat geen lijst topics');
    }
  }
} catch (e) {
  mislukt(e.message);
} finally {
  server?.close();
  rmSync(tmp, { recursive: true, force: true });
}

console.log(fouten === 0 ? 'Rooktest geslaagd' : `Rooktest mislukt: ${fouten} fouten`);
process.exit(fouten === 0 ? 0 : 1);
