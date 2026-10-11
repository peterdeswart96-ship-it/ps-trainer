// Bouwt data/index.json uit data/topics.json en alle meta.json-bestanden onder data/scripts.
// De index bevat per script alle velden behalve de vragen (wel het aantal vragen per type), en per
// onderwerp het aantal scripts en een berekende status ("live" of "in-opbouw").
// Dit script valideert niet verder: validate.mjs draait eerst.
//
// Gebruik:  node tools/build-index.mjs [scriptsmap] [uitvoerbestand] [topicsbestand]
// Standaard: data/scripts, data/index.json en data/topics.json
// Het derde argument is er voor tests, zodat die een eigen onderwerpenlijst kunnen gebruiken.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NIVEAUS = ['basis', 'gevorderd', 'expert'];

const pad = (p) => relative(process.cwd(), p).split('\\').join('/') || '.';

function leesJson(bestand, fouten) {
  if (!existsSync(bestand)) { fouten.push(`FOUT  ${pad(bestand)}: bestand ontbreekt`); return null; }
  try {
    return JSON.parse(readFileSync(bestand, 'utf8'));
  } catch (e) {
    fouten.push(`FOUT  ${pad(bestand)}: JSON is ongeldig: ${e.message}`);
    return null;
  }
}

function mappen(map) {
  return readdirSync(map).filter((naam) => statSync(join(map, naam)).isDirectory()).sort();
}

// Geeft { fouten, index } terug. Bij fouten is index null en wordt er niets geschreven.
export function bouwIndex({ scriptsMap, topicsBestand }) {
  const fouten = [];
  const topics = leesJson(topicsBestand, fouten);
  if (topics !== null && !Array.isArray(topics)) {
    fouten.push(`FOUT  ${pad(topicsBestand)}: verwacht een lijst met onderwerpen`);
  }
  const topicIds = new Set(Array.isArray(topics) ? topics.map((t) => t.id) : []);

  const scripts = [];
  if (existsSync(scriptsMap) && statSync(scriptsMap).isDirectory()) {
    for (const onderwerp of mappen(scriptsMap)) {
      for (const mapNaam of mappen(join(scriptsMap, onderwerp))) {
        const metaPad = join(scriptsMap, onderwerp, mapNaam, 'meta.json');
        const meta = leesJson(metaPad, fouten);
        if (meta === null) continue;
        if (!topicIds.has(meta.topic) && Array.isArray(topics)) {
          fouten.push(`FOUT  ${pad(metaPad)}: topic '${meta.topic}' staat niet in ${pad(topicsBestand)}`);
          continue;
        }
        const vragen = Array.isArray(meta.questions) ? meta.questions : [];
        const telling = (type) => vragen.filter((v) => v?.type === type).length;
        scripts.push({
          id: meta.id,
          ...(meta.legacyId !== undefined && { legacyId: meta.legacyId }),
          title: meta.title,
          topic: meta.topic,
          level: meta.level,
          tag: meta.tag,
          summary: meta.summary,
          risk: meta.risk,
          modules: meta.modules,
          ...(meta.note !== undefined && { note: meta.note }),
          check: meta.check,
          counts: { mc: telling('mc'), bug: telling('bug'), open: telling('open') },
          path: `data/scripts/${meta.topic}/${meta.id}`
        });
      }
    }
  }
  if (fouten.length > 0) return { fouten, index: null };

  // Volgorde: onderwerp (volgens topics.json), dan niveau, dan id.
  const volgorde = new Map(topics.map((t) => [t.id, t.order]));
  scripts.sort((a, b) =>
    volgorde.get(a.topic) - volgorde.get(b.topic) ||
    NIVEAUS.indexOf(a.level) - NIVEAUS.indexOf(b.level) ||
    String(a.id).localeCompare(String(b.id)));

  const index = {
    generated: new Date().toISOString(),
    topics: [...topics].sort((a, b) => a.order - b.order).map((t) => {
      const scriptCount = scripts.filter((s) => s.topic === t.id).length;
      return { ...t, scriptCount, status: scriptCount > 0 ? 'live' : 'in-opbouw' };
    }),
    scripts
  };
  return { fouten, index };
}

// Schrijft de index als JSON-bestand (maakt de map aan als die ontbreekt).
export function schrijfIndex(index, uitvoer) {
  mkdirSync(dirname(uitvoer), { recursive: true });
  writeFileSync(uitvoer, JSON.stringify(index, null, 2) + '\n');
}

// Alleen uitvoeren als dit bestand direct wordt gestart (niet bij import door dev-server of smoke).
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const scriptsMap = resolve(process.argv[2] ?? join(root, 'data', 'scripts'));
  const uitvoer = resolve(process.argv[3] ?? join(root, 'data', 'index.json'));
  const topicsBestand = resolve(process.argv[4] ?? join(root, 'data', 'topics.json'));
  const { fouten, index } = bouwIndex({ scriptsMap, topicsBestand });
  if (fouten.length > 0) {
    for (const regel of fouten) console.error(regel);
    console.error(`Index niet gebouwd: ${fouten.length} fouten`);
    process.exit(1);
  }
  schrijfIndex(index, uitvoer);
  console.log(`Index geschreven: ${pad(uitvoer)} (${index.scripts.length} scripts, ${index.topics.length} onderwerpen)`);
}
