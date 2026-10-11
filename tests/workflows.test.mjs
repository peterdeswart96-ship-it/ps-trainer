// Tests voor de GitHub Actions-workflows. Er is geen YAML-parser zonder extra pakket, dus dit zijn gerichte
// controles op de tekst: ze bewaken de afspraken uit CLAUDE.md en DESIGN.md (vastgezette versies, minimale
// rechten, deploy alleen vanaf main, geen geheimen). De echte syntaxcontrole doet GitHub bij de eerste run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const map = join(root, '.github', 'workflows');
const lees = (naam) => readFileSync(join(map, naam), 'utf8');
const workflows = readdirSync(map).filter((n) => n.endsWith('.yml'));

// Het stuk tekst van een job: vanaf "  <naam>:" tot de volgende job of het einde
function job(tekst, naam) {
  const begin = tekst.search(new RegExp(`^  ${naam}:\\s*$`, 'm'));
  assert.ok(begin >= 0, `job ${naam} ontbreekt`);
  const rest = tekst.slice(begin + 1);
  const volgende = rest.search(/^  [a-z][\w-]*:\s*$/m);
  return volgende < 0 ? rest : rest.slice(0, volgende);
}
const volgorde = (tekst, ...stukken) => {
  const posities = stukken.map((s) => tekst.indexOf(s));
  posities.forEach((p, i) => assert.ok(p >= 0, `ontbreekt: ${stukken[i]}`));
  assert.deepEqual([...posities].sort((a, b) => a - b), posities, `verkeerde volgorde: ${stukken.join(' < ')}`);
};

test('workflows: er zijn precies Validatie en Deploy', () => {
  assert.deepEqual(workflows.sort(), ['deploy.yml', 'validate.yml']);
});

for (const naam of workflows) {
  test(`${naam}: geen tabs, even inspringing, geen losse spaties aan het eind`, () => {
    lees(naam).split('\n').forEach((regel, i) => {
      assert.ok(!regel.includes('\t'), `regel ${i + 1}: tab`);
      assert.ok(!/\s+$/.test(regel), `regel ${i + 1}: spaties aan het eind`);
      if (regel.trim()) assert.equal(regel.match(/^ */)[0].length % 2, 0, `regel ${i + 1}: oneven inspringing`);
    });
  });

  test(`${naam}: acties vastgezet op een hoofdversie, Node uit .nvmrc, runner vastgezet, timeouts, geen geheimen`, () => {
    const tekst = lees(naam);
    const acties = [...tekst.matchAll(/^\s+uses:\s*(\S+)/gm)].map((m) => m[1]);
    assert.ok(acties.length >= 2);
    for (const actie of acties) assert.match(actie, /^actions\/[a-z-]+@v\d+$/, `${actie}: gebruik een vaste hoofdversie van een officiële actie`);
    assert.match(tekst, /node-version-file:\s*\.nvmrc/);
    assert.doesNotMatch(tekst, /^\s+node-version:/m, 'nooit een los Node-versienummer');
    assert.doesNotMatch(tekst, /node-version:.*(latest|lts)/i);
    for (const runner of tekst.matchAll(/^\s+runs-on:\s*(\S+)/gm)) assert.equal(runner[1], 'ubuntu-24.04');
    const jobsTekst = tekst.split(/^jobs:\s*$/m)[1];
    const jobs = [...jobsTekst.matchAll(/^  [a-z][\w-]*:\s*$/gm)].length;
    assert.ok(jobs >= 1);
    assert.equal([...tekst.matchAll(/^\s+timeout-minutes:\s*\d+/gm)].length, jobs, 'elke job heeft een timeout');
    assert.doesNotMatch(tekst, /secrets\.|pull_request_target|\$\{\{\s*github\.event\.(pull_request|issue|comment)/, 'geen geheimen of onveilige invoer');
    assert.match(tekst, /^permissions:\s*\n\s+contents:\s*read/m, 'standaard alleen lezen');
    const bovenaan = /^permissions:[ ]*\n((?:[ ]+.*\n)+)/m.exec(tekst)[1];
    assert.doesNotMatch(bovenaan, /write/, 'geen schrijfrechten bovenaan');
  });
}

test('validate.yml: push op feature-branches en pull requests naar main, zonder deploy of schrijfrechten', () => {
  const tekst = lees('validate.yml');
  assert.match(tekst, /^name: Validatie$/m);
  assert.match(tekst, /push:\s*\n\s+branches:\s*\n\s+- 'feature\/\*\*'/);
  assert.match(tekst, /pull_request:\s*\n\s+branches:\s*\n\s+- main/);
  assert.doesNotMatch(tekst, /deploy-pages|upload-pages-artifact|pages:\s*write|id-token/);
  assert.match(tekst, /concurrency:[\s\S]*cancel-in-progress:\s*true/);
});

test('deploy.yml: alleen een push naar main (en handmatig), nooit een pull request of andere branch', () => {
  const tekst = lees('deploy.yml');
  assert.match(tekst, /^name: Deploy$/m);
  assert.match(tekst, /^on:\s*\n\s+push:\s*\n\s+branches:\s*\n\s+- main\s*\n\s+workflow_dispatch:/m);
  assert.doesNotMatch(tekst, /pull_request|schedule:|feature\/|develop/);
  assert.match(job(tekst, 'publiceren'), /if:\s*github\.ref == 'refs\/heads\/main'/, 'ook handmatig alleen vanaf main');
});

test('deploy.yml: een lopende deploy wordt nooit afgebroken en er is een deploy tegelijk', () => {
  const tekst = lees('deploy.yml');
  assert.match(tekst, /concurrency:\s*\n\s+group:\s*pages\s*\n\s+cancel-in-progress:\s*false/);
});

test('deploy.yml: alleen de publiceerjob krijgt pages: write en id-token: write, de bouwjob blijft alleen-lezen', () => {
  const tekst = lees('deploy.yml');
  const bouwen = job(tekst, 'bouwen');
  const publiceren = job(tekst, 'publiceren');
  assert.doesNotMatch(bouwen, /permissions:|pages:|id-token/);
  assert.match(publiceren, /permissions:\s*\n\s+pages:\s*write\s*\n\s+id-token:\s*write/);
  assert.doesNotMatch(publiceren, /contents:\s*write|actions:\s*write/);
  assert.match(publiceren, /needs:\s*bouwen/);
  assert.match(publiceren, /environment:\s*\n\s+name:\s*github-pages\s*\n\s+url:\s*\$\{\{\s*steps\.deployment\.outputs\.page_url\s*\}\}/);
  assert.match(publiceren, /uses:\s*actions\/deploy-pages@v\d+/);
  assert.doesNotMatch(bouwen, /deploy-pages/, 'publiceren gebeurt alleen in de publiceerjob');
});

test('deploy.yml: eerst controleren, dan het pakket bouwen, het pakket zelf testen en pas dan uploaden', () => {
  const bouwen = job(lees('deploy.yml'), 'bouwen');
  volgorde(bouwen, 'npm ci', 'npm run validate', 'npm test', 'npm run syntax', 'npm run smoke\n', 'npm run build-site', 'npm run smoke-site', 'actions/upload-pages-artifact@');
  assert.match(bouwen, /upload-pages-artifact@v\d+\s*\n\s+with:\s*\n\s+path:\s*_site/);
});

test('deploy.yml en package.json: de gebruikte npm-scripts bestaan en beginnen met check-node', () => {
  const scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;
  for (const naam of workflows) {
    for (const [, script] of lees(naam).matchAll(/^\s+run:\s*npm (?:run )?([\w-]+)/gm)) {
      if (script === 'ci') continue;
      assert.ok(scripts[script], `npm-script "${script}" bestaat niet`);
      if (script !== 'check-node') assert.match(scripts[script], /^node tools\/check-node\.mjs && /, `${script} begint niet met check-node`);
    }
  }
});

test('de workflows noemen dezelfde acties-versies als CLAUDE.md-regel: checkout en setup-node op v7', () => {
  for (const naam of workflows) {
    const tekst = lees(naam);
    assert.match(tekst, /actions\/checkout@v7/);
    assert.match(tekst, /actions\/setup-node@v7/);
  }
});
