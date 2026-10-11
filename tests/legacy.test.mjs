// Regressietest op de omzetting van v1: legacy/ps-leestrainer-v1.html is de bron, data/ het resultaat.
// De test leest de v1-arrays SCRIPTS en DICT met node:vm en vergelijkt ze met data/scripts en
// data/dictionary.json. Alleen de bewuste inhoudelijke afwijkingen (hieronder, met Peters akkoord
// van 11 oktober 2026) mogen verschillen; elk ander verschil laat de test falen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Bewuste afwijkingen: <legacyId>:<vraagindex>:<veld>
const AFWIJKINGEN = [
  'graph-devices:1:explanation',  // zonder de zin dat optie A "toevallig ook werkt"
  'graph-devices:1:option0',      // optie A is nu echt fout (-Days bestaat niet)
  'graph-devices:6:explanation',  // extra punt over $null -lt $grens
  'graph-users:3:explanation',    // v1 had links/rechts omgedraaid bij $null -eq (herstelfout, 11 oktober 2026)
  'sharegate:5:explanation'       // tenant-to-tenant is buiten scope: on-premises naar SharePoint Online
];

// Scripts waaraan bij het omzetten een note is toegevoegd (v1 had er geen)
const NIEUWE_NOTES = ['graph-devices', 'spo-sites'];

const html = readFileSync(join(root, 'legacy', 'ps-leestrainer-v1.html'), 'utf8');
const begin = html.indexOf('<script>') + '<script>'.length;
// Via JSON kopieren: arrays uit node:vm hebben een ander prototype, waardoor deepEqual anders faalt.
const { SCRIPTS, DICT } = JSON.parse(JSON.stringify(vm.runInNewContext(html.slice(begin, html.indexOf('const KEY')) + '\n({ SCRIPTS, DICT })')));

// Zelfde omzetting van HTML naar `code` en **vet** als bij het omzetten
const naarOpmaak = (t) => t
  .replace(/<code class="i">([\s\S]*?)<\/code>/g, (_, c) => '`' + c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') + '`')
  .replace(/<em>([\s\S]*?)<\/em>/g, '**$1**');

// Alle meta.json-bestanden onder data/scripts, gevonden op legacyId
function leesScripts() {
  const uit = {};
  const scriptsMap = join(root, 'data', 'scripts');
  for (const onderwerp of readdirSync(scriptsMap)) {
    for (const id of readdirSync(join(scriptsMap, onderwerp))) {
      const map = join(scriptsMap, onderwerp, id);
      const meta = JSON.parse(readFileSync(join(map, 'meta.json'), 'utf8'));
      if (meta.legacyId) uit[meta.legacyId] = { meta, code: readFileSync(join(map, 'script.ps1'), 'utf8') };
    }
  }
  return uit;
}

test('v1 heeft 4 scripts en 27 vragen, en ze staan allemaal in data/scripts', () => {
  assert.equal(SCRIPTS.length, 4);
  assert.equal(SCRIPTS.reduce((n, s) => n + s.qs.length, 0), 27);
  const nieuw = leesScripts();
  assert.deepEqual(Object.keys(nieuw).sort(), SCRIPTS.map((s) => s.id).sort());
});

test('scripts en vragen komen overeen met v1, op de bewuste afwijkingen na', () => {
  const nieuw = leesScripts();
  const verschillen = [];

  for (const v1 of SCRIPTS) {
    const { meta, code } = nieuw[v1.id];
    assert.equal(code, v1.code + '\n', `${v1.id}: script.ps1 wijkt af van de v1-code`);
    assert.equal(meta.title, v1.title, `${v1.id}: titel`);
    assert.equal(meta.tag, v1.tag, `${v1.id}: tag`);
    assert.equal(meta.summary, v1.desc, `${v1.id}: summary`);
    // De v1-note (alleen ShareGate) blijft gelijk; bij deze twee scripts is een note toegevoegd als reden voor nog_te_controleren.
    if (!NIEUWE_NOTES.includes(v1.id)) assert.equal(meta.note, v1.note, `${v1.id}: note`);
    else assert.ok(meta.note && v1.note === undefined, `${v1.id}: toegevoegde note`);
    assert.equal(meta.questions.length, v1.qs.length, `${v1.id}: aantal vragen`);

    v1.qs.forEach((q, i) => {
      const n = meta.questions[i];
      const wie = `${v1.id}:${i}`;
      assert.equal(n.id, `q${i + 1}`, `${wie}: id`);
      assert.equal(n.type, q.type, `${wie}: type`);
      assert.equal(n.prompt, q.q, `${wie}: prompt`);
      assert.deepEqual(n.lines, q.lines.length ? q.lines : undefined, `${wie}: lines`);
      if (q.type === 'open') {
        assert.equal('options' in n || 'answer' in n, false, `${wie}: open vraag heeft geen options of answer`);
      } else {
        assert.equal(n.answer, q.a, `${wie}: answer`);
        q.opts.forEach((o, j) => { if (n.options[j] !== o) verschillen.push(`${wie}:option${j}`); });
        assert.equal(n.options.length, q.opts.length, `${wie}: aantal opties`);
      }
      if (n.explanation !== naarOpmaak(q.ex)) verschillen.push(`${wie}:explanation`);
    });
  }
  assert.deepEqual(verschillen.sort(), [...AFWIJKINGEN].sort(), 'alleen de bewuste afwijkingen mogen verschillen');

  // De nieuwe waarden zelf moeten ook kloppen (en niet per ongeluk terug naar v1 zijn gezet)
  const apparaten = nieuw['graph-devices'].meta.questions;
  assert.match(apparaten[1].options[0], /-Days 365/);
  assert.equal(apparaten[1].answer, 1);
  assert.match(apparaten[1].options[1], /-Dagen 365/);
  assert.match(apparaten[6].explanation, /\$null -lt \$grens/);
  assert.match(nieuw.sharegate.meta.questions[5].explanation, /on-premises naar SharePoint Online/);
  assert.doesNotMatch(nieuw.sharegate.meta.questions[5].explanation, /tenant-to-tenant/);
  assert.match(nieuw['graph-users'].meta.questions[3].explanation, /lijst aan de linkerkant de lijst filtert/);
});

test('v1-uitleg bevat na omzetting geen HTML meer', () => {
  const nieuw = leesScripts();
  for (const { meta } of Object.values(nieuw)) {
    for (const v of meta.questions) assert.doesNotMatch(v.explanation, /<[a-z/][^>]*>/i, `${meta.id} ${v.id}`);
  }
});

test('woordenboek: 40 items in 7 groepen, gelijk aan v1', () => {
  const nieuw = JSON.parse(readFileSync(join(root, 'data', 'dictionary.json'), 'utf8'));
  assert.equal(DICT.length, 7);
  assert.equal(nieuw.length, 7);
  assert.equal(nieuw.reduce((n, g) => n + g.items.length, 0), 40);
  DICT.forEach((groep, i) => {
    assert.equal(nieuw[i].name, groep.g);
    assert.equal(nieuw[i].items.length, groep.items.length);
    groep.items.forEach(([term, explanation, example, risk], j) => {
      const item = nieuw[i].items[j];
      assert.deepEqual([item.term, item.explanation, item.example, item.risk], [term, explanation, example, risk], `${groep.g} #${j}`);
    });
  });
});
