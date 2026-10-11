// Tests voor de gedeelde webmodules in assets/js (zonder browser): markdown-lite, highlight, data,
// progress (opslag en v1-overname) en theme. Een nepdocument en nepopslag vervangen DOM en localStorage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdownLite, renderMarkdownLite } from '../assets/js/markdown-lite.js';
import { tokenizeLine, renderLine } from '../assets/js/highlight.js';
import {
  filterScripts, filterVragen, haalJson, kiesScript, laadScript, leesParams, regelLabel,
  scriptRegels, werkbankUrl, zoekWoordenboek
} from '../assets/js/data.js';
import {
  ONBEKENDE_TIJD, V1_SLEUTEL, V2_SLEUTEL, bewaarState, leegV2, leesState, leesV1, moetV1Overnemen,
  migreerV1, neemV1OverIndien, registreerAntwoord, registreerOpenGetoond, voortgangOnderwerp, voortgangScript, wisScript
} from '../assets/js/progress.js';
import { THEMA_SLEUTEL, effectiefThema, geldigThema, initThema, omgekeerdThema } from '../assets/js/theme.js';
import { bouwIndex } from '../tools/build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Nepdocument en nepopslag ---

function nepDocument() {
  const maakFragment = () => ({ soort: 'fragment', kinderen: [], append(...k) { this.kinderen.push(...k); } });
  return {
    createDocumentFragment: maakFragment,
    createTextNode: (tekst) => ({ soort: 'tekst', textContent: tekst }),
    createElement: (tag) => ({ soort: 'element', tag, className: '', textContent: '' })
  };
}

function nepOpslag(begin = {}, { zetFout = false, leesFout = false } = {}) {
  const map = new Map(Object.entries(begin));
  return {
    map,
    getItem: (k) => { if (leesFout) throw new Error('geen toegang'); return map.has(k) ? map.get(k) : null; },
    setItem: (k, w) => { if (zetFout) throw new Error('vol'); map.set(k, String(w)); }
  };
}

// --- markdown-lite ---

test('markdown-lite: code en vet worden herkend, de rest blijft tekst', () => {
  assert.deepEqual(parseMarkdownLite('Gebruik `-WhatIf` en **let op** dit.'), [
    { type: 'text', text: 'Gebruik ' }, { type: 'code', text: '-WhatIf' },
    { type: 'text', text: ' en ' }, { type: 'bold', text: 'let op' }, { type: 'text', text: ' dit.' }
  ]);
});

test('markdown-lite: onafgesloten of lege markers blijven gewone tekst, code blijft letterlijk', () => {
  assert.deepEqual(parseMarkdownLite('een ` los'), [{ type: 'text', text: 'een ` los' }]);
  assert.deepEqual(parseMarkdownLite('**open'), [{ type: 'text', text: '**open' }]);
  assert.deepEqual(parseMarkdownLite('leeg `` en ****'), [{ type: 'text', text: 'leeg `` en ****' }]);
  assert.deepEqual(parseMarkdownLite('`a **b** c`'), [{ type: 'code', text: 'a **b** c' }]);
  assert.deepEqual(parseMarkdownLite(''), []);
});

test('markdown-lite: HTML in de tekst wordt nooit een element', () => {
  const fragment = renderMarkdownLite('<img src=x onerror=alert(1)> en `<b>` en **<i>**', nepDocument());
  const tags = fragment.kinderen.filter((k) => k.soort === 'element').map((k) => k.tag);
  assert.deepEqual(tags, ['code', 'strong']);
  assert.equal(fragment.kinderen[0].soort, 'tekst');
  assert.equal(fragment.kinderen[0].textContent, '<img src=x onerror=alert(1)> en ');
  assert.equal(fragment.kinderen[1].textContent, '<b>');
  assert.equal(fragment.kinderen[1].className, 'i');
});

// --- highlight ---

test('highlight: commentaar, tekst, variabelen, cmdlets en parameters', () => {
  const soorten = (regel) => tokenizeLine(regel).filter((d) => d.type !== 'text').map((d) => `${d.type}:${d.text}`);
  assert.deepEqual(soorten('Connect-MgGraph -Scopes "User.Read.All" # klaar'),
    ['cmd:Connect-MgGraph', 'par:-Scopes', 'str:"User.Read.All"', 'com:# klaar']);
  assert.deepEqual(soorten("$grens = (Get-Date).AddDays(-90)"), ['var:$grens', 'cmd:Get-Date']);
  assert.deepEqual(soorten('Where-Object { $_.AccountEnabled }'), ['cmd:Where-Object', 'var:$_']);
  assert.deepEqual(tokenizeLine(''), []);
});

test('highlight: de delen vormen samen altijd weer de oorspronkelijke regel (alle oefenscripts)', () => {
  const regels = [];
  for (const pad of [
    'entra-id/entra-inactieve-gebruikers', 'entra-id/entra-oude-apparaten',
    'sharepoint/sharepoint-site-inventaris', 'migraties/migraties-sharegate-bibliotheken'
  ]) {
    regels.push(...scriptRegels(readFileSync(join(root, 'data', 'scripts', pad, 'script.ps1'), 'utf8')));
  }
  assert.ok(regels.length > 50);
  for (const regel of regels) assert.equal(tokenizeLine(regel).map((d) => d.text).join(''), regel);
});

test('highlight: scripttekst met HTML wordt tekst in een span, nooit een element', () => {
  const fragment = renderLine("Write-Output '<script>alert(1)</script>'", nepDocument());
  const elementen = fragment.kinderen.filter((k) => k.soort === 'element');
  assert.deepEqual(elementen.map((e) => e.tag), ['span', 'span']);
  assert.equal(elementen[1].textContent, "'<script>alert(1)</script>'");
  assert.equal(elementen[1].className, 't-str');
});

// --- data ---

const scripts = [
  { id: 'a-basis', topic: 'migraties', level: 'basis' },
  { id: 'b-gevorderd', topic: 'sharepoint', level: 'gevorderd' },
  { id: 'c-basis', topic: 'sharepoint', level: 'basis' }
];

test('data: leesParams geeft alleen geldige waarden terug', () => {
  const topics = ['migraties', 'sharepoint'];
  assert.deepEqual(leesParams('?script=entra-x&topic=sharepoint&level=basis&type=bug&q=Where', { topics }),
    { script: 'entra-x', topic: 'sharepoint', level: 'basis', type: 'bug', q: 'Where' });
  assert.deepEqual(leesParams('?script=../etc&topic=nep&level=hoog&type=x', { topics }),
    { script: null, topic: null, level: null, type: null, q: '' });
  assert.equal(leesParams('?q=' + 'x'.repeat(500)).q.length, 100);
  assert.equal(leesParams('').script, null);
});

test('data: werkbankUrl houdt ?script= vooraan en voegt filters optioneel toe', () => {
  assert.equal(werkbankUrl('entra-x'), '/oefenen/?script=entra-x');
  assert.equal(werkbankUrl('entra-x', { topic: 'entra-id', level: 'basis', type: 'mc' }), '/oefenen/?script=entra-x&topic=entra-id&level=basis&type=mc');
});

test('data: filters op scripts en vragen', () => {
  assert.deepEqual(filterScripts(scripts, { topic: 'sharepoint' }).map((s) => s.id), ['b-gevorderd', 'c-basis']);
  assert.deepEqual(filterScripts(scripts, { level: 'basis' }).map((s) => s.id), ['a-basis', 'c-basis']);
  assert.deepEqual(filterScripts(scripts, { topic: 'sharepoint', level: 'basis' }).map((s) => s.id), ['c-basis']);
  assert.equal(filterScripts(scripts, {}).length, 3);
  const vragen = [{ id: 'q1', type: 'mc' }, { id: 'q2', type: 'bug' }, { id: 'q3', type: 'open' }];
  assert.deepEqual(filterVragen(vragen, 'bug').map((v) => v.id), ['q2']);
  assert.equal(filterVragen(vragen, null).length, 3);
});

test('data: kiesScript neemt ?script= als dat bestaat, anders het eerste script (binnen de filters)', () => {
  assert.equal(kiesScript(scripts, 'b-gevorderd').id, 'b-gevorderd');
  assert.equal(kiesScript(scripts, null).id, 'a-basis');
  assert.equal(kiesScript(scripts, 'bestaat-niet').id, 'a-basis');
  assert.equal(kiesScript(scripts, null, { topic: 'sharepoint' }).id, 'b-gevorderd');
  assert.equal(kiesScript(scripts, null, { topic: 'foundry' }).id, 'a-basis');
  assert.equal(kiesScript([], null), null);
});

test('data: regelLabel en scriptRegels', () => {
  assert.equal(regelLabel([2]), 'regel 2');
  assert.equal(regelLabel([8, 9, 10, 11, 12]), 'regel 8–12');
  assert.equal(regelLabel([]), null);
  assert.equal(regelLabel(undefined), null);
  assert.deepEqual(scriptRegels('a\nb\n'), ['a', 'b']);
  assert.deepEqual(scriptRegels('a\r\nb\r\n'), ['a', 'b']);
  assert.deepEqual(scriptRegels(''), []);
});

test('data: haalJson en laadScript gebruiken de paden vanaf de root en melden fouten', async () => {
  const aangevraagd = [];
  const haal = async (url) => {
    aangevraagd.push(url);
    if (url.endsWith('kapot.json')) return { ok: false, status: 404 };
    return { ok: true, json: async () => ({ ok: true }), text: async () => 'Get-Date\n' };
  };
  assert.deepEqual(await haalJson('/data/x.json', haal), { ok: true });
  await assert.rejects(haalJson('/data/kapot.json', haal), /laden mislukt \(HTTP 404\)/);
  const { meta, code } = await laadScript({ path: 'data/scripts/entra-id/x' }, haal);
  assert.deepEqual(meta, { ok: true });
  assert.equal(code, 'Get-Date\n');
  assert.ok(aangevraagd.includes('/data/scripts/entra-id/x/meta.json'));
  assert.ok(aangevraagd.includes('/data/scripts/entra-id/x/script.ps1'));
});

test('data: zoekWoordenboek zoekt in term, uitleg en voorbeeld en laat lege groepen weg', () => {
  const groepen = [
    { id: 'a', name: 'A', items: [{ term: 'Where-Object', explanation: 'Filtert.', example: 'x' }, { term: 'Sort-Object', explanation: 'Sorteert.', example: 'y' }] },
    { id: 'b', name: 'B', items: [{ term: 'Get-Help', explanation: 'Hulp.', example: 'Get-Help Where-Object' }] }
  ];
  assert.equal(zoekWoordenboek(groepen, '').length, 2);
  assert.deepEqual(zoekWoordenboek(groepen, 'where').map((g) => `${g.id}:${g.items.length}`), ['a:1', 'b:1']);
  assert.deepEqual(zoekWoordenboek(groepen, 'SORTEERT').map((g) => g.id), ['a']);
  assert.deepEqual(zoekWoordenboek(groepen, 'bestaat niet'), []);
});

// --- progress: opslag ---

test('progress: leesState en bewaarState, ook met kapotte of ontbrekende opslag', () => {
  assert.deepEqual(leesState(nepOpslag()), leegV2());
  assert.deepEqual(leesState(nepOpslag({ [V2_SLEUTEL]: '{ kapot' })), leegV2());
  assert.deepEqual(leesState(nepOpslag({ [V2_SLEUTEL]: JSON.stringify({ version: 1 }) })), leegV2());
  assert.deepEqual(leesState(nepOpslag({}, { leesFout: true })), leegV2());
  const opslag = nepOpslag();
  const state = registreerAntwoord(leegV2(), 's', 'q1', 1, true, '2026-10-11T12:00:00Z');
  assert.equal(bewaarState(opslag, state), true);
  assert.deepEqual(leesState(opslag), state);
  assert.equal(bewaarState(nepOpslag({}, { zetFout: true }), state), false);
});

test('progress: een deels gevulde bewaarde v2 wordt aangevuld', () => {
  const opslag = nepOpslag({ [V2_SLEUTEL]: JSON.stringify({ version: 2, answers: { 's:q1': { first: 0, correct: false, at: 'x' } } }) });
  const state = leesState(opslag);
  assert.deepEqual(state.open, {});
  assert.deepEqual(state.cards, {});
  assert.equal(state.answers['s:q1'].first, 0);
});

// --- progress: antwoorden en voortgang ---

test('progress: het eerste antwoord telt en de invoer wordt niet gewijzigd', () => {
  const begin = leegV2();
  const een = registreerAntwoord(begin, 's', 'q1', 2, false, 'tijd1');
  const twee = registreerAntwoord(een, 's', 'q1', 1, true, 'tijd2');
  assert.deepEqual(begin, leegV2());
  assert.deepEqual(twee.answers['s:q1'], { first: 2, correct: false, at: 'tijd1' });
  assert.equal(twee, een);
  assert.deepEqual(registreerOpenGetoond(begin, 's', 'q7').open['s:q7'], { shown: true });
});

test('progress: voortgang per script en onderwerp (open vragen tellen niet mee)', () => {
  let state = leegV2();
  state = registreerAntwoord(state, 'a', 'q1', 1, true);
  state = registreerAntwoord(state, 'a', 'q2', 0, false);
  state = registreerAntwoord(state, 'b', 'q1', 1, true);
  state = registreerOpenGetoond(state, 'a', 'q7');
  const lijst = [
    { id: 'a', topic: 't1', counts: { mc: 3, bug: 1, open: 1 } },
    { id: 'b', topic: 't1', counts: { mc: 2, bug: 0, open: 1 } },
    { id: 'c', topic: 't2', counts: { mc: 5, bug: 0, open: 0 } }
  ];
  assert.deepEqual(voortgangScript(state, lijst[0]), { beantwoord: 2, goed: 1, totaal: 4 });
  assert.deepEqual(voortgangOnderwerp(state, lijst, 't1'), { beantwoord: 3, goed: 2, totaal: 6 });
  assert.deepEqual(voortgangOnderwerp(state, lijst, 'leeg'), { beantwoord: 0, goed: 0, totaal: 0 });
});

test('progress: wisScript verwijdert alleen dat script, ook als een id met dezelfde letters begint', () => {
  let state = leegV2();
  state = registreerAntwoord(state, 'a', 'q1', 1, true);
  state = registreerAntwoord(state, 'a-b', 'q1', 1, true);
  state = registreerOpenGetoond(state, 'a', 'q7');
  const na = wisScript(state, 'a');
  assert.deepEqual(Object.keys(na.answers), ['a-b:q1']);
  assert.deepEqual(na.open, {});
});

// --- progress: overname van v1 met de echte data ---

test('progress: v1-voortgang wordt overgenomen met de echte scripts en daarna niet nog eens', async () => {
  const { index, fouten } = bouwIndex({ scriptsMap: join(root, 'data', 'scripts'), topicsBestand: join(root, 'data', 'topics.json') });
  assert.deepEqual(fouten, []);
  const laadMeta = async (entry) => JSON.parse(readFileSync(join(root, entry.path, 'meta.json'), 'utf8'));

  const v1 = { 'graph-users:0': { first: 1 }, 'graph-users:1': { first: 0 }, 'graph-users:6': { shown: true }, 'sharegate:2': { first: 1 } };
  const opslag = nepOpslag({ [V1_SLEUTEL]: JSON.stringify(v1) });
  assert.equal(moetV1Overnemen(opslag), true);

  const resultaat = await neemV1OverIndien(opslag, index, laadMeta);
  assert.equal(resultaat.overgenomen, 4);
  assert.equal(resultaat.overgeslagen, 0);

  const state = leesState(opslag);
  assert.deepEqual(state.answers['entra-inactieve-gebruikers:q1'], { first: 1, correct: true, at: ONBEKENDE_TIJD });
  assert.deepEqual(state.answers['entra-inactieve-gebruikers:q2'], { first: 0, correct: false, at: ONBEKENDE_TIJD });
  assert.deepEqual(state.open['entra-inactieve-gebruikers:q7'], { shown: true });
  assert.equal(state.answers['migraties-sharegate-bibliotheken:q3'].correct, true);
  assert.ok(opslag.map.has(V1_SLEUTEL), 'de v1-sleutel blijft staan');

  assert.equal(moetV1Overnemen(opslag), false);
  assert.equal(await neemV1OverIndien(opslag, index, laadMeta), null);
});

test('progress: geen v1-voortgang, kapotte v1 of mislukt opslaan geeft null en bewaart niets verkeerds', async () => {
  const index = { scripts: [{ id: 'x', legacyId: 'old', path: 'p' }] };
  const laadMeta = async () => ({ questions: [{ type: 'mc', answer: 0, options: ['a', 'b'] }] });
  assert.equal(await neemV1OverIndien(nepOpslag(), index, laadMeta), null);
  assert.equal(await neemV1OverIndien(nepOpslag({ [V1_SLEUTEL]: '{ kapot' }), index, laadMeta), null);
  assert.equal(leesV1(nepOpslag({ [V1_SLEUTEL]: '[1' })), null);
  const vol = nepOpslag({ [V1_SLEUTEL]: JSON.stringify({ 'old:0': { first: 1 } }) }, { zetFout: true });
  assert.equal(await neemV1OverIndien(vol, index, laadMeta), null);
  assert.equal(vol.map.has(V2_SLEUTEL), false);
  await assert.rejects(neemV1OverIndien(nepOpslag({ [V1_SLEUTEL]: JSON.stringify({ 'old:0': { first: 1 } }) }), index, async () => { throw new Error('netwerk'); }), /netwerk/);
});

// --- theme ---

test('theme: keuze, effectief thema en omkeren', () => {
  assert.equal(geldigThema('dark'), 'dark');
  assert.equal(geldigThema('light'), 'light');
  assert.equal(geldigThema('blauw'), null);
  assert.equal(geldigThema(null), null);
  assert.equal(effectiefThema('light', true), 'light');
  assert.equal(effectiefThema(undefined, true), 'dark');
  assert.equal(effectiefThema(null, false), 'light');
  assert.equal(omgekeerdThema('dark'), 'light');
  assert.equal(omgekeerdThema('light'), 'dark');
});

// --- Aanvullingen na de onafhankelijke review ---

test('highlight: ConvertTo-Json is een cmdlet, foo-bar en 90-dagen geen parameter, -Verbose aan het begin wel', () => {
  const soorten = (regel) => tokenizeLine(regel).filter((d) => d.type !== 'text').map((d) => `${d.type}:${d.text}`);
  assert.deepEqual(soorten('$x | ConvertTo-Json -Depth 3'), ['var:$x', 'cmd:ConvertTo-Json', 'par:-Depth']);
  assert.deepEqual(soorten('Get-Help Select-Object'), ['cmd:Get-Help', 'cmd:Select-Object']);
  assert.deepEqual(soorten('Write-Output foo-bar'), ['cmd:Write-Output']);
  assert.deepEqual(soorten('-Verbose'), ['par:-Verbose']);
  assert.deepEqual(soorten('(Get-Date).AddDays(-90)'), ['cmd:Get-Date']);
});

test('highlight: een # in een tekst is geen commentaar, een echte commentaarstaart wel', () => {
  const soorten = (regel) => tokenizeLine(regel).filter((d) => d.type !== 'text').map((d) => `${d.type}:${d.text}`);
  assert.deepEqual(soorten("Write-Output 'a # b' # echt commentaar"), ['cmd:Write-Output', "str:'a # b'", 'com:# echt commentaar']);
});

test('data: leesParams weigert hoofdletters en lege waarden voor script', () => {
  assert.equal(leesParams('?script=Entra-X').script, null);
  assert.equal(leesParams('?script=').script, null);
  assert.equal(leesParams('?script=a_b').script, null);
});

test('data: laadScript weigert een pad dat niet data/scripts/<onderwerp>/<id> is', async () => {
  const haal = async () => { throw new Error('mag niet worden aangeroepen'); };
  for (const path of ['../geheim', 'data/scripts/x', 'data/scripts/x/y/z', '/data/scripts/x/y', 'data/scripts/X/y', undefined]) {
    await assert.rejects(laadScript({ path }, haal), /Ongeldig scriptpad/);
  }
});

test('progress: leesState corrigeert onderdelen met een verkeerd type', () => {
  const kapot = { version: 2, answers: null, open: 5, retry: [1], cards: 'x', exams: {} };
  const state = leesState(nepOpslag({ [V2_SLEUTEL]: JSON.stringify(kapot) }));
  assert.deepEqual(state, leegV2());
  // en daarna werkt de rest zonder fout
  assert.doesNotThrow(() => registreerAntwoord(state, 's', 'q1', 0, false));
  assert.doesNotThrow(() => voortgangScript(state, { id: 's', counts: { mc: 1, bug: 0, open: 0 } }));
});

test('progress: sleutels als __proto__ en constructor in v1 doen niets', () => {
  const v1 = JSON.parse('{"__proto__:0":{"first":1},"constructor:0":{"first":1},"toString:0":{"first":1}}');
  const { state, overgenomen, overgeslagen } = migreerV1(v1, null, { 'graph-users': 'x' }, { x: [{ type: 'mc', answer: 1 }] });
  assert.equal(overgenomen, 0);
  assert.equal(overgeslagen, 3);
  assert.deepEqual(state, leegV2());
  assert.equal({}.first, undefined);
});

test('progress: voortgang komt nooit boven het totaal uit', () => {
  let state = leegV2();
  for (const q of ['q1', 'q2', 'q3', 'q9']) state = registreerAntwoord(state, 'a', q, 1, true);
  assert.deepEqual(voortgangScript(state, { id: 'a', counts: { mc: 2, bug: 1, open: 0 } }), { beantwoord: 3, goed: 3, totaal: 3 });
});

test('progress: een bestaande v2 wordt door neemV1OverIndien niet aangeraakt', async () => {
  const bestaand = JSON.stringify(registreerAntwoord(leegV2(), 'x', 'q1', 0, false, 'eigen-tijd'));
  const opslag = nepOpslag({ [V1_SLEUTEL]: JSON.stringify({ 'old:0': { first: 1 } }), [V2_SLEUTEL]: bestaand });
  const index = { scripts: [{ id: 'x', legacyId: 'old', path: 'p' }] };
  assert.equal(await neemV1OverIndien(opslag, index, async () => { throw new Error('mag niet worden opgehaald'); }), null);
  assert.equal(opslag.map.get(V2_SLEUTEL), bestaand);
});

// --- initThema met een nepdocument ---

function nepPagina({ opgeslagen = null, matchMedia = true, opslagFout = false, geenOpslag = false, donker = false } = {}) {
  const root = { dataset: {} };
  const attributen = {};
  let klik = null;
  const knop = {
    textContent: '',
    setAttribute: (naam, waarde) => { attributen[naam] = waarde; },
    addEventListener: (soort, f) => { if (soort === 'click') klik = f; }
  };
  const doc = { documentElement: root, getElementById: (id) => (id === 'thema-knop' ? knop : null) };
  const win = matchMedia ? { matchMedia: () => ({ matches: donker, addEventListener() {} }) } : {};
  const opslag = geenOpslag ? null : nepOpslag(opgeslagen ? { [THEMA_SLEUTEL]: opgeslagen } : {}, { zetFout: opslagFout });
  return { doc, win, opslag, root, knop, attributen, klik: () => klik() };
}

test('initThema: opgeslagen keuze wordt toegepast, knop heeft een vaste tekst en aria-pressed', () => {
  const p = nepPagina({ opgeslagen: 'dark' });
  initThema(p.doc, p.win, p.opslag);
  assert.equal(p.root.dataset.theme, 'dark');
  assert.equal(p.knop.textContent, 'Donker thema');
  assert.equal(p.attributen['aria-pressed'], 'true');
});

test('initThema: een klik wisselt het thema en bewaart de keuze', () => {
  const p = nepPagina({ donker: false });
  initThema(p.doc, p.win, p.opslag);
  assert.equal(p.attributen['aria-pressed'], 'false');
  p.klik();
  assert.equal(p.root.dataset.theme, 'dark');
  assert.equal(p.opslag.map.get(THEMA_SLEUTEL), 'dark');
  assert.equal(p.attributen['aria-pressed'], 'true');
  p.klik();
  assert.equal(p.root.dataset.theme, 'light');
  assert.equal(p.opslag.map.get(THEMA_SLEUTEL), 'light');
});

test('initThema: zonder matchMedia, zonder opslag of met een opslag die fouten geeft blijft alles werken', () => {
  const zonderMatch = nepPagina({ matchMedia: false });
  assert.doesNotThrow(() => initThema(zonderMatch.doc, zonderMatch.win, zonderMatch.opslag));
  assert.equal(zonderMatch.attributen['aria-pressed'], 'false');

  const zonderOpslag = nepPagina({ geenOpslag: true });
  initThema(zonderOpslag.doc, zonderOpslag.win, null);
  assert.doesNotThrow(() => zonderOpslag.klik());
  assert.equal(zonderOpslag.root.dataset.theme, 'dark');

  const vol = nepPagina({ opslagFout: true });
  initThema(vol.doc, vol.win, vol.opslag);
  assert.doesNotThrow(() => vol.klik());
  assert.equal(vol.root.dataset.theme, 'dark');

  const kapotteOpslag = nepPagina();
  const stuk = { getItem() { throw new Error('geblokkeerd'); }, setItem() { throw new Error('geblokkeerd'); } };
  assert.doesNotThrow(() => initThema(kapotteOpslag.doc, kapotteOpslag.win, stuk));
});

test('initThema: een ongeldige opgeslagen waarde wordt genegeerd en het systeemthema bepaalt de knop', () => {
  const p = nepPagina({ opgeslagen: 'blauw', donker: true });
  initThema(p.doc, p.win, p.opslag);
  assert.equal(p.root.dataset.theme, undefined);
  assert.equal(p.attributen['aria-pressed'], 'true');
});
