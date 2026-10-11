// Tests voor de HTML-pagina's en de paginamodules. Elke pagina (index.html in de root of in een
// map op het hoogste niveau) wordt automatisch meegenomen; een nieuwe pagina moet ook in PAGINAS
// van tools/smoke.mjs staan (CLAUDE.md). Zonder browser: de HTML wordt als tekst gecontroleerd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aantalTekst, bouwWoordenboek, telItems } from '../assets/js/woordenboek.js';

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
    if (pad !== '/') assert.match(html, new RegExp(`<a href="${pad}" aria-current="page">`));
  });
}

// --- Woordenboekmodule met een nepdocument ---

function nepDocument() {
  const maak = (tag) => ({ tag, className: '', textContent: '', kinderen: [], append(...k) { this.kinderen.push(...k); } });
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
