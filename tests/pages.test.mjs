// Tests voor de HTML-pagina's en de paginamodules. Elke pagina (index.html in de root of in een
// map op het hoogste niveau) wordt automatisch meegenomen; een nieuwe pagina moet ook in PAGINAS
// van tools/smoke.mjs staan (CLAUDE.md). Zonder browser: de HTML wordt als tekst gecontroleerd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aantalTekst, bouwWoordenboek, telItems } from '../assets/js/woordenboek.js';
import { bouwKaarten, bouwStartInhoud, metaTekst, voortgangTekst } from '../assets/js/start.js';
import { laadMeta } from '../assets/js/data.js';
import { leegV2, registreerAntwoord } from '../assets/js/progress.js';
import { bouwIndex } from '../tools/build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Mappen op het hoogste niveau die geen pagina's zijn
const GEEN_PAGINA = new Set(['.git', '.github', 'node_modules', 'assets', 'data', 'schema', 'tests', 'tools', 'legacy', 'api', 'agent']);

// Alle pagina's als URL-pad: '/' voor index.html en '/<map>/' voor <map>/index.html
function vindPaginas() {
  const paden = [];
  if (existsSync(join(root, 'index.html'))) paden.push('/');
  for (const naam of readdirSync(root)) {
    if (GEEN_PAGINA.has(naam) || naam.startsWith('.')) continue;
    if (statSync(join(root, naam)).isDirectory() && existsSync(join(root, naam, 'index.html'))) paden.push(`/${naam}/`);
  }
  return paden.sort();
}

const paginas = vindPaginas();
const bestandVan = (pad) => join(root, pad === '/' ? '' : pad.slice(1), 'index.html');

test('er is minstens een pagina en elke pagina staat in PAGINAS van tools/smoke.mjs', () => {
  assert.ok(paginas.length >= 1);
  const smoke = readFileSync(join(root, 'tools', 'smoke.mjs'), 'utf8');
  const lijst = /const PAGINAS = \[([^\]]*)\]/.exec(smoke)[1];
  for (const pad of paginas) assert.ok(lijst.includes(`'${pad}'`), `${pad} ontbreekt in PAGINAS van tools/smoke.mjs`);
});

for (const pad of paginas) {
  const html = readFileSync(bestandVan(pad), 'utf8');

  test(`${pad}: taal, viewport, titel, skiplink, themaknop en navigatie`, () => {
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="nl">/);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<a class="skip" href="#inhoud">/);
    assert.match(html, /<main id="inhoud"/);
    assert.match(html, /id="thema-knop"/);
    assert.match(html, /<nav class="nav" aria-label="Hoofdmenu">/);
  });

  test(`${pad}: strikte CSP, geen inline scripts, stijlen of event-handlers`, () => {
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
    assert.ok(csp, 'CSP-meta ontbreekt');
    assert.match(csp[1], /default-src 'self'/);
    assert.match(csp[1], /script-src 'self'(;|$)/);
    assert.doesNotMatch(csp[1], /unsafe-inline|unsafe-eval/);
    assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'CSP moet voor het eerste script staan');
    for (const script of html.matchAll(/<script\b[^>]*>/g)) assert.match(script[0], /\bsrc="\//, `inline script: ${script[0]}`);
    assert.doesNotMatch(html, /\sstyle=/);
    assert.doesNotMatch(html, /\son[a-z]+=/i);
    assert.doesNotMatch(html, /javascript:/i);
    assert.doesNotMatch(html, /<(iframe|object|embed)\b/i);
  });

  test(`${pad}: theme-init staat in <head> voor de stijl, en alle verwijzingen vanaf de root bestaan`, () => {
    const kop = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    assert.ok(kop.includes('src="/assets/js/theme-init.js"'));
    assert.ok(kop.indexOf('theme-init.js') < kop.indexOf('app.css'), 'theme-init moet voor de stijl laden');
    const verwijzingen = [...html.matchAll(/(?:src="|<link[^>]*?href=")(\/(?!\/)[^"]*)"/g)].map((m) => m[1]);
    assert.ok(verwijzingen.length >= 3);
    for (const v of verwijzingen) assert.ok(existsSync(join(root, v.slice(1))), `${v} bestaat niet`);
  });

  test(`${pad}: id's zijn uniek en de navigatie wijst de eigen pagina aan`, () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, `dubbele id's: ${ids.join(', ')}`);
    assert.match(html, new RegExp(`<a href="${pad}" aria-current="page">`));
  });
}

// --- Woordenboekmodule met een nepdocument ---

function nepDocument() {
  const maak = (tag) => ({
    tag, className: '', textContent: '', kinderen: [], attributen: {},
    append(...k) { this.kinderen.push(...k); },
    setAttribute(naam, waarde) { this.attributen[naam] = waarde; }
  });
  return {
    createDocumentFragment: () => maak('#fragment'),
    createTextNode: (t) => ({ tag: '#tekst', textContent: t }),
    createElement: (tag) => maak(tag)
  };
}
const alle = (knoop) => [knoop, ...(knoop.kinderen ?? []).flatMap(alle)];

const groepen = [
  { id: 'a', name: 'Pipeline', items: [
    { term: 'Where-Object', explanation: 'Filtert <b>objecten</b>.', example: 'Get-Process | Where-Object { $_.CPU -gt 100 }', risk: 'read' },
    { term: 'Remove-', explanation: 'Verwijdert.', example: 'Remove-MgDevice -WhatIf', risk: 'write' },
    { term: 'Connect-', explanation: 'Verbindt.', example: 'Connect-MgGraph', risk: 'neutral' }
  ] }
];

test('woordenboek: groepen, kaarten en labels (alleen leest en wijzigt)', () => {
  const fragment = bouwWoordenboek(groepen, nepDocument());
  const knopen = alle(fragment);
  assert.equal(knopen.filter((k) => k.className === 'entry').length, 3);
  assert.deepEqual(knopen.filter((k) => k.tag === 'h2').map((k) => k.textContent), ['Pipeline']);
  assert.deepEqual(knopen.filter((k) => String(k.className).startsWith('risk')).map((k) => `${k.className}:${k.textContent}`),
    ['risk read:leest', 'risk write:wijzigt']);
  assert.deepEqual(knopen.filter((k) => k.className === 'name').map((k) => k.textContent), ['Where-Object', 'Remove-', 'Connect-']);
});

test('woordenboek: HTML in de uitleg blijft tekst en het voorbeeld wordt gekleurd', () => {
  const knopen = alle(bouwWoordenboek(groepen, nepDocument()));
  const tags = new Set(knopen.map((k) => k.tag));
  assert.ok(!tags.has('b') && !tags.has('script') && !tags.has('img'));
  assert.ok(knopen.some((k) => k.tag === 'div' && k.textContent === 'Filtert <b>objecten</b>.'), 'uitleg staat letterlijk als tekst in een div');
  assert.ok(knopen.some((k) => k.className === 't-cmd' && k.textContent === 'Where-Object'));
  assert.ok(knopen.some((k) => k.className === 't-par' && k.textContent === '-gt'));
});

test('woordenboek: telItems en aantalTekst', () => {
  assert.equal(telItems(groepen), 3);
  assert.equal(telItems([]), 0);
  assert.match(aantalTekst(0, 'zzz'), /^Niets gevonden/);
  assert.equal(aantalTekst(1, 'where'), '1 resultaat');
  assert.equal(aantalTekst(5, 'o'), '5 resultaten');
  assert.equal(aantalTekst(40, ''), '40 begrippen');
});

// --- Aanvullingen na de review ---

test('woordenboek-pagina: koppen h1 en h2, live-regio voor de melding, zoekveld met label en maxlength', () => {
  const html = readFileSync(join(root, 'woordenboek', 'index.html'), 'utf8');
  assert.match(html, /<h1>/);
  assert.match(html, /<p id="aantal" class="empty" aria-live="polite">/);
  assert.match(html, /<label class="visually-hidden" for="zoek">/);
  assert.match(html, /<input id="zoek" type="search" maxlength="100"/);
  assert.match(html, /id="thema-knop">Donker thema<\/button>/, 'dezelfde tekst als theme.js zet, dus geen flits');
});

test('woordenboek: er blijft niets in de kaartenlijst staan bij 0 treffers (de melding staat in de live-regio)', () => {
  const leeg = bouwWoordenboek([], nepDocument());
  assert.equal(alle(leeg).length, 1, 'alleen het lege fragment');
});

// --- Startpagina ---

// Nepopslag met getItem en setItem (localStorage-vervanger)
function nepOpslagPagina(begin = {}) {
  const map = new Map(Object.entries(begin));
  return { map, getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, w) => { map.set(k, String(w)); } };
}

const echteIndex = () => {
  const { index, fouten } = bouwIndex({ scriptsMap: join(root, 'data', 'scripts'), topicsBestand: join(root, 'data', 'topics.json') });
  assert.deepEqual(fouten, []);
  return index;
};

test('start: metaTekst en voortgangTekst', () => {
  const scripts = [
    { level: 'basis', check: { status: 'gecontroleerd' } },
    { level: 'gevorderd', check: { status: 'nog_te_controleren' } },
    { level: 'gevorderd', check: { status: 'nog_te_controleren' } }
  ];
  assert.equal(metaTekst(scripts), '3 scripts \u00b7 1 basis, 2 gevorderd \u00b7 2 nog te controleren');
  assert.equal(metaTekst(scripts.slice(0, 1)), '1 script \u00b7 1 basis');
  assert.equal(voortgangTekst({ beantwoord: 3, goed: 2, totaal: 7 }), '3 van 7 beantwoord \u00b7 2 goed bij eerste poging');
  assert.equal(voortgangTekst({ beantwoord: 0, goed: 0, totaal: 0 }), '');
});

// Een kleine eigen index, zodat de tests niet breken als er onderwerpen of scripts bijkomen.
const testIndex = () => ({
  topics: [
    { id: 'eerste', name: 'Eerste', summary: 'Samenvatting een.', order: 1, status: 'live' },
    { id: 'leeg', name: 'Leeg', summary: 'Nog niets.', order: 2, status: 'in-opbouw' },
    { id: 'tweede', name: 'Tweede', summary: 'Samenvatting twee.', order: 3, status: 'live' }
  ],
  scripts: [
    { id: 'a-basis', legacyId: 'old', topic: 'eerste', level: 'basis', counts: { mc: 2, bug: 0, open: 1 }, check: { status: 'gecontroleerd' }, path: 'data/scripts/eerste/a-basis' },
    { id: 'a-gev', topic: 'eerste', level: 'gevorderd', counts: { mc: 1, bug: 1, open: 0 }, check: { status: 'nog_te_controleren' }, path: 'data/scripts/eerste/a-gev' },
    { id: 'b-basis', topic: 'tweede', level: 'basis', counts: { mc: 3, bug: 0, open: 0 }, check: { status: 'gecontroleerd' }, path: 'data/scripts/tweede/b-basis' }
  ]
});
const kaartenVan = (knoop) => alle(knoop).filter((k) => k.tag === 'li').map((li) => li.kinderen[0]);
const kaartNaam = (kaart) => kaart.kinderen.find((k) => k.className === 'kaartnaam').textContent;

test('start: kaarten in indexvolgorde; onderwerpen met scripts zijn links naar het eerste script, lege zijn "nog in opbouw"', () => {
  const lijst = bouwKaarten(testIndex(), leegV2(), nepDocument());
  assert.equal(lijst.attributen.role, 'list');
  const kaarten = kaartenVan(lijst);
  assert.deepEqual(kaarten.map(kaartNaam), ['Eerste', 'Leeg', 'Tweede']);

  assert.equal(kaarten[0].tag, 'a');
  assert.equal(kaarten[0].attributen.href, '/oefenen/?script=a-basis&topic=eerste', 'het eerste script is het basisscript');
  assert.equal(kaarten[2].attributen.href, '/oefenen/?script=b-basis&topic=tweede');

  assert.equal(kaarten[1].tag, 'div');
  assert.equal(kaarten[1].className, 'kaart in-opbouw');
  assert.equal(kaarten[1].attributen.href, undefined);
  assert.equal(kaarten[1].attributen['aria-labelledby'], undefined);
  assert.ok(kaarten[1].kinderen.some((k) => k.className === 'badge' && k.textContent === 'Nog in opbouw'));
});

test('start: de linknaam is de kop, de rest is de beschrijving, en die id-s bestaan op de kaart', () => {
  const [kaart] = kaartenVan(bouwKaarten(testIndex(), leegV2(), nepDocument()));
  const ids = new Set(alle(kaart).map((k) => k.id).filter(Boolean));
  assert.equal(kaart.attributen['aria-labelledby'], 'kaart-eerste-naam');
  assert.ok(ids.has('kaart-eerste-naam'));
  const beschrijving = kaart.attributen['aria-describedby'].split(' ');
  assert.deepEqual(beschrijving, ['kaart-eerste-tekst', 'kaart-eerste-meta', 'kaart-eerste-voortgang']);
  for (const id of beschrijving) assert.ok(ids.has(id), `${id} ontbreekt op de kaart`);
});

test('start: meta en voortgang per onderwerp (open vragen tellen niet mee, ander onderwerp telt niet mee)', () => {
  let state = leegV2();
  state = registreerAntwoord(state, 'a-basis', 'q1', 1, true);
  state = registreerAntwoord(state, 'a-gev', 'q1', 0, false);
  state = registreerAntwoord(state, 'b-basis', 'q1', 1, true);
  const kaarten = kaartenVan(bouwKaarten(testIndex(), state, nepDocument()));
  const tekst = (kaart, klasse) => kaart.kinderen.find((k) => k.className === klasse)?.textContent;
  assert.equal(tekst(kaarten[0], 'kaartmeta'), '2 scripts · 1 basis, 1 gevorderd · 1 nog te controleren');
  assert.equal(tekst(kaarten[0], 'kaartvoortgang'), '2 van 4 beantwoord · 1 goed bij eerste poging');
  assert.equal(tekst(kaarten[2], 'kaartvoortgang'), '1 van 3 beantwoord · 1 goed bij eerste poging');
  assert.equal(tekst(kaarten[1], 'kaartvoortgang'), undefined);
});

test('start: status en scripts moeten kloppen voor een link (live zonder scripts of in-opbouw met scripts is geen link)', () => {
  const index = testIndex();
  index.topics[1].status = 'live'; // live, maar zonder scripts
  index.topics[2].status = 'in-opbouw'; // wel scripts, maar nog in opbouw
  const kaarten = kaartenVan(bouwKaarten(index, leegV2(), nepDocument()));
  assert.deepEqual(kaarten.map((k) => k.tag), ['a', 'div', 'div']);
});

test('start: een vreemd id of onderwerp geeft nooit een gevaarlijke href', () => {
  const index = {
    topics: [{ id: 'x"><y', name: 'N', summary: 'S', order: 1, status: 'live' }],
    scripts: [{ id: 'javascript:alert(1)', topic: 'x"><y', level: 'basis', counts: { mc: 1, bug: 0, open: 0 }, check: { status: 'gecontroleerd' } }]
  };
  const [kaart] = kaartenVan(bouwKaarten(index, leegV2(), nepDocument()));
  assert.ok(kaart.attributen.href.startsWith('/oefenen/?script='), kaart.attributen.href);
  assert.doesNotMatch(kaart.attributen.href, /["<>\s]|javascript:/);
});

test('start: een indexentry zonder check blijft werken (telt als nog te controleren)', () => {
  assert.equal(metaTekst([{ level: 'basis' }]), '1 script · 1 basis · 1 nog te controleren');
});

test('start: bouwStartInhoud toont een melding met role=alert als de index niet te laden is', async () => {
  const gemeld = [];
  const inhoud = await bouwStartInhoud({
    opslag: nepOpslagPagina(), haalIndex: async () => { throw new Error('netwerk'); }, haalMeta: async () => ({}), doc: nepDocument(), meld: (f) => gemeld.push(f.message)
  });
  assert.equal(inhoud.className, 'fout');
  assert.equal(inhoud.attributen.role, 'alert');
  assert.deepEqual(gemeld, ['netwerk']);
});

test('start: bouwStartInhoud neemt eerst v1 over en leest daarna pas de voortgang', async () => {
  const opslag = nepOpslagPagina({ 'ps-leestrainer-v1': JSON.stringify({ 'old:0': { first: 1 } }) });
  const haalMeta = async () => ({ questions: [{ type: 'mc', answer: 1, options: ['a', 'b'] }, { type: 'mc', answer: 0, options: ['a', 'b'] }, { type: 'open' }] });
  const inhoud = await bouwStartInhoud({ opslag, haalIndex: async () => testIndex(), haalMeta, doc: nepDocument() });
  const [kaart] = kaartenVan(inhoud);
  assert.equal(kaart.kinderen.find((k) => k.className === 'kaartvoortgang').textContent, '1 van 4 beantwoord · 1 goed bij eerste poging');
  assert.ok(opslag.map.has('ps-trainer-v2'));
});

test('start: bouwStartInhoud werkt zonder opslag (null) en bij een mislukte v1-overname', async () => {
  const zonder = await bouwStartInhoud({ opslag: null, haalIndex: async () => testIndex(), haalMeta: async () => ({}), doc: nepDocument() });
  assert.equal(kaartenVan(zonder).length, 3);

  const gemeld = [];
  const opslag = nepOpslagPagina({ 'ps-leestrainer-v1': JSON.stringify({ 'old:0': { first: 1 } }) });
  const mislukt = await bouwStartInhoud({
    opslag, haalIndex: async () => testIndex(), haalMeta: async () => { throw new Error('meta weg'); }, doc: nepDocument(), meld: (f) => gemeld.push(f.message)
  });
  assert.equal(kaartenVan(mislukt).length, 3, 'de pagina werkt gewoon door');
  assert.deepEqual(gemeld, ['meta weg']);
  assert.equal(opslag.map.has('ps-trainer-v2'), false, 'er is niets bewaard, dus de overname wordt later opnieuw geprobeerd');
});

test('start: een kapotte indexentry (geen counts) geeft een melding in plaats van een lege pagina', async () => {
  const kapot = testIndex();
  delete kapot.scripts[0].counts;
  const gemeld = [];
  const inhoud = await bouwStartInhoud({ opslag: null, haalIndex: async () => kapot, haalMeta: async () => ({}), doc: nepDocument(), meld: (f) => gemeld.push(f) });
  assert.equal(inhoud.attributen.role, 'alert');
  assert.equal(gemeld.length, 1);
});

test('start: met de echte index maakt bouwKaarten een kaart per onderwerp zonder fout', () => {
  const index = echteIndex();
  const kaarten = kaartenVan(bouwKaarten(index, leegV2(), nepDocument()));
  assert.equal(kaarten.length, index.topics.length);
  for (const kaart of kaarten) assert.ok(kaart.tag === 'a' || kaart.className === 'kaart in-opbouw');
});

test('start: HTML in de data wordt tekst en nooit een element', () => {
  const index = {
    topics: [{ id: 't', name: '<img src=x onerror=alert(1)>', summary: '<script>x</script>', order: 1, status: 'live' }],
    scripts: [{ id: 's', topic: 't', level: 'basis', counts: { mc: 1, bug: 0, open: 0 }, check: { status: 'gecontroleerd' } }]
  };
  const knopen = alle(bouwKaarten(index, leegV2(), nepDocument()));
  assert.deepEqual([...new Set(knopen.map((k) => k.tag))].sort(), ['a', 'h3', 'li', 'p', 'ul']);
  assert.ok(knopen.some((k) => k.textContent === '<img src=x onerror=alert(1)>'));
});

test('data: laadMeta gebruikt hetzelfde gevalideerde pad als laadScript', async () => {
  const haal = async (url) => ({ ok: true, json: async () => ({ url }) });
  assert.deepEqual(await laadMeta({ path: 'data/scripts/entra-id/x' }, haal), { url: '/data/scripts/entra-id/x/meta.json' });
  await assert.rejects(laadMeta({ path: '../x' }, haal), /Ongeldig scriptpad/);
});
