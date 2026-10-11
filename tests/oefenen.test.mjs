// Tests voor de werkbank (assets/js/oefenen.js) met een nepdocument: geen browser nodig. Een eigen kleine
// index en eigen scripts zorgen dat de tests niet breken als er scripts bijkomen; een laatste test draait
// alle echte oefenscripts door de werkbank heen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bouwCodeTabel, markeerRegels, optieLetter, scoreTekst, startWerkbank } from '../assets/js/oefenen.js';
import { scriptRegels } from '../assets/js/data.js';
import { V1_SLEUTEL, V2_SLEUTEL } from '../assets/js/progress.js';
import { bouwIndex } from '../tools/build-index.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Nepdocument ---

function maakElement(tag) {
  const e = {
    tag, className: '', textContent: '', id: '', value: '', disabled: false, type: '', kinderen: [], attributen: {}, handlers: {},
    append(...items) {
      for (const k of items) {
        if (typeof k === 'string') this.kinderen.push({ tag: '#tekst', textContent: k });
        else if (k.tag === '#fragment') this.kinderen.push(...k.kinderen);
        else this.kinderen.push(k);
      }
    },
    replaceChildren(...items) { this.kinderen = []; this.append(...items); },
    setAttribute(naam, waarde) { this.attributen[naam] = String(waarde); },
    getAttribute(naam) { return naam in this.attributen ? this.attributen[naam] : null; },
    focus() { this.gefocust = (this.gefocust ?? 0) + 1; },
    addEventListener(soort, f) { (this.handlers[soort] ??= []).push(f); }
  };
  return e;
}

const ONDERDELEN = ['filters', 'scriptkeuze', 'melding', 'score', 'codekop', 'codetabel', 'vragen'];

function maakPagina({ zoek = '' } = {}) {
  const els = Object.fromEntries(ONDERDELEN.map((id) => [id, maakElement('div')]));
  const doc = {
    title: '',
    createElement: maakElement,
    createTextNode: (t) => ({ tag: '#tekst', textContent: t }),
    createDocumentFragment: () => maakElement('#fragment'),
    getElementById: (id) => els[id] ?? null
  };
  const urls = [];
  const win = { location: { search: zoek }, history: { replaceState: (a, b, url) => urls.push(url) } };
  return { doc, win, els, urls };
}

const alle = (knoop) => [knoop, ...(knoop.kinderen ?? []).flatMap(alle)];
const vind = (knoop, voorwaarde) => alle(knoop).find(voorwaarde);
const vindAlle = (knoop, voorwaarde) => alle(knoop).filter(voorwaarde);
const tekstVan = (knoop) => [knoop.textContent, ...(knoop.kinderen ?? []).map(tekstVan)].filter(Boolean).join(' ');
const klik = (knoop) => { for (const f of knoop.handlers.click ?? []) f({}); };
const trigger = (knoop, soort) => { for (const f of knoop.handlers[soort] ?? []) f({}); };
const knoppen = (knoop) => vindAlle(knoop, (k) => k.tag === 'button');
const knopMetTekst = (knoop, tekst) => knoppen(knoop).find((k) => tekstVan(k).includes(tekst));
const zichtbareKaarten = (pagina) => vindAlle(pagina.els.vragen, (k) => k.tag === 'article' && !k.hidden);
const isOptie = (k) => typeof k.className === 'string' && /^opt( |$)/.test(k.className);
const wacht = () => new Promise((klaar) => setImmediate(klaar));

function nepOpslag(begin = {}) {
  const map = new Map(Object.entries(begin));
  return { map, getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, w) => { map.set(k, String(w)); } };
}

// --- Testgegevens ---

const meta = (id, topic, level, status, extra = {}) => ({
  id, title: `Titel ${id}`, topic, level, tag: `Tag ${id}`, summary: `Samenvatting ${id}`, risk: 'read', modules: [],
  check: status === 'gecontroleerd' ? { status, date: '2026-10-11', source: 'Bron X' } : { status },
  questions: [
    { id: 'q1', type: 'mc', step: 'parameters', lines: [1], prompt: 'Eerste vraag?', options: ['Fout A', 'Goed B', 'Fout C'], answer: 1, explanation: 'Omdat `B` klopt.' },
    { id: 'q2', type: 'bug', step: 'bron', lines: [2, 3], prompt: 'Zoek de fout.', options: ['Een', 'Twee'], answer: 0, explanation: '**Een** is fout.' },
    { id: 'q3', type: 'open', step: 'uitvoer', prompt: 'Leg uit.', explanation: 'Een sterk antwoord noemt `X`.' }
  ],
  ...extra
});
const GEGEVENS = {
  'a-basis': { meta: meta('a-basis', 'eerste', 'basis', 'gecontroleerd', { note: 'Opmerking die bij een gecontroleerd script niet getoond wordt.' }), code: "Connect-Thing -Naam 'x'\n\n$a = Get-Thing\nWrite-Output $a\n" },
  'b-gev': { meta: meta('b-gev', 'tweede', 'gevorderd', 'nog_te_controleren', { note: 'Let op deze opmerking.', risk: 'write' }), code: 'Set-Thing -Force\nGet-Thing\nRemove-Thing\n' },
  'c-basis': { meta: meta('c-basis', 'tweede', 'basis', 'gecontroleerd'), code: 'Get-Date\nGet-Date\nGet-Date\n' }
};
const testIndex = () => ({
  topics: [
    { id: 'eerste', name: 'Eerste', summary: 's', order: 1, status: 'live' },
    { id: 'leeg', name: 'Leeg', summary: 's', order: 2, status: 'in-opbouw' },
    { id: 'tweede', name: 'Tweede', summary: 's', order: 3, status: 'live' }
  ],
  scripts: ['a-basis', 'c-basis', 'b-gev'].map((id) => {
    const { meta: m } = GEGEVENS[id];
    return { id, topic: m.topic, level: m.level, title: m.title, tag: m.tag, counts: { mc: 1, bug: 1, open: 1 }, check: m.check, path: `data/scripts/${m.topic}/${id}` };
  })
});

async function start({ zoek = '', opslag = nepOpslag(), haalScript, haalIndex, haalMeta, gemeld = [] } = {}) {
  const pagina = maakPagina({ zoek });
  const api = await startWerkbank({
    doc: pagina.doc, win: pagina.win, opslag,
    haalIndex: haalIndex ?? (async () => testIndex()),
    haalScript: haalScript ?? (async (entry) => GEGEVENS[entry.id]),
    haalMeta: haalMeta ?? (async (entry) => GEGEVENS[entry.id].meta),
    meld: (f) => gemeld.push(f.message)
  });
  return { ...pagina, api, opslag, gemeld };
}

// --- Bouwstenen ---

test('code: een rij per regel, lege regels blijven zichtbaar, tekst staat letterlijk', () => {
  const { doc } = maakPagina();
  const { tabel, rijen } = bouwCodeTabel("Get-Date # <b>x</b>\n\nWrite-Output '<script>'\n", 'Test', doc);
  assert.equal(rijen.length, 3);
  assert.equal(tabel.attributen['aria-label'], 'Script: Test');
  assert.equal(tekstVan(rijen[0]).replace(/\s+/g, ' '), '1 Get-Date # <b>x</b>');
  assert.equal(rijen[1].kinderen[1].textContent, ' ');
  assert.deepEqual([...new Set(alle(tabel).map((k) => k.tag))].sort(), ['#tekst', 'span', 'table', 'tbody', 'td', 'tr'].sort());
});

test('code: markeerRegels licht alleen de opgegeven regels op', () => {
  const rijen = [1, 2, 3, 4].map(() => ({ className: 'oud' }));
  markeerRegels(rijen, [2, 4]);
  assert.deepEqual(rijen.map((r) => r.className), ['', 'hl', '', 'hl']);
  markeerRegels(rijen, []);
  assert.deepEqual(rijen.map((r) => r.className), ['', '', '', '']);
});

test('hulpjes: optieLetter en scoreTekst', () => {
  assert.equal(optieLetter(0), 'A');
  assert.equal(optieLetter(3), 'D');
  assert.equal(optieLetter(9), '10');
  assert.equal(scoreTekst({ beantwoord: 4, goed: 3, totaal: 6 }), '3 goed bij eerste poging · 4 van 6 beantwoord');
});

// --- Laden en tonen ---

test('werkbank: zonder ?script= opent het eerste script van de index; filters, keuze, code en vragen staan er', async () => {
  const p = await start();
  assert.equal(p.api.huidigId(), 'a-basis');
  assert.equal(p.doc.title, 'Titel a-basis – PowerShell Leestrainer');
  assert.deepEqual(vindAlle(p.els.filters, (k) => k.attributen.role === 'group').map((g) => g.attributen['aria-label']), ['Onderwerp', 'Soort vraag'], 'er is geen niveaufilter meer');
  // Onderwerpen zonder scripts (Leeg) staan niet in het filter
  assert.deepEqual(knoppen(p.els.filters).map((k) => k.textContent).slice(0, 3), ['Alle onderwerpen', 'Eerste', 'Tweede']);
  assert.equal(knoppen(p.els.filters).some((k) => /niveau|Basis|Gevorderd|Expert/.test(k.textContent)), false, 'geen enkele niveauknop');
  // Elke onderwerpknop draagt zijn onderwerp (voor de pastelkleur); "Alle onderwerpen" en soort vraag niet
  const onderwerpGroep = vind(p.els.filters, (k) => k.attributen['aria-label'] === 'Onderwerp');
  assert.deepEqual(knoppen(onderwerpGroep).map((k) => k.attributen['data-onderwerp'] ?? null), [null, 'eerste', 'tweede']);
  const typeGroep = vind(p.els.filters, (k) => k.attributen['aria-label'] === 'Soort vraag');
  assert.equal(knoppen(typeGroep).some((k) => 'data-onderwerp' in k.attributen), false);
  // Elk soort vraag draagt zijn soort (voor de pastelkleur) en de groep staat rechts; "Alle vragen" draagt niets
  assert.deepEqual(knoppen(typeGroep).map((k) => k.attributen['data-soort'] ?? null), [null, 'mc', 'bug', 'open']);
  assert.equal(typeGroep.className, 'chips rechts');
  // Elke scripttegel draagt het onderwerp van zijn script, zodat hij dezelfde kleur krijgt als de onderwerpknop
  assert.deepEqual(knoppen(p.els.scriptkeuze).map((k) => k.attributen['data-onderwerp']), ['eerste', 'tweede', 'tweede']);
  assert.equal(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').length, 3);
  assert.equal(vindAlle(p.els.codetabel, (k) => k.tag === 'tr').length, 4);
  assert.equal(vindAlle(p.els.vragen, (k) => k.tag === 'article').length, 3);
  assert.equal(vind(p.els.codekop, (k) => k.tag === 'h2').textContent, 'Titel a-basis');
  assert.match(tekstVan(p.els.codekop), /Gecontroleerd op 2026-10-11 · bron: Bron X/);
  // Een gecontroleerd script toont geen enkele waarschuwing, ook niet de note
  assert.equal(vind(p.els.codekop, (k) => k.className === 'waarschuwing'), undefined);
  assert.doesNotMatch(tekstVan(p.els.codekop), /Opmerking die bij een gecontroleerd script niet getoond wordt/);
  assert.equal(p.els.melding.kinderen.length, 0);
});

test('werkbank: ?script= kiest dat script; een onbekend id valt terug op het eerste', async () => {
  assert.equal((await start({ zoek: '?script=b-gev' })).api.huidigId(), 'b-gev');
  assert.equal((await start({ zoek: '?script=bestaat-niet' })).api.huidigId(), 'a-basis');
  assert.equal((await start({ zoek: '?script=../etc' })).api.huidigId(), 'a-basis');
});

test('werkbank: een script dat nog te controleren is toont een waarschuwing en de note, en het risicolabel', async () => {
  const p = await start({ zoek: '?script=b-gev' });
  const waarschuwingen = vindAlle(p.els.codekop, (k) => k.className === 'waarschuwing');
  assert.equal(waarschuwingen.length, 2);
  assert.match(tekstVan(waarschuwingen[0]), /^Nog te controleren\./);
  assert.equal(waarschuwingen[0].attributen.role, 'note');
  assert.equal(tekstVan(waarschuwingen[1]), 'Let op deze opmerking.');
  assert.equal(vind(p.els.codekop, (k) => k.className === 'risk write').textContent, 'wijzigt');
  assert.equal(vind(p.els.codekop, (k) => k.className === 'controle'), undefined);
});

test('werkbank: filters uit de URL worden toegepast; een ?script= buiten de filters blijft zichtbaar', async () => {
  // Een oude &level= in de URL wordt genegeerd en komt er niet meer in terug
  const p = await start({ zoek: '?script=b-gev&topic=eerste&level=basis&type=bug' });
  assert.equal(p.api.huidigId(), 'b-gev');
  assert.equal(p.urls.every((u) => !u.includes('level')), true);
  const scripts = vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').map((k) => k.kinderen[0].textContent);
  assert.deepEqual(scripts, ['Titel b-gev', 'Titel a-basis'], 'het huidige script staat vooraan, daarna de scripts binnen de filters');
  assert.equal(zichtbareKaarten(p).length, 1, 'alleen de bug-vraag');
  const gedrukt = knoppen(p.els.filters).filter((k) => k.attributen['aria-pressed'] === 'true').map((k) => k.textContent);
  assert.deepEqual(gedrukt, ['Eerste', 'Zoek de fout']);
});

// --- Antwoorden ---

test('werkbank: een antwoord kleurt goed en fout (ook met tekst), bewaart de voortgang en telt maar een keer', async () => {
  const p = await start();
  const kaart = vind(p.els.vragen, (k) => k.tag === 'article');
  const opties = () => vindAlle(kaart, (k) => isOptie(k));
  assert.equal(opties().length, 3);

  klik(opties()[0]); // fout antwoord: A
  assert.deepEqual(opties().map((o) => o.className), ['opt wrong', 'opt right', 'opt']);
  assert.ok(opties().every((o) => o.disabled));
  assert.match(tekstVan(opties()[0]), /jouw antwoord, onjuist/);
  assert.match(tekstVan(opties()[1]), /juiste antwoord/);
  const uitleg = vind(kaart, (k) => k.className === 'expl no');
  assert.match(tekstVan(uitleg), /Niet helemaal\. Het juiste antwoord is B\./);

  klik(opties()[1]); // tweede poging telt niet
  const opgeslagen = JSON.parse(p.opslag.map.get(V2_SLEUTEL));
  assert.deepEqual(Object.keys(opgeslagen.answers), ['a-basis:q1']);
  assert.equal(opgeslagen.answers['a-basis:q1'].first, 0);
  assert.equal(opgeslagen.answers['a-basis:q1'].correct, false);
});

test('werkbank: een goed antwoord geeft "Goed." en de uitleg met opmaak als elementen', async () => {
  const p = await start();
  const kaart = vind(p.els.vragen, (k) => k.tag === 'article');
  klik(vindAlle(kaart, (k) => k.className === 'opt')[1]);
  const uitleg = vind(kaart, (k) => k.className === 'expl ok');
  assert.equal(vind(uitleg, (k) => k.tag === 'strong').textContent, 'Goed.');
  assert.equal(vind(uitleg, (k) => k.tag === 'code').textContent, 'B');
});

test('werkbank: score, chip-voortgang en "opnieuw" volgen de antwoorden', async () => {
  const p = await start();
  assert.match(tekstVan(p.els.score), /0 goed bij eerste poging · 0 van 2 beantwoord/);
  assert.equal(knopMetTekst(p.els.score, 'opnieuw'), undefined);

  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  klik(vindAlle(kaarten[0], (k) => k.className === 'opt')[1]);
  klik(vindAlle(kaarten[1], (k) => k.className === 'opt')[1]); // bug-vraag, fout
  assert.match(tekstVan(p.els.score), /1 goed bij eerste poging · 2 van 2 beantwoord/);
  assert.equal(vind(p.els.scriptkeuze, (k) => k.className === 'prog').textContent, '2/2');

  klik(knopMetTekst(p.els.score, 'opnieuw'));
  assert.match(tekstVan(p.els.score), /0 goed bij eerste poging · 0 van 2 beantwoord/);
  assert.deepEqual(JSON.parse(p.opslag.map.get(V2_SLEUTEL)).answers, {});
  assert.equal(vindAlle(p.els.vragen, (k) => k.className === 'opt wrong' || k.className === 'opt right').length, 0);
});

test('werkbank: antwoorden blijven bewaard bij een volgend bezoek', async () => {
  const opslag = nepOpslag();
  const eerste = await start({ opslag });
  klik(vindAlle(vind(eerste.els.vragen, (k) => k.tag === 'article'), (k) => k.className === 'opt')[2]);
  const tweede = await start({ opslag });
  const opties = vindAlle(vind(tweede.els.vragen, (k) => k.tag === 'article'), (k) => isOptie(k));
  assert.deepEqual(opties.map((o) => o.className), ['opt', 'opt right', 'opt wrong']);
});

test('werkbank: zonder opslag (null) werken antwoorden in het geheugen zonder fout', async () => {
  const p = await start({ opslag: null });
  const kaart = vind(p.els.vragen, (k) => k.tag === 'article');
  assert.doesNotThrow(() => klik(vindAlle(kaart, (k) => k.className === 'opt')[1]));
  assert.ok(vind(kaart, (k) => k.className === 'expl ok'));
});

// --- Open vragen ---

test('werkbank: bij een open vraag blijft je tekst staan als je het voorbeeldantwoord toont, en dat wordt onthouden', async () => {
  const opslag = nepOpslag();
  const p = await start({ opslag });
  const kaart = vindAlle(p.els.vragen, (k) => k.tag === 'article')[2];
  const tekstveld = vind(kaart, (k) => k.tag === 'textarea');
  tekstveld.value = 'mijn eigen antwoord';
  assert.equal(vind(kaart, (k) => k.className === 'expl neutral'), undefined);

  klik(knopMetTekst(kaart, 'Toon voorbeeldantwoord'));
  assert.equal(vind(kaart, (k) => k.tag === 'textarea'), tekstveld, 'hetzelfde tekstveld (niet opnieuw opgebouwd)');
  assert.equal(tekstveld.value, 'mijn eigen antwoord');
  const uitleg = vind(kaart, (k) => k.className === 'expl neutral');
  assert.match(tekstVan(uitleg), /Wat een sterk antwoord bevat/);
  assert.equal(knopMetTekst(kaart, 'Toon voorbeeldantwoord'), undefined);
  assert.deepEqual(JSON.parse(opslag.map.get(V2_SLEUTEL)).open, { 'a-basis:q3': { shown: true } });

  const opnieuw = await start({ opslag });
  const kaart2 = vindAlle(opnieuw.els.vragen, (k) => k.tag === 'article')[2];
  assert.ok(vind(kaart2, (k) => k.className === 'expl neutral'), 'de uitleg staat er direct');
});

// --- Regels laten oplichten ---

test('werkbank: een vraag laat zijn regels oplichten bij muis, focus, klik en de regelknop; de kaart wordt actief', async () => {
  const p = await start();
  const rijen = vindAlle(p.els.codetabel, (k) => k.tag === 'tr');
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  const lichtOp = () => rijen.map((r, i) => (r.className === 'hl' ? i + 1 : null)).filter(Boolean);

  assert.deepEqual(lichtOp(), [1], 'de eerste vraag staat in beeld en haar regel licht al op');
  trigger(kaarten[1], 'mouseenter');
  assert.deepEqual(lichtOp(), [2, 3]);
  assert.deepEqual(kaarten.map((k) => k.className), ['q', 'q active', 'q']);

  trigger(kaarten[0], 'focusin');
  assert.deepEqual(lichtOp(), [1]);
  assert.deepEqual(kaarten.map((k) => k.className), ['q active', 'q', 'q']);

  trigger(kaarten[2], 'click'); // open vraag zonder regels: niets licht op
  assert.deepEqual(lichtOp(), []);

  const regelknop = knopMetTekst(kaarten[1], 'regel 2');
  assert.equal(regelknop.textContent, 'regel 2–3');
  assert.equal(regelknop.attributen['aria-label'], 'Licht regel 2–3 op in het script');
  klik(regelknop);
  assert.deepEqual(lichtOp(), [2, 3]);
});

// --- Een vraag tegelijk met vorige en volgende ---

test('werkbank: één vraag tegelijk in beeld, met vorige en volgende; de regels volgen de vraag', async () => {
  const p = await start();
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  const rijen = vindAlle(p.els.codetabel, (k) => k.tag === 'tr');
  const huidig = () => kaarten.map((k) => k.attributen['data-huidig']);
  const lichtOp = () => rijen.map((r, i) => (r.className === 'hl' ? i + 1 : null)).filter(Boolean);

  assert.deepEqual(huidig(), ['true', 'false', 'false']);
  assert.equal(kaarten[0].navKnoppen.vorige.disabled, true, 'bij de eerste vraag is er geen vorige');
  assert.equal(kaarten[0].navKnoppen.volgende.disabled, false);

  klik(kaarten[0].navKnoppen.volgende);
  assert.deepEqual(huidig(), ['false', 'true', 'false']);
  assert.deepEqual(lichtOp(), [2, 3], 'de regels van de vraag in beeld lichten op');
  assert.equal(kaarten[1].gefocust, 1, 'de focus gaat naar de nieuwe vraag');
  assert.equal(kaarten[1].navKnoppen.vorige.disabled, false);

  klik(kaarten[1].navKnoppen.volgende);
  assert.deepEqual(huidig(), ['false', 'false', 'true']);
  assert.equal(kaarten[2].navKnoppen.volgende.disabled, true, 'bij de laatste vraag is er geen volgende');
  assert.deepEqual(lichtOp(), [], 'een open vraag zonder regels laat niets oplichten');

  klik(kaarten[2].navKnoppen.vorige);
  assert.deepEqual(huidig(), ['false', 'true', 'false']);
});

test('werkbank: de navigatie in de vragenbox heeft tekst, pictogram en het vraagnummer', async () => {
  const p = await start();
  const kaart = vindAlle(p.els.vragen, (k) => k.tag === 'article')[0];
  const box = vind(kaart, (k) => k.className === 'qbox');
  assert.ok(box, 'de vragenbox bestaat');
  assert.ok(vind(kaart, (k) => k.className === 'qantwoord'), 'het antwoordvak bestaat');
  assert.equal(vind(box, (k) => k.className === 'qnum').textContent, 'Vraag 1 van 3');
  const nav = vind(box, (k) => k.className === 'qnav');
  assert.deepEqual(knoppen(nav).map((k) => tekstVan(k).trim()), ['Vorige', 'Volgende']);
  assert.ok(vind(nav, (k) => k.className === 'icoon ico-vorige' && k.attributen['aria-hidden'] === 'true'));
  assert.ok(vind(nav, (k) => k.className === 'icoon ico-volgende' && k.attributen['aria-hidden'] === 'true'));
  assert.equal(vind(kaart, (k) => k.className === 'opts').tag, 'div');
  assert.ok(vind(kaart, (k) => k.className === 'qantwoord').kinderen.includes(vind(kaart, (k) => k.className === 'opts')), 'de opties staan in het antwoordvak');
  assert.equal(box.kinderen.includes(vind(kaart, (k) => k.className === 'opts')), false, 'en niet in de vragenbox');
});

test('productiecode gebruikt geen onderdelen die alleen in het nepdocument bestaan', () => {
  // De fake DOM in deze test heeft eigen velden (attributen, handlers, kinderen, gefocust). In een echte browser
  // bestaan die niet; een aanroep ervan in assets/js zou hier slagen en in productie een TypeError geven
  // (zo was het filter "soort vraag" in de browser kapot terwijl de test groen was).
  const map = join(root, 'assets', 'js');
  for (const bestand of readdirSync(map).filter((b) => b.endsWith('.js'))) {
    const bron = readFileSync(join(map, bestand), 'utf8');
    assert.doesNotMatch(bron, /\.(attributen|handlers|kinderen|gefocust)\b/, `${bestand} gebruikt een onderdeel van het nepdocument`);
  }
});

test('werkbank: een gegeven antwoord blijft staan als je naar de volgende vraag gaat en terug', async () => {
  const p = await start();
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  klik(vindAlle(kaarten[0], (k) => isOptie(k))[0]); // eerste vraag: optie A is fout
  klik(kaarten[0].navKnoppen.volgende);
  klik(kaarten[1].navKnoppen.vorige);
  assert.equal(kaarten[0].attributen['data-huidig'], 'true');
  const opties = vindAlle(kaarten[0], (k) => isOptie(k));
  assert.equal(opties.every((o) => o.disabled), true, 'de opties blijven vergrendeld');
  assert.ok(opties[0].className.includes('wrong') && opties[1].className.includes('right'), 'goed en fout blijven zichtbaar');
  assert.ok(vind(kaarten[0], (k) => k.className === 'expl no'), 'de uitleg staat er nog');
});

test('werkbank: een ander script kiezen en "opnieuw" zetten de vraag in beeld terug op de eerste', async () => {
  const p = await start();
  let kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  klik(kaarten[0].navKnoppen.volgende);
  assert.equal(kaarten[1].attributen['data-huidig'], 'true');

  klik(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').find((k) => tekstVan(k).includes('Titel b-gev')));
  await wacht();
  kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  assert.deepEqual(kaarten.map((k) => k.attributen['data-huidig']), ['true', 'false', 'false'], 'nieuw script: de eerste vraag');

  klik(vindAlle(kaarten[0], (k) => isOptie(k))[0]);
  klik(kaarten[0].navKnoppen.volgende);
  assert.equal(kaarten[1].attributen['data-huidig'], 'true');
  klik(knopMetTekst(p.els.score, 'opnieuw'));
  kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  assert.deepEqual(kaarten.map((k) => k.attributen['data-huidig']), ['true', 'false', 'false'], 'na opnieuw: de eerste vraag');
});

test('werkbank: een filter zonder passende vragen laat geen vraag in beeld en houdt de pagina heel', async () => {
  const GEEN_BUG = { ...GEGEVENS['a-basis'], meta: { ...GEGEVENS['a-basis'].meta, questions: GEGEVENS['a-basis'].meta.questions.filter((v) => v.type !== 'bug') } };
  const p = await start({ haalScript: async () => GEEN_BUG });
  klik(knopMetTekst(p.els.filters, 'Zoek de fout'));
  assert.equal(zichtbareKaarten(p).length, 0);
  klik(knopMetTekst(p.els.filters, 'Alle vragen'));
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  assert.equal(kaarten.filter((k) => k.attributen['data-huidig'] === 'true').length, 1, 'er is weer precies één vraag in beeld');
});

test('werkbank: het filter "soort vraag" houdt de vraag in beeld binnen het filter en zet vorige en volgende goed', async () => {
  const p = await start();
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  klik(knopMetTekst(p.els.filters, 'Zoek de fout'));
  assert.deepEqual(kaarten.map((k) => k.attributen['data-huidig']), ['false', 'true', 'false'], 'de zoek-de-foutvraag komt in beeld');
  assert.equal(kaarten[1].navKnoppen.vorige.disabled, true, 'maar één vraag binnen het filter: geen vorige');
  assert.equal(kaarten[1].navKnoppen.volgende.disabled, true, 'en geen volgende');
  klik(knopMetTekst(p.els.filters, 'Alle vragen'));
  assert.deepEqual(kaarten.map((k) => k.attributen['data-huidig']), ['false', 'true', 'false'], 'de vraag blijft staan als het filter weer weg is');
  assert.equal(kaarten[1].navKnoppen.vorige.disabled, false);
  assert.equal(kaarten[1].navKnoppen.volgende.disabled, false);
});

// --- Filters en scriptkeuze ---

test('werkbank: een script kiezen laadt het en past de URL aan', async () => {
  const p = await start();
  klik(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').find((k) => tekstVan(k).includes('Titel b-gev')));
  await wacht();
  assert.equal(p.api.huidigId(), 'b-gev');
  assert.equal(vind(p.els.codekop, (k) => k.tag === 'h2').textContent, 'Titel b-gev');
  assert.equal(vindAlle(p.els.codetabel, (k) => k.tag === 'tr').length, 3);
  assert.equal(p.urls.at(-1), '/oefenen/?script=b-gev');
});

test('werkbank: het filter "soort vraag" verbergt vragen en houdt het vraagnummer van het script', async () => {
  const p = await start();
  klik(knopMetTekst(p.els.filters, 'Zoek de fout'));
  const kaarten = zichtbareKaarten(p);
  assert.equal(kaarten.length, 1);
  assert.equal(vind(kaarten[0], (k) => k.className === 'qnum').textContent, 'Vraag 2 van 3');
  assert.equal(vind(kaarten[0], (k) => k.className === 'qnum').tag, 'h3', 'elke vraag heeft een kop');
  assert.equal(p.urls.at(-1), '/oefenen/?script=a-basis&type=bug');

  klik(knopMetTekst(p.els.filters, 'Alle vragen'));
  assert.equal(zichtbareKaarten(p).length, 3);
  assert.equal(p.urls.at(-1), '/oefenen/?script=a-basis');
});

test('werkbank: een filter zonder passende vragen toont een melding in plaats van een lege lijst', async () => {
  const GEEN_BUG = { ...GEGEVENS['a-basis'], meta: { ...GEGEVENS['a-basis'].meta, questions: GEGEVENS['a-basis'].meta.questions.filter((v) => v.type !== 'bug') } };
  const p = await start({ haalScript: async () => GEEN_BUG });
  klik(knopMetTekst(p.els.filters, 'Zoek de fout'));
  assert.equal(zichtbareKaarten(p).length, 0);
  const melding = vind(p.els.vragen, (k) => k.className === 'empty');
  assert.equal(melding.hidden, false);
  assert.equal(melding.textContent, 'Geen vragen van dit soort in dit script.');
  assert.equal(melding.attributen.role, 'status', 'wordt voorgelezen');
  klik(knopMetTekst(p.els.filters, 'Alle vragen'));
  assert.equal(melding.hidden, true);
});

test('werkbank: een onderwerpfilter wisselt naar het eerste passende script als het huidige niet past', async () => {
  const p = await start();
  assert.equal(p.api.huidigId(), 'a-basis');
  klik(knopMetTekst(p.els.filters, 'Tweede'));
  await wacht();
  assert.equal(p.api.huidigId(), 'c-basis', 'het eerste script van Tweede volgens de index (basis voor gevorderd)');
  assert.equal(p.urls.at(-1), '/oefenen/?script=c-basis&topic=tweede');
  assert.deepEqual(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').map((k) => k.kinderen[0].textContent), ['Titel c-basis', 'Titel b-gev']);

  klik(knopMetTekst(p.els.filters, 'Alle onderwerpen'));
  await wacht();
  assert.equal(p.api.huidigId(), 'c-basis', 'het huidige script past nog en blijft staan');
  assert.equal(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').length, 3);
});

test('werkbank: blijft het huidige script passen, dan wordt het niet opnieuw geladen', async () => {
  let geladen = 0;
  const p = await start({ haalScript: async (entry) => { geladen++; return GEGEVENS[entry.id]; } });
  assert.equal(geladen, 1);
  klik(knopMetTekst(p.els.filters, 'Eerste'));
  await wacht();
  assert.equal(geladen, 1);
  assert.equal(p.api.huidigId(), 'a-basis');
});

// --- Fouten en volgorde ---

test('werkbank: een index die niet te laden is geeft een melding met role=alert', async () => {
  const p = await start({ haalIndex: async () => { throw new Error('netwerk'); } });
  assert.equal(p.api, null);
  assert.equal(p.els.melding.kinderen[0].attributen.role, 'alert');
  assert.deepEqual(p.gemeld, ['netwerk']);
});

test('werkbank: een index zonder scripts geeft een melding', async () => {
  const p = await start({ haalIndex: async () => ({ topics: [], scripts: [] }) });
  assert.equal(p.api, null);
  assert.match(tekstVan(p.els.melding), /nog geen oefenscripts/);
});

test('werkbank: een script dat niet te laden is geeft een melding, en kiezen van een ander script herstelt dat', async () => {
  let kapot = true;
  const p = await start({ haalScript: async (entry) => { if (entry.id === 'a-basis' && kapot) throw new Error('weg'); return GEGEVENS[entry.id]; } });
  assert.equal(p.els.melding.kinderen[0].attributen.role, 'alert');
  assert.equal(p.els.vragen.kinderen.length, 0, 'geen lege alinea achtergelaten');
  kapot = false;
  klik(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').find((k) => tekstVan(k).includes('Titel c-basis')));
  await wacht();
  assert.equal(p.els.melding.kinderen.length, 0);
  assert.equal(vindAlle(p.els.vragen, (k) => k.tag === 'article').length, 3);
});

test('werkbank: een trage oudere aanvraag overschrijft een nieuwere niet', async () => {
  const wachtrij = {};
  const p = await start({
    haalScript: (entry) => (entry.id === 'a-basis' ? Promise.resolve(GEGEVENS['a-basis']) : new Promise((klaar) => { wachtrij[entry.id] = () => klaar(GEGEVENS[entry.id]); }))
  });
  const kies = (naam) => klik(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').find((k) => tekstVan(k).includes(naam)));
  kies('Titel b-gev');
  kies('Titel c-basis');
  wachtrij['c-basis']();
  await wacht();
  wachtrij['b-gev'](); // komt later binnen, maar is ouder
  await wacht();
  assert.equal(vind(p.els.codekop, (k) => k.tag === 'h2').textContent, 'Titel c-basis');
});

test('werkbank: v1-voortgang wordt eerst overgenomen en staat direct in de chips en de kaart', async () => {
  const index = testIndex();
  index.scripts[0].legacyId = 'oud';
  const opslag = nepOpslag({ [V1_SLEUTEL]: JSON.stringify({ 'oud:0': { first: 1 }, 'oud:2': { shown: true } }) });
  const p = await start({ opslag, haalIndex: async () => index });
  assert.equal(vind(p.els.scriptkeuze, (k) => k.className === 'prog').textContent, '1/2');
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  assert.ok(vind(kaarten[0], (k) => k.className === 'expl ok'));
  assert.ok(vind(kaarten[2], (k) => k.className === 'expl neutral'));
  assert.ok(opslag.map.has(V1_SLEUTEL), 'v1 blijft staan');
});

// --- Veiligheid ---

test('werkbank: HTML in scripts en vragen wordt tekst, nooit een element', async () => {
  const gif = {
    meta: { ...GEGEVENS['a-basis'].meta, title: '<img src=x onerror=alert(1)>', summary: '<script>x</script>', note: '<b>note</b>',
      questions: [{ ...GEGEVENS['a-basis'].meta.questions[0], prompt: '<iframe src=x>', options: ['<svg onload=1>', '<b>b</b>'], explanation: '`<b>` **<i>**' }] },
    code: "Write-Output '<script>alert(1)</script>'\n"
  };
  const p = await start({ haalScript: async () => gif });
  klik(vindAlle(p.els.vragen, (k) => k.className === 'opt')[0]);
  const tags = new Set([p.els.codekop, p.els.codetabel, p.els.vragen, p.els.scriptkeuze].flatMap((deel) => alle(deel).map((k) => k.tag)));
  for (const verboden of ['script', 'img', 'iframe', 'svg', 'b', 'i']) assert.ok(!tags.has(verboden), `${verboden} mag geen element worden`);
  assert.equal(vind(p.els.codekop, (k) => k.tag === 'h2').textContent, '<img src=x onerror=alert(1)>');
  assert.equal(vind(p.els.vragen, (k) => k.className === 'prompt').textContent, '<iframe src=x>');
});

// --- Alle echte oefenscripts ---

test('werkbank: elk echt oefenscript rendert, met een kaart per vraag en alleen bestaande regels in de markeringen', async () => {
  const { index, fouten } = bouwIndex({ scriptsMap: join(root, 'data', 'scripts'), topicsBestand: join(root, 'data', 'topics.json') });
  assert.deepEqual(fouten, []);
  const haalScript = async (entry) => ({
    meta: JSON.parse(readFileSync(join(root, entry.path, 'meta.json'), 'utf8')),
    code: readFileSync(join(root, entry.path, 'script.ps1'), 'utf8')
  });
  for (const entry of index.scripts) {
    const p = await start({ zoek: `?script=${entry.id}`, haalIndex: async () => index, haalScript, haalMeta: async (e) => (await haalScript(e)).meta });
    const { meta: m, code } = await haalScript(entry);
    const rijen = vindAlle(p.els.codetabel, (k) => k.tag === 'tr');
    assert.equal(rijen.length, scriptRegels(code).length, entry.id);
    const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
    assert.equal(kaarten.length, m.questions.length, entry.id);
    kaarten.forEach((kaart, i) => {
      trigger(kaart, 'mouseenter');
      const lichtOp = rijen.filter((r) => r.className === 'hl').length;
      assert.equal(lichtOp, new Set(m.questions[i].lines ?? []).size, `${entry.id} ${m.questions[i].id}`);
    });
    assert.equal(p.els.melding.kinderen.length, 0, entry.id);
    assert.equal(p.gemeld.length, 0, entry.id);
  }
});

// --- Aanvullingen na de review ---

test('werkbank: wat je in een open vraag typte blijft staan bij het wisselen van het filter "soort vraag"', async () => {
  const p = await start();
  const tekstveld = vind(vindAlle(p.els.vragen, (k) => k.tag === 'article')[2], (k) => k.tag === 'textarea');
  tekstveld.value = 'half antwoord';
  klik(knopMetTekst(p.els.filters, 'Meerkeuze'));
  assert.equal(tekstveld.value, 'half antwoord');
  assert.equal(vind(p.els.vragen, (k) => k.tag === 'textarea'), tekstveld, 'hetzelfde tekstveld, alleen verborgen');
  assert.equal(zichtbareKaarten(p).length, 1);
  klik(knopMetTekst(p.els.filters, 'Alle vragen'));
  assert.equal(vind(p.els.vragen, (k) => k.tag === 'textarea').value, 'half antwoord');
});

test('werkbank: het huidige script opnieuw kiezen laadt het niet opnieuw (en wist dus geen tekst)', async () => {
  let geladen = 0;
  const p = await start({ haalScript: async (entry) => { geladen++; return GEGEVENS[entry.id]; } });
  const tekstveld = vind(vindAlle(p.els.vragen, (k) => k.tag === 'article')[2], (k) => k.tag === 'textarea');
  tekstveld.value = 'mijn tekst';
  klik(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').find((k) => tekstVan(k).includes('Titel a-basis')));
  await wacht();
  assert.equal(geladen, 1);
  assert.equal(vind(p.els.vragen, (k) => k.tag === 'textarea'), tekstveld);
  assert.equal(tekstveld.value, 'mijn tekst');
});

test('werkbank: na een antwoord of het voorbeeldantwoord gaat de focus naar de uitleg', async () => {
  const p = await start();
  const kaarten = vindAlle(p.els.vragen, (k) => k.tag === 'article');
  klik(vindAlle(kaarten[0], (k) => k.className === 'opt')[1]);
  const uitleg = vind(kaarten[0], (k) => k.className === 'expl ok');
  assert.equal(uitleg.attributen.tabindex, '-1');
  assert.equal(uitleg.gefocust, 1);
  klik(knopMetTekst(kaarten[2], 'Toon voorbeeldantwoord'));
  const open = vind(kaarten[2], (k) => k.className === 'expl neutral');
  assert.equal(open.gefocust, 1);
});

test('werkbank: aria-busy staat aan tijdens het laden en uit daarna', async () => {
  let klaar;
  const p = await start({ haalScript: (entry) => (entry.id === 'a-basis' ? Promise.resolve(GEGEVENS['a-basis']) : new Promise((r) => { klaar = () => r(GEGEVENS[entry.id]); })) });
  assert.equal(p.els.vragen.attributen['aria-busy'], 'false');
  klik(vindAlle(p.els.scriptkeuze, (k) => k.tag === 'button').find((k) => tekstVan(k).includes('Titel c-basis')));
  assert.equal(p.els.vragen.attributen['aria-busy'], 'true');
  klaar();
  await wacht();
  assert.equal(p.els.vragen.attributen['aria-busy'], 'false');
});

test('werkbank: een fout bij het tonen van een script geeft een melding en geen half gevulde pagina', async () => {
  const kapot = { meta: { ...GEGEVENS['a-basis'].meta, check: undefined }, code: 'Get-Date\n' };
  const p = await start({ haalScript: async () => kapot });
  assert.equal(p.els.melding.kinderen[0].attributen.role, 'alert');
  assert.equal(p.els.codekop.kinderen.length, 0);
  assert.equal(p.els.codetabel.kinderen.length, 0);
  assert.equal(p.els.vragen.kinderen.length, 0);
  assert.equal(p.gemeld.length, 1);
  assert.equal(p.els.vragen.attributen['aria-busy'], 'false');
});

test('werkbank: de voortgang gebruikt het id uit de index, ook als meta.id afwijkt', async () => {
  const afwijkend = { meta: { ...GEGEVENS['a-basis'].meta, id: 'ander-id' }, code: GEGEVENS['a-basis'].code };
  const p = await start({ haalScript: async () => afwijkend });
  klik(vindAlle(vind(p.els.vragen, (k) => k.tag === 'article'), (k) => k.className === 'opt')[1]);
  assert.deepEqual(Object.keys(JSON.parse(p.opslag.map.get(V2_SLEUTEL)).answers), ['a-basis:q1']);
  assert.equal(vind(p.els.scriptkeuze, (k) => k.className === 'prog').textContent, '1/2');
});

// --- Koppeling met de HTML en verboden constructies ---

test('oefenen/index.html bevat alle id-s die oefenen.js nodig heeft', () => {
  const html = readFileSync(join(root, 'oefenen', 'index.html'), 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const id of [...ONDERDELEN, 'thema-knop', 'inhoud']) assert.ok(ids.has(id), `id "${id}" ontbreekt in oefenen/index.html`);
});

test('assets/js: geen innerHTML, insertAdjacentHTML, outerHTML, document.write, eval of new Function', () => {
  const map = join(root, 'assets', 'js');
  const bestanden = readdirSync(map).filter((naam) => naam.endsWith('.js'));
  assert.ok(bestanden.length >= 8);
  for (const naam of bestanden) {
    // Commentaar eerst weghalen: het mag over deze regel gaan, de code niet.
    const code = readFileSync(join(map, naam), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.doesNotMatch(code, /innerHTML|insertAdjacentHTML|outerHTML|document\.write|\beval\s*\(|new\s+Function\b/, naam);
  }
});

test('app.css bevat de klassen die de werkbank gebruikt', () => {
  const css = readFileSync(join(root, 'assets', 'css', 'app.css'), 'utf8');
  for (const klasse of ['chip', 'chips', 'q', 'opt', 'right', 'wrong', 'expl', 'hl', 'codetabel', 'visually-hidden', 'waarschuwing', 'empty', 'fout', 'lines', 'kind', 'risk', 'btn', 'bench', 'prompt', 'qnum']) {
    assert.match(css, new RegExp(`\\.${klasse}\\b`), `.${klasse} ontbreekt in app.css`);
  }
});

test('werkbank: de soort-vraag-badge heeft een verborgen pictogram bij elk vraagtype', async () => {
  const p = await start();
  const badges = vindAlle(p.els.vragen, (k) => typeof k.className === 'string' && k.className.startsWith('kind'));
  assert.equal(badges.length, 3);
  assert.deepEqual(badges.map((b) => b.kinderen[0].className), ['icoon ico-mc', 'icoon ico-bug', 'icoon ico-open']);
  for (const b of badges) assert.equal(b.kinderen[0].attributen['aria-hidden'], 'true');
  assert.deepEqual(badges.map((b) => b.kinderen[1].textContent), ['Meerkeuze', 'Zoek de fout', 'Zelf formuleren']);
});
