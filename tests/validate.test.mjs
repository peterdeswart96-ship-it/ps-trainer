// Tests voor tools/validate.mjs en tools/Test-Syntax.ps1.
// Basisdata staat in tests/fixtures/; varianten worden per test in een tijdelijke map opgebouwd
// (kopie van "geldig" met een kleine wijziging), zodat de fixtures klein blijven.
// Alleen ingebouwde Node-modules: node:test, node:assert en child_process.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
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

// Maakt een tijdelijke map met een kopie van fixture "geldig", geeft die aan de test en ruimt op.
function metKopie(test) {
  const tmp = mkdtempSync(join(tmpdir(), 'ps-trainer-'));
  try {
    cpSync(join(fixtures, 'geldig'), tmp, { recursive: true });
    test(tmp, join(tmp, 'entra-id', 'entra-voorbeeld'));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// Leest meta.json van een script, laat de test het aanpassen en schrijft het terug.
function wijzigMeta(scriptMap, aanpassen) {
  const pad = join(scriptMap, 'meta.json');
  const meta = JSON.parse(readFileSync(pad, 'utf8'));
  aanpassen(meta);
  writeFileSync(pad, JSON.stringify(meta, null, 2) + '\n');
}

// Vervangt script.ps1 door de gegeven regels (altijd 4 regels aanleveren, want de vragen verwijzen daarnaar).
const schrijfScript = (scriptMap, regels) => writeFileSync(join(scriptMap, 'script.ps1'), regels.join('\n') + '\n');

// --- Fixtures ---

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

// --- Regeleinden en lege map ---

test('CRLF met regeleinde aan het slot: nog steeds 4 regels, dus geldig', () => {
  metKopie((tmp, scriptMap) => {
    const ps = join(scriptMap, 'script.ps1');
    writeFileSync(ps, readFileSync(ps, 'utf8').replace(/\n/g, '\r\n'));
    const r = draai(tmp);
    assert.equal(r.code, 0, r.uit);
  });
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

// --- Controles over scripts heen en op mapniveau ---

test('dubbele id over twee scripts: exitcode 1', () => {
  metKopie((tmp, scriptMap) => {
    const tweede = join(tmp, 'sharepoint', 'entra-voorbeeld');
    cpSync(scriptMap, tweede, { recursive: true });
    wijzigMeta(tweede, (m) => { m.topic = 'sharepoint'; });
    const r = draai(tmp);
    assert.equal(r.code, 1);
    assert.match(r.uit, /komt ook voor in/);
    assert.match(r.uit, /2 scripts, 1 fouten/);
  });
});

test('mapnaam wijkt af van id: exitcode 1', () => {
  metKopie((tmp, scriptMap) => {
    renameSync(scriptMap, join(tmp, 'entra-id', 'andere-naam'));
    const r = draai(tmp);
    assert.equal(r.code, 1);
    assert.match(r.uit, /mapnaam 'andere-naam' wijkt af van id 'entra-voorbeeld'/);
  });
});

test('bovenliggende map wijkt af van topic: exitcode 1', () => {
  metKopie((tmp) => {
    renameSync(join(tmp, 'entra-id'), join(tmp, 'sharepoint'));
    const r = draai(tmp);
    assert.equal(r.code, 1);
    assert.match(r.uit, /bovenliggende map 'sharepoint' wijkt af van topic 'entra-id'/);
  });
});

// --- Controles op vragen ---

test('mc-vraag zonder lines: exitcode 1', () => {
  metKopie((tmp, scriptMap) => {
    wijzigMeta(scriptMap, (m) => { delete m.questions[0].lines; });
    const r = draai(tmp);
    assert.equal(r.code, 1);
    assert.match(r.uit, /vraag van type 'mc' heeft geen lines/);
  });
});

test('open-vraag met options: exitcode 1', () => {
  metKopie((tmp, scriptMap) => {
    wijzigMeta(scriptMap, (m) => { m.questions[2].options = ['a', 'b']; });
    const r = draai(tmp);
    assert.equal(r.code, 1);
    assert.match(r.uit, /\/questions\/2\/options mag niet voorkomen bij dit vraagtype/);
  });
});

// --- Waarschuwingen (geen fout, dus exitcode 0) ---

test('risk read met Remove-cmdlet in de code: waarschuwing, exitcode 0', () => {
  metKopie((tmp, scriptMap) => {
    schrijfScript(scriptMap, ['Connect-MgGraph', 'Get-Date', 'Remove-Item C:\\contoso\\oud.txt', 'Get-Date']);
    const r = draai(tmp);
    assert.equal(r.code, 0, r.uit);
    assert.match(r.uit, /WAARSCHUWING.*wijzigende cmdlets: Remove-Item/);
  });
});

test('Remove-cmdlet alleen in commentaar of tussen aanhalingstekens: geen waarschuwing', () => {
  metKopie((tmp, scriptMap) => {
    schrijfScript(scriptMap, [
      '# Remove-Item hoort hier niet',
      '<# Remove-Item',
      '   ook niet #>',
      "Write-Output 'Remove-Item' \"Remove-Item\""
    ]);
    const r = draai(tmp);
    assert.equal(r.code, 0, r.uit);
    assert.match(r.uit, /0 fouten, 0 waarschuwingen/);
  });
});

test('niet-ASCII-teken in script.ps1: waarschuwing met regelnummer, exitcode 0', () => {
  metKopie((tmp, scriptMap) => {
    schrijfScript(scriptMap, ['Get-Date', '# caf\u00e9', 'Get-Date', 'Get-Date']);
    const r = draai(tmp);
    assert.equal(r.code, 0, r.uit);
    assert.match(r.uit, /WAARSCHUWING.*niet-ASCII-tekens \(eerste op regel 2\)/);
  });
});

// --- Test-Syntax.ps1 (alleen als pwsh beschikbaar is) ---

const pwshAanwezig = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0']).error === undefined;

function draaiSyntax(map) {
  const r = spawnSync('pwsh', ['-NoProfile', '-File', join(root, 'tools', 'Test-Syntax.ps1'), '-Pad', map], { cwd: root, encoding: 'utf8' });
  return { code: r.status, uit: `${r.stdout}${r.stderr}` };
}

test('Test-Syntax.ps1 op fixture "geldig": exitcode 0', { skip: !pwshAanwezig && 'pwsh niet gevonden' }, () => {
  const r = draaiSyntax(join(fixtures, 'geldig'));
  assert.equal(r.code, 0, r.uit);
  assert.match(r.uit, /1 scripts, 0 syntaxfouten/);
});

test('Test-Syntax.ps1 op script met syntaxfout: exitcode 1 en bestand:regel:kolom', { skip: !pwshAanwezig && 'pwsh niet gevonden' }, () => {
  metKopie((tmp, scriptMap) => {
    schrijfScript(scriptMap, ['Get-Date', 'if ($x {', 'Get-Date', 'Get-Date']);
    const r = draaiSyntax(tmp);
    assert.equal(r.code, 1, r.uit);
    assert.match(r.uit, /script\.ps1:2:\d+: /);
  });
});
