// Tests voor tools/validate.mjs. Elke fixture is een eigen datamap in tests/fixtures/.
// Alleen ingebouwde Node-modules: node:test, node:assert en child_process.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = join(root, 'tests', 'fixtures');

// Draait validate.mjs op een map en geeft exitcode en alle uitvoer (stdout en stderr) terug.
function draai(map) {
  const r = spawnSync(process.execPath, [join(root, 'tools', 'validate.mjs'), map], { cwd: root, encoding: 'utf8' });
  return { code: r.status, uit: `${r.stdout}${r.stderr}` };
}

test('geldig voorbeeld: exitcode 0 en geen fouten', () => {
  const r = draai(join(fixtures, 'geldig'));
  assert.equal(r.code, 0, r.uit);
  assert.match(r.uit, /1 scripts, 0 fouten, 0 waarschuwingen/);
});

test('regelnummer buiten bereik: exitcode 1', () => {
  const r = draai(join(fixtures, 'regel-buiten-bereik'));
  assert.equal(r.code, 1);
  assert.match(r.uit, /regelnummer 5 ligt buiten script\.ps1 \(4 regels\)/);
});

test('antwoord-index buiten opties: exitcode 1', () => {
  const r = draai(join(fixtures, 'antwoord-buiten-opties'));
  assert.equal(r.code, 1);
  assert.match(r.uit, /answer 4 is geen geldige index in options/);
});

test('gecontroleerd zonder date: exitcode 1', () => {
  const r = draai(join(fixtures, 'zonder-datum'));
  assert.equal(r.code, 1);
  assert.match(r.uit, /required property 'date'/);
});

test('CRLF met regeleinde aan het slot: nog steeds 4 regels, dus geldig', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ps-trainer-'));
  try {
    cpSync(join(fixtures, 'geldig'), tmp, { recursive: true });
    const ps = join(tmp, 'entra-id', 'entra-voorbeeld', 'script.ps1');
    writeFileSync(ps, readFileSync(ps, 'utf8').replace(/\n/g, '\r\n'));
    const r = draai(tmp);
    assert.equal(r.code, 0, r.uit);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('geen scripts gevonden: waarschuwing en exitcode 0', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'ps-trainer-'));
  try {
    const r = draai(tmp);
    assert.equal(r.code, 0, r.uit);
    assert.match(r.uit, /geen scripts gevonden/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
