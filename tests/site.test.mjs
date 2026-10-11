// Tests voor het sitepakket (tools/build-site.mjs): alleen de allowlist komt erin, en het pakket zelf werkt.
// Elke test bouwt op een tijdelijke "repo" met extra rommel (tests, tools, DESIGN.md, dotfiles, ...), zodat
// duidelijk is dat die er nooit in komt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOEGESTANE_BESTANDEN, TOEGESTANE_MAPPEN, bouwSite } from '../tools/build-site.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

// Een tijdelijke map met de echte site-inhoud plus rommel die niet gepubliceerd mag worden
function maakTijdelijkeRepo() {
  const tmp = mkdtempSync(join(tmpdir(), 'ps-trainer-site-'));
  for (const naam of [...TOEGESTANE_BESTANDEN, ...TOEGESTANE_MAPPEN]) cpSync(join(repo, naam), join(tmp, naam), { recursive: true });
  // Rommel op het hoogste niveau
  for (const map of ['tests', 'tools', 'legacy', '.github', '.git', 'node_modules', 'agent', 'api']) {
    mkdirSync(join(tmp, map), { recursive: true });
    writeFileSync(join(tmp, map, 'geheim.txt'), 'niet publiceren');
  }
  for (const bestand of ['DESIGN.md', 'DEFINE.md', 'CLAUDE.md', 'DEPLOY.md', 'README.md', 'package.json', 'package-lock.json', '.env', '.nvmrc', '.gitignore', 'notities.txt']) {
    writeFileSync(join(tmp, bestand), 'niet publiceren');
  }
  // Rommel binnen toegestane mappen
  writeFileSync(join(tmp, 'assets', '.verborgen'), 'niet publiceren');
  mkdirSync(join(tmp, 'assets', 'node_modules'), { recursive: true });
  writeFileSync(join(tmp, 'assets', 'node_modules', 'x.js'), 'niet publiceren');
  mkdirSync(join(tmp, 'data', '.git'), { recursive: true });
  writeFileSync(join(tmp, 'data', '.git', 'config'), 'niet publiceren');
  // Een verouderde lokale index die er nooit in mag komen
  writeFileSync(join(tmp, 'data', 'index.json'), JSON.stringify({ verouderd: true }));
  return tmp;
}

const alleBestanden = (map) => readdirSync(map, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(map, join(e.parentPath, e.name)).split('\\').join('/'));

function metSite(test) {
  const tmp = maakTijdelijkeRepo();
  try {
    const resultaat = bouwSite({ root: tmp, doel: join(tmp, '_site') });
    return test(resultaat.doel, tmp, resultaat);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test('site: alleen de allowlist staat op het hoogste niveau van het pakket', () => metSite((site) => {
  assert.deepEqual(readdirSync(site).sort(), [...TOEGESTANE_BESTANDEN, ...TOEGESTANE_MAPPEN].sort());
  assert.deepEqual(readdirSync(site).sort(), ['CNAME', 'assets', 'data', 'index.html', 'oefenen', 'schema', 'woordenboek']);
}));

test('site: geen rommel, geen dotfiles en geen node_modules, op geen enkel niveau', () => metSite((site) => {
  const bestanden = alleBestanden(site);
  assert.ok(bestanden.length > 20);
  for (const bestand of bestanden) {
    assert.doesNotMatch(bestand, /(^|\/)\./, `dotfile in het pakket: ${bestand}`);
    assert.doesNotMatch(bestand, /node_modules/, bestand);
    assert.doesNotMatch(bestand, /(^|\/)(tests|tools|legacy|agent|api)\//, bestand);
    assert.doesNotMatch(bestand, /^(DESIGN|DEFINE|CLAUDE|DEPLOY|README)\.md$|^package(-lock)?\.json$|notities\.txt$/, bestand);
  }
  for (const bestand of bestanden) assert.notEqual(readFileSync(join(site, bestand), 'utf8'), 'niet publiceren', `rommel gepubliceerd: ${bestand}`);
}));

test('site: data bevat alleen de index, het woordenboek, de onderwerpen en per script script.ps1 en meta.json', () => metSite((site) => {
  const data = alleBestanden(join(site, 'data'));
  assert.ok(data.includes('index.json') && data.includes('topics.json') && data.includes('dictionary.json'));
  for (const bestand of data) {
    assert.match(bestand, /^(index|topics|dictionary)\.json$|^scripts\/[a-z0-9-]+\/[a-z0-9-]+\/(script\.ps1|meta\.json)$/, bestand);
  }
}));

test('site: data/index.json is vers gebouwd (niet de verouderde lokale versie) en klopt met de scripts', () => metSite((site, tmp, resultaat) => {
  const index = JSON.parse(readFileSync(join(site, 'data', 'index.json'), 'utf8'));
  assert.equal(index.verouderd, undefined);
  assert.ok(Array.isArray(index.scripts) && Array.isArray(index.topics));
  assert.equal(index.scripts.length, resultaat.aantalScripts);
  assert.ok(index.scripts.length >= 4);
  for (const script of index.scripts) {
    assert.ok(existsSync(join(site, script.path, 'script.ps1')), `${script.path}/script.ps1 ontbreekt in het pakket`);
    assert.ok(existsSync(join(site, script.path, 'meta.json')));
  }
  assert.ok(!Number.isNaN(Date.parse(index.generated)));
}));

test('site: CNAME bevat het adres van de site', () => metSite((site) => {
  assert.equal(readFileSync(join(site, 'CNAME'), 'utf8'), 'ps-trainer.pdscloud.nl\n');
}));

test('site: het echte CNAME-bestand in de repo is gelijk aan het adres uit DEPLOY.md', () => {
  const adres = readFileSync(join(repo, 'CNAME'), 'utf8').trim();
  assert.equal(adres, 'ps-trainer.pdscloud.nl');
  assert.match(readFileSync(join(repo, 'DEPLOY.md'), 'utf8'), new RegExp(adres.replace(/\./g, '\\.')));
});

test('site: een bestaand pakket wordt eerst leeggemaakt', () => {
  const tmp = maakTijdelijkeRepo();
  try {
    const doel = join(tmp, '_site');
    mkdirSync(doel);
    writeFileSync(join(doel, 'oud-bestand.txt'), 'van een vorige build');
    bouwSite({ root: tmp, doel });
    assert.equal(existsSync(join(doel, 'oud-bestand.txt')), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('site: een ontbrekend toegestaan bestand of een kapotte index geeft een fout', () => {
  const tmp = maakTijdelijkeRepo();
  try {
    rmSync(join(tmp, 'CNAME'));
    assert.throws(() => bouwSite({ root: tmp, doel: join(tmp, '_site') }), /CNAME/);
    writeFileSync(join(tmp, 'CNAME'), 'x\n');
    writeFileSync(join(tmp, 'data', 'topics.json'), '{ kapot');
    assert.throws(() => bouwSite({ root: tmp, doel: join(tmp, '_site') }), /index bouwen mislukt/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('site: de doelmap is alleen _site... direct in de repo; al het andere wordt geweigerd en er wordt niets gewist', () => {
  const tmp = maakTijdelijkeRepo();
  try {
    const buiten = mkdtempSync(join(tmpdir(), 'ps-trainer-buiten-'));
    try {
      assert.throws(() => bouwSite({ root: tmp, doel: tmp }), /niet de repo zelf/);
      assert.throws(() => bouwSite({ root: tmp, doel: buiten }), /binnen de repo/);
      assert.throws(() => bouwSite({ root: tmp, doel: join(tmp, '..') }), /binnen de repo/);
      const verboden = [
        'assets', 'Assets', 'ASSETS', 'data', 'oefenen', 'tools', 'tests', 'legacy', '.git', '.github', 'node_modules', 'api', 'agent',
        'DESIGN.md', 'package.json', 'notities.txt', 'site', 'public', 'dist', 'sit_e',
        join('assets', 'uit'), join('data', 'scripts'), join('_site', 'sub'), join('assets', '_site'), join('tools', '_site')
      ];
      for (const doel of verboden) {
        assert.throws(() => bouwSite({ root: tmp, doel: join(tmp, doel) }), /direct in de repo liggen en met _site beginnen/, doel);
      }
      // Er is niets weggegooid door deze pogingen
      for (const pad of ['assets/css/app.css', 'tests/geheim.txt', '.github/geheim.txt', 'api/geheim.txt', 'agent/geheim.txt', 'DESIGN.md', 'package.json', 'notities.txt', 'data/topics.json']) {
        assert.ok(existsSync(join(tmp, pad)), `${pad} is verdwenen`);
      }
      // Toegestaan: _site en varianten die met _site beginnen (ook met andere hoofdletters)
      for (const doel of ['_site', '_Site', '_site-test', '_SITE2']) {
        assert.doesNotThrow(() => bouwSite({ root: tmp, doel: join(tmp, doel) }), doel);
      }
    } finally {
      rmSync(buiten, { recursive: true, force: true });
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('site: een symbolische link in een toegestane map laat het bouwen falen', (context) => {
  const tmp = maakTijdelijkeRepo();
  try {
    try {
      symlinkSync(join(tmp, 'tests'), join(tmp, 'assets', 'koppeling'), 'junction');
    } catch {
      context.skip('symbolische links kunnen hier niet worden gemaakt');
      return;
    }
    assert.throws(() => bouwSite({ root: tmp, doel: join(tmp, '_site') }), /symbolische link/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('site: elke pagina in de repo (map met index.html) staat in de allowlist', () => {
  const GEEN_PAGINA = new Set(['.git', '.github', 'node_modules', 'assets', 'data', 'schema', 'tests', 'tools', 'legacy', 'api', 'agent', '_site']);
  const paginamappen = readdirSync(repo).filter((naam) => !GEEN_PAGINA.has(naam) && !naam.startsWith('.') && statSync(join(repo, naam)).isDirectory() && existsSync(join(repo, naam, 'index.html')));
  assert.ok(paginamappen.length >= 2);
  for (const map of paginamappen) assert.ok(TOEGESTANE_MAPPEN.includes(map), `${map}/ ontbreekt in TOEGESTANE_MAPPEN van tools/build-site.mjs`);
  for (const map of TOEGESTANE_MAPPEN) assert.ok(existsSync(join(repo, map)), `${map}/ bestaat niet`);
});

// --- Het pakket zelf testen met de rooktest ---

const rooktest = (site) => spawnSync(process.execPath, [join(repo, 'tools', 'smoke.mjs'), site], { cwd: repo, encoding: 'utf8' });

test('site: de rooktest slaagt op het pakket, en faalt als een bestand ontbreekt waarnaar een pagina verwijst', () => metSite((site) => {
  const goed = rooktest(site);
  assert.equal(goed.status, 0, `${goed.stdout}${goed.stderr}`);
  assert.match(goed.stdout, /Rooktest geslaagd/);
  assert.match(goed.stdout, /\/assets\/img\/microsoft\/foundry\.svg/);

  rmSync(join(site, 'assets', 'js', 'data.js'));
  const stuk = rooktest(site);
  assert.equal(stuk.status, 1);
  assert.match(`${stuk.stdout}${stuk.stderr}`, /data\.js/);
}));

test('site: de rooktest weigert een map die geen gebouwde site is', () => {
  const leeg = mkdtempSync(join(tmpdir(), 'ps-trainer-leeg-'));
  try {
    const uit = rooktest(leeg);
    assert.equal(uit.status, 1);
    assert.match(`${uit.stdout}${uit.stderr}`, /index\.html ontbreekt/);
  } finally {
    rmSync(leeg, { recursive: true, force: true });
  }
});

test('site: de rooktest controleert ook topics.json, dictionary.json en elk script (meta.json en script.ps1)', () => metSite((site) => {
  for (const [bestand, patroon] of [
    ['data/topics.json', /topics\.json/],
    ['data/dictionary.json', /dictionary\.json/],
    ['data/scripts/entra-id/entra-inactieve-gebruikers/script.ps1', /script\.ps1/],
    ['data/scripts/sharepoint/sharepoint-site-inventaris/meta.json', /meta\.json/]
  ]) {
    const kopie = join(site, bestand);
    const inhoud = readFileSync(kopie);
    rmSync(kopie);
    const uit = rooktest(site);
    assert.equal(uit.status, 1, `zonder ${bestand} moet de rooktest falen`);
    assert.match(`${uit.stdout}${uit.stderr}`, patroon);
    writeFileSync(kopie, inhoud);
  }
  assert.equal(rooktest(site).status, 0);
}));
