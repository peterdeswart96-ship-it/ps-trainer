// Controleert alle oefenscripts: elk meta.json tegen het schema, plus de regels die een
// schema niet kan uitdrukken (mapnamen, dubbele id's, regelnummers, antwoord-index).
//
// Gebruik:  node tools/validate.mjs [map]      (standaard: data/scripts)
// Indeling: <map>/<onderwerp>/<id>/meta.json en script.ps1
// Exitcode: 1 bij fouten, anders 0. Waarschuwingen veroorzaken nooit exitcode 1.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scriptsMap = resolve(process.argv[2] ?? join(root, 'data', 'scripts'));

// Cmdlet-werkwoorden die iets wijzigen; bij risk "read" geeft dat een waarschuwing.
const SCHRIJF_CMDLET = /(?<![\w-])(?:Set|Update|Remove|Disable|Enable|Add|Grant|Revoke|Copy|Move)-[A-Za-z]\w*/g;

const fouten = [];
const waarschuwingen = [];

// Paden in de uitvoer: relatief aan de huidige map, met / als scheidingsteken.
const pad = (p) => relative(process.cwd(), p).split('\\').join('/') || '.';
const fout = (bestand, bericht) => fouten.push(`FOUT  ${pad(bestand)}: ${bericht}`);
const waarschuw = (bestand, bericht) => waarschuwingen.push(`WAARSCHUWING  ${pad(bestand)}: ${bericht}`);

// Strict-modus van Ajv staat aan (standaard): onbekende schema-sleutels en type-unions worden gemeld.
const ajv = new Ajv({ allErrors: true, strict: true });
const valideer = ajv.compile(JSON.parse(readFileSync(join(root, 'schema', 'script.schema.json'), 'utf8')));

function schemaMelding(e) {
  const waar = e.instancePath || '(hele bestand)';
  let tekst = e.message;
  if (e.keyword === 'additionalProperties') tekst += `: '${e.params.additionalProperty}'`;
  // Ajv zegt "boolean schema is false" als een veld helemaal niet mag voorkomen.
  if (tekst === 'boolean schema is false') tekst = 'mag niet voorkomen bij dit vraagtype';
  return `${waar} ${tekst}`;
}

// Aantal regels van een tekst; een regeleinde aan het slot telt niet mee (CRLF en LF).
function aantalRegels(tekst) {
  if (tekst === '') return 0;
  return tekst.replace(/\r?\n$/, '').split(/\r?\n/).length;
}

// Vervangt PowerShell-commentaar (# en <# #>) en de inhoud van tekst tussen aanhalingstekens
// door spaties, zodat alleen echte code overblijft. Here-strings worden niet apart herkend.
function zonderCommentaarEnTekst(tekst) {
  let uit = '';
  let aanhaling = null;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (aanhaling) {
      if (aanhaling === '"' && c === '`') { uit += tekst[i + 1] === undefined ? ' ' : '  '; i++; continue; }
      uit += c === aanhaling || c === '\r' || c === '\n' ? c : ' ';
      if (c === aanhaling) aanhaling = null;
    } else if (c === '<' && tekst[i + 1] === '#') {
      const eind = tekst.indexOf('#>', i + 2);
      const stuk = tekst.slice(i, eind === -1 ? tekst.length : eind + 2);
      uit += stuk.replace(/[^\r\n]/g, ' ');
      i += stuk.length - 1;
    } else if (c === '#') {
      while (i < tekst.length && tekst[i] !== '\n' && tekst[i] !== '\r') { uit += ' '; i++; }
      i--;
    } else {
      if (c === '"' || c === "'") aanhaling = c;
      uit += c;
    }
  }
  return uit;
}

function mappen(map) {
  return readdirSync(map).filter((naam) => statSync(join(map, naam)).isDirectory()).sort();
}

const gezienId = new Map();
const gezienLegacyId = new Map();
let aantalScripts = 0;

if (existsSync(scriptsMap) && statSync(scriptsMap).isDirectory()) {
  for (const onderwerp of mappen(scriptsMap)) {
    for (const mapNaam of mappen(join(scriptsMap, onderwerp))) {
      aantalScripts++;
      controleerScript(join(scriptsMap, onderwerp, mapNaam), onderwerp, mapNaam);
    }
  }
}

function controleerScript(map, onderwerp, mapNaam) {
  const metaPad = join(map, 'meta.json');
  const psPad = join(map, 'script.ps1');

  // script.ps1: aanwezig en gelezen (voor regelnummers en waarschuwingen)
  let code = null;
  if (existsSync(psPad)) code = readFileSync(psPad, 'utf8');
  else fout(psPad, 'script.ps1 ontbreekt');

  if (!existsSync(metaPad)) { fout(metaPad, 'meta.json ontbreekt'); return; }

  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPad, 'utf8'));
  } catch (e) {
    fout(metaPad, `JSON is ongeldig: ${e.message}`);
    return;
  }

  // Schema: elke overtreding krijgt een eigen regel. De "if"-melding is ruis, die slaan we over.
  if (!valideer(meta)) {
    for (const e of valideer.errors) if (e.keyword !== 'if') fout(metaPad, schemaMelding(e));
  }
  if (meta === null || typeof meta !== 'object' || Array.isArray(meta)) return;

  // Mapnamen
  if (typeof meta.id === 'string' && meta.id !== mapNaam) {
    fout(metaPad, `mapnaam '${mapNaam}' wijkt af van id '${meta.id}'`);
  }
  if (typeof meta.topic === 'string' && meta.topic !== onderwerp) {
    fout(metaPad, `bovenliggende map '${onderwerp}' wijkt af van topic '${meta.topic}'`);
  }

  // Dubbele id's en legacyId's over alle scripts
  for (const [veld, gezien] of [['id', gezienId], ['legacyId', gezienLegacyId]]) {
    if (typeof meta[veld] !== 'string') continue;
    if (gezien.has(meta[veld])) fout(metaPad, `${veld} '${meta[veld]}' komt ook voor in ${pad(gezien.get(meta[veld]))}`);
    else gezien.set(meta[veld], metaPad);
  }

  // Vragen
  const regels = code === null ? null : aantalRegels(code);
  const vraagIds = new Set();
  const vragen = Array.isArray(meta.questions) ? meta.questions : [];
  vragen.forEach((v, i) => {
    if (v === null || typeof v !== 'object') return;
    const wie = `/questions/${i}${typeof v.id === 'string' ? ` (${v.id})` : ''}`;

    if (typeof v.id === 'string') {
      if (vraagIds.has(v.id)) fout(metaPad, `${wie} dubbel vraag-id '${v.id}'`);
      vraagIds.add(v.id);
    }

    if (Array.isArray(v.lines) && regels !== null) {
      for (const n of v.lines) {
        if (Number.isInteger(n) && n > regels) fout(metaPad, `${wie} regelnummer ${n} ligt buiten script.ps1 (${regels} regels)`);
      }
    }

    if (Array.isArray(v.options) && Number.isInteger(v.answer) && v.answer >= v.options.length) {
      fout(metaPad, `${wie} answer ${v.answer} is geen geldige index in options (0 t/m ${v.options.length - 1})`);
    }

    if ((v.type === 'mc' || v.type === 'bug') && !(Array.isArray(v.lines) && v.lines.length > 0)) {
      fout(metaPad, `${wie} vraag van type '${v.type}' heeft geen lines`);
    }
  });

  if (code === null) return;

  // Waarschuwingen over de code
  const regelMetNietAscii = code.split(/\r?\n/).findIndex((r) => /[^\x00-\x7F]/.test(r));
  if (regelMetNietAscii !== -1) {
    waarschuw(psPad, `bevat niet-ASCII-tekens (eerste op regel ${regelMetNietAscii + 1}); Windows PowerShell 5.1 leest UTF-8 zonder BOM als ANSI`);
  }
  if (meta.risk === 'read') {
    const gevonden = [...new Set(zonderCommentaarEnTekst(code).match(SCHRIJF_CMDLET) ?? [])];
    if (gevonden.length > 0) {
      waarschuw(psPad, `risk is 'read', maar het script bevat wijzigende cmdlets: ${gevonden.join(', ')}`);
    }
  }
}

// Uitvoer
if (aantalScripts === 0) {
  waarschuwingen.push(`WAARSCHUWING  ${pad(scriptsMap)}: geen scripts gevonden`);
}
for (const regel of fouten) console.error(regel);
for (const regel of waarschuwingen) console.log(regel);
console.log(`Samenvatting: ${aantalScripts} scripts, ${fouten.length} fouten, ${waarschuwingen.length} waarschuwingen`);
process.exit(fouten.length > 0 ? 1 : 0);
