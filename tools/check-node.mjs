// Controleert dat de Node-hoofdversie gelijk is aan .nvmrc.
// Reden: "engines" in package.json wordt door npm alleen bij installeren gecontroleerd,
// niet bij "npm run". Dit script zorgt dat een verkeerde Node-versie direct stopt.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gewenst = readFileSync(join(root, '.nvmrc'), 'utf8').trim().replace(/^v/, '');
const gewenstHoofd = gewenst.split('.')[0];
const huidigHoofd = process.versions.node.split('.')[0];

if (gewenstHoofd !== huidigHoofd) {
  console.error(`FOUT: dit project vereist Node ${gewenstHoofd}.x (zie .nvmrc), maar je draait Node ${process.versions.node}.`);
  console.error('Wissel van Node-versie (bijvoorbeeld met fnm of nvm-windows) en probeer opnieuw.');
  process.exit(1);
}

console.log(`Node-versie OK: ${process.versions.node} (vereist: ${gewenstHoofd}.x)`);
