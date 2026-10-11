// Gegevens ophalen en filteren voor alle pagina's. De hulpfuncties zijn zuiver (geen DOM), zodat ze
// met node:test te testen zijn; de fetch-functies krijgen fetch als parameter mee.

export const NIVEAUS = ['basis', 'gevorderd', 'expert'];
export const VRAAGTYPES = ['mc', 'bug', 'open'];

export const NIVEAU_LABELS = { basis: 'Basis', gevorderd: 'Gevorderd', expert: 'Expert' };
export const TYPE_LABELS = { mc: 'Meerkeuze', bug: 'Zoek de fout', open: 'Zelf formuleren' };
export const STAP_LABELS = { parameters: 'Parameters', bron: 'Bron', bewerking: 'Bewerking', wijziging: 'Wijziging', uitvoer: 'Uitvoer' };
// Label bij een script (risk uit meta.json) en bij een woordenboekitem
export const SCRIPT_RISICO_LABELS = { read: 'alleen lezen', write: 'wijzigt' };
export const WOORDENBOEK_RISICO_LABELS = { read: 'leest', write: 'wijzigt', neutral: '' };

// --- URL-parameters ---

// Leest de parameters van een pagina en geeft alleen geldige waarden terug (anders null of '').
//   ?script=<id>  vast voor de PS Coach; verder optioneel: &topic=, &level=, &type= (werkbank) en ?q= (woordenboek)
export function leesParams(zoektekst, { topics = [] } = {}) {
  const p = new URLSearchParams(zoektekst);
  const script = p.get('script');
  const topic = p.get('topic');
  const level = p.get('level');
  const type = p.get('type');
  return {
    script: script && /^[a-z0-9-]+$/.test(script) ? script : null,
    topic: topic && topics.includes(topic) ? topic : null,
    level: NIVEAUS.includes(level) ? level : null,
    type: VRAAGTYPES.includes(type) ? type : null,
    q: (p.get('q') ?? '').slice(0, 100)
  };
}

// Bouwt de werkbank-URL. ?script= blijft altijd eerst staan (vaste URL voor de PS Coach).
export function werkbankUrl(scriptId, { topic = null, level = null, type = null } = {}) {
  const p = new URLSearchParams({ script: scriptId });
  if (topic) p.set('topic', topic);
  if (level) p.set('level', level);
  if (type) p.set('type', type);
  return `/oefenen/?${p}`;
}

// --- Filteren ---

// Scripts voor de chips bovenin: onderwerp en niveau (ontbrekend filter = alles).
export function filterScripts(scripts, { topic = null, level = null } = {}) {
  return scripts.filter((s) => (!topic || s.topic === topic) && (!level || s.level === level));
}

// Het standaardscript uit een lijst: het laagste niveau eerst, en bij gelijk niveau eerst een script dat
// gecontroleerd is (zodat een nieuwe bezoeker niet begint met iets dat nog niet is nagelopen). Bij gelijke
// score blijft de volgorde van de index (onderwerp, niveau, id).
export function standaardScript(scripts) {
  const niveau = (s) => (NIVEAUS.includes(s.level) ? NIVEAUS.indexOf(s.level) : NIVEAUS.length);
  const gecontroleerd = (s) => (s.check?.status === 'gecontroleerd' ? 0 : 1);
  let beste = null;
  for (const s of scripts) {
    if (!beste || niveau(s) < niveau(beste) || (niveau(s) === niveau(beste) && gecontroleerd(s) < gecontroleerd(beste))) beste = s;
  }
  return beste;
}

// Welk script opent de werkbank? Een bestaand ?script= wint; anders het standaardscript, eerst binnen de
// filters, dan overal.
export function kiesScript(scripts, gewenstId, filters = {}) {
  const gevraagd = gewenstId && scripts.find((s) => s.id === gewenstId);
  return gevraagd ?? standaardScript(filterScripts(scripts, filters)) ?? standaardScript(scripts) ?? null;
}

// Vragen binnen een script volgens "soort vraag" (ontbrekend filter = alle vragen).
export function filterVragen(vragen, type = null) {
  return type ? vragen.filter((v) => v.type === type) : vragen;
}

// --- Weergave-hulpjes ---

// "regel 2" of "regel 8–12" (eerste tot laatste); null als de vraag geen regels heeft.
export function regelLabel(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return null;
  const eerste = Math.min(...lines);
  const laatste = Math.max(...lines);
  return eerste === laatste ? `regel ${eerste}` : `regel ${eerste}–${laatste}`;
}

// De regels van een script, op dezelfde manier geteld als in tools/validate.mjs:
// een regeleinde aan het slot telt niet mee, CRLF en LF zijn gelijk.
export function scriptRegels(code) {
  if (code === '') return [];
  return code.replace(/\r?\n$/, '').split(/\r?\n/);
}

// --- Ophalen (alles vanaf de root van de site) ---

export async function haalJson(url, haal = globalThis.fetch) {
  const antwoord = await haal(url);
  if (!antwoord.ok) throw new Error(`${url} laden mislukt (HTTP ${antwoord.status})`);
  return antwoord.json();
}

export async function haalTekst(url, haal = globalThis.fetch) {
  const antwoord = await haal(url);
  if (!antwoord.ok) throw new Error(`${url} laden mislukt (HTTP ${antwoord.status})`);
  return antwoord.text();
}

// data/index.json: { generated, topics, scripts }
export function laadIndex(haal) {
  return haalJson('/data/index.json', haal);
}

// Een scriptpad uit de index heeft altijd de vorm data/scripts/<onderwerp>/<id>; al het andere weigeren we.
const SCRIPTPAD = /^data\/scripts\/[a-z0-9-]+\/[a-z0-9-]+$/;

function controleerPad(entry) {
  if (typeof entry?.path !== 'string' || !SCRIPTPAD.test(entry.path)) throw new Error('Ongeldig scriptpad in de index');
  return entry.path;
}

// Alleen het meta.json (met de vragen) van een script uit de index
export async function laadMeta(entry, haal) {
  return haalJson(`/${controleerPad(entry)}/meta.json`, haal);
}

// meta.json (met vragen) en script.ps1 van een script uit de index
export async function laadScript(entry, haal) {
  const pad = controleerPad(entry);
  const [meta, code] = await Promise.all([haalJson(`/${pad}/meta.json`, haal), haalTekst(`/${pad}/script.ps1`, haal)]);
  return { meta, code };
}

// data/dictionary.json: lijst groepen met items
export function laadWoordenboek(haal) {
  return haalJson('/data/dictionary.json', haal);
}

// Zoekt in het woordenboek (hoofdletterongevoelig in term, uitleg en voorbeeld, zoals in v1).
// Groepen zonder treffers vallen weg.
export function zoekWoordenboek(groepen, zoek) {
  const f = zoek.toLowerCase().trim();
  if (!f) return groepen;
  return groepen
    .map((g) => ({ ...g, items: g.items.filter((it) => `${it.term} ${it.explanation} ${it.example}`.toLowerCase().includes(f)) }))
    .filter((g) => g.items.length > 0);
}
