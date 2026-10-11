// Tests voor tools/build-index.mjs en tools/server.mjs.
// Alleen ingebouwde Node-modules. Voor build-index geven we de paden via de argumenten door
// (scriptsmap, uitvoerbestand, topicsbestand): de eenvoudigste manier om een eigen
// onderwerpenlijst of een kapot meta.json te gebruiken zonder de echte data aan te raken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../tools/server.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const geldig = join(root, 'tests', 'fixtures', 'geldig');
const echteTopics = join(root, 'data', 'topics.json');

// Maakt een tijdelijke map, geeft die aan de test en ruimt daarna op.
async function metTmp(test) {
  const tmp = mkdtempSync(join(tmpdir(), 'ps-trainer-'));
  try {
    await test(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Draait build-index.mjs en geeft exitcode, uitvoer en (indien aanwezig) de gebouwde index terug.
function bouw(scriptsMap, uitvoer, topics = echteTopics) {
  const r = spawnSync(process.execPath, [join(root, 'tools', 'build-index.mjs'), scriptsMap, uitvoer, topics], { cwd: root, encoding: 'utf8' });
  let index = null;
  if (r.status === 0) index = JSON.parse(readFileSync(uitvoer, 'utf8'));
  return { code: r.status, uit: `${r.stdout}${r.stderr}`, index };
}

// --- build-index ---

test('build-index op fixture "geldig": counts, path en status per onderwerp', () => metTmp((tmp) => {
  const r = bouw(geldig, join(tmp, 'index.json'));
  assert.equal(r.code, 0, r.uit);
  assert.equal(r.index.scripts.length, 1);
  const s = r.index.scripts[0];
  assert.deepEqual(s.counts, { mc: 1, bug: 1, open: 1 });
  assert.equal(s.path, 'data/scripts/entra-id/entra-voorbeeld');
  assert.equal(s.check.status, 'gecontroleerd');
  assert.equal('questions' in s, false, 'vragen horen niet in de index');
  assert.equal('legacyId' in s, false);
  assert.equal('note' in s, false);

  const status = Object.fromEntries(r.index.topics.map((t) => [t.id, t.status]));
  assert.deepEqual(status, { migraties: 'in-opbouw', sharepoint: 'in-opbouw', foundry: 'in-opbouw', purview: 'in-opbouw', 'entra-id': 'live' });
  assert.deepEqual(r.index.topics.map((t) => t.id), ['migraties', 'sharepoint', 'foundry', 'purview', 'entra-id']);
  assert.equal(r.index.topics.find((t) => t.id === 'entra-id').scriptCount, 1);
  assert.ok(!Number.isNaN(Date.parse(r.index.generated)));
}));

test('build-index met onbekend topic: exitcode 1', () => metTmp((tmp) => {
  const topics = join(tmp, 'topics.json');
  writeFileSync(topics, JSON.stringify([{ id: 'sharepoint', name: 'SharePoint', summary: 'x', order: 1 }]));
  const r = bouw(geldig, join(tmp, 'index.json'), topics);
  assert.equal(r.code, 1);
  assert.match(r.uit, /topic 'entra-id' staat niet in/);
}));

test('build-index met kapotte JSON in meta.json: exitcode 1', () => metTmp((tmp) => {
  cpSync(geldig, join(tmp, 'data'), { recursive: true });
  writeFileSync(join(tmp, 'data', 'entra-id', 'entra-voorbeeld', 'meta.json'), '{ kapot');
  const r = bouw(join(tmp, 'data'), join(tmp, 'index.json'));
  assert.equal(r.code, 1);
  assert.match(r.uit, /JSON is ongeldig/);
}));

test('build-index met ontbrekend meta.json: exitcode 1', () => metTmp((tmp) => {
  cpSync(geldig, join(tmp, 'data'), { recursive: true });
  rmSync(join(tmp, 'data', 'entra-id', 'entra-voorbeeld', 'meta.json'));
  const r = bouw(join(tmp, 'data'), join(tmp, 'index.json'));
  assert.equal(r.code, 1);
  assert.match(r.uit, /meta\.json: bestand ontbreekt/);
}));

// --- server ---

// Stuurt een ruw verzoek (zonder dat het pad wordt genormaliseerd, anders testen we geen traversal).
function vraag(server, methode, pad) {
  return new Promise((oplossen, afwijzen) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, method: methode, path: pad }, (res) => {
      let body = '';
      res.on('data', (deel) => { body += deel; });
      res.on('end', () => oplossen({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', afwijzen);
    req.end();
  });
}

async function metServer(serverRoot, test) {
  const server = await startServer({ root: serverRoot, port: 0 });
  try {
    await test(server);
  } finally {
    server.close();
  }
}

const scriptMap = join(geldig, 'entra-id', 'entra-voorbeeld');

test('server: pad-traversal geeft 404 (package.json bestaat wel, vijf mappen hoger)', async () => {
  // Controle vooraf: met de repo als root is package.json bereikbaar, dus een 404 hieronder komt door de beveiliging.
  await metServer(root, async (server) => {
    assert.equal((await vraag(server, 'GET', '/package.json')).status, 200);
  });
  await metServer(scriptMap, async (server) => {
    for (const pad of [
      '/../../../../../package.json',
      '/%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/package.json',
      '/..%2f..%2f..%2f..%2f..%2fpackage.json',
      '/%2E%2E/%2E%2E/%2E%2E/%2E%2E/%2E%2E/package.json'
    ]) {
      assert.equal((await vraag(server, 'GET', pad)).status, 404, pad);
    }
  });
});

test('server: .ps1 geeft text/plain, onbekend pad 404, POST 405', async () => {
  await metServer(scriptMap, async (server) => {
    const ps = await vraag(server, 'GET', '/script.ps1');
    assert.equal(ps.status, 200);
    assert.equal(ps.headers['content-type'], 'text/plain; charset=utf-8');
    assert.match(ps.body, /Connect-MgGraph/);

    assert.equal((await vraag(server, 'GET', '/bestaat-niet.html')).status, 404);

    const post = await vraag(server, 'POST', '/script.ps1');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
  });
});

test('server: map geeft index.html, HEAD geeft geen inhoud', () => metTmp(async (tmp) => {
  writeFileSync(join(tmp, 'index.html'), '<!doctype html><title>x</title>');
  await metServer(tmp, async (server) => {
    const get = await vraag(server, 'GET', '/');
    assert.equal(get.status, 200);
    assert.equal(get.headers['content-type'], 'text/html; charset=utf-8');
    assert.match(get.body, /<title>x<\/title>/);

    const head = await vraag(server, 'HEAD', '/');
    assert.equal(head.status, 200);
    assert.equal(head.body, '');
  });
}));

// --- server: dotfiles en node_modules ---

// Bouwt een tijdelijke sitemap met gevoelige bestanden, een gewoon bestand en .well-known.
function maakSite(tmp) {
  writeFileSync(join(tmp, '.env'), 'GEHEIM=1');
  mkdirSync(join(tmp, '.git'));
  writeFileSync(join(tmp, '.git', 'config'), '[core]');
  mkdirSync(join(tmp, 'node_modules', 'x'), { recursive: true });
  writeFileSync(join(tmp, 'node_modules', 'x', 'index.js'), 'export {};');
  writeFileSync(join(tmp, 'gewoon.txt'), 'gewoon');
  mkdirSync(join(tmp, '.well-known'));
  writeFileSync(join(tmp, '.well-known', 'test.txt'), 'toegestaan');
}

test('server: dotfiles en node_modules geven 404, ook als %2e-variant', () => metTmp(async (tmp) => {
  maakSite(tmp);
  await metServer(tmp, async (server) => {
    for (const pad of [
      '/.env', '/%2eenv', '/%2Eenv',
      '/.git/config', '/%2egit/config', '/.git%2fconfig', '/.git/',
      '/node_modules/x/index.js', '/%6eode_modules/x/index.js', '/Node_Modules/x/index.js',
      '/.well-known/../.env'
    ]) {
      const r = await vraag(server, 'GET', pad);
      assert.equal(r.status, 404, pad);
      assert.equal(r.body, 'Niet gevonden', pad);
    }
  });
}));

test('server: gewoon bestand in dezelfde map geeft 200 (anders test het blokkeren niets)', () => metTmp(async (tmp) => {
  maakSite(tmp);
  await metServer(tmp, async (server) => {
    const r = await vraag(server, 'GET', '/gewoon.txt');
    assert.equal(r.status, 200);
    assert.equal(r.body, 'gewoon');
  });
}));

test('server: /.well-known/ blijft toegestaan', () => metTmp(async (tmp) => {
  maakSite(tmp);
  await metServer(tmp, async (server) => {
    const r = await vraag(server, 'GET', '/.well-known/test.txt');
    assert.equal(r.status, 200);
    assert.equal(r.body, 'toegestaan');
  });
}));
