// Tests voor de overname van v1-voortgang (assets/js/progress.js). De functie is zuiver, dus
// hier is geen browser of localStorage nodig.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ONBEKENDE_TIJD, leegV2, migreerV1 } from '../assets/js/progress.js';

const legacyMap = { 'graph-users': 'entra-inactieve-gebruikers', 'spo-sites': 'sharepoint-site-inventaris' };
const vragen = {
  'entra-inactieve-gebruikers': [
    { type: 'mc', answer: 1 }, { type: 'mc', answer: 1 }, { type: 'bug', answer: 1 }, { type: 'open' }
  ],
  'sharepoint-site-inventaris': [{ type: 'mc', answer: 1 }, { type: 'mc', answer: 2 }]
};

test('mc goed en fout worden overgenomen met correct en een onbekende tijd', () => {
  const v1 = { 'graph-users:0': { first: 1 }, 'graph-users:1': { first: 3 } };
  const { state, overgenomen, overgeslagen } = migreerV1(v1, null, legacyMap, vragen);
  assert.deepEqual(state.answers['entra-inactieve-gebruikers:q1'], { first: 1, correct: true, at: ONBEKENDE_TIJD });
  assert.deepEqual(state.answers['entra-inactieve-gebruikers:q2'], { first: 3, correct: false, at: ONBEKENDE_TIJD });
  assert.equal(overgenomen, 2);
  assert.equal(overgeslagen, 0);
});

test('sleutel wordt <id>:q<index+1>, ook bij een bug-vraag en een ander script', () => {
  const v1 = { 'graph-users:2': { first: 1 }, 'spo-sites:1': { first: 2 } };
  const { state } = migreerV1(v1, null, legacyMap, vragen);
  assert.equal(state.answers['entra-inactieve-gebruikers:q3'].correct, true);
  assert.equal(state.answers['sharepoint-site-inventaris:q2'].correct, true);
});

test('open vraag met shown wordt overgenomen onder open', () => {
  const { state } = migreerV1({ 'graph-users:3': { shown: true } }, null, legacyMap, vragen);
  assert.deepEqual(state.open['entra-inactieve-gebruikers:q4'], { shown: true });
  assert.deepEqual(state.answers, {});
});

test('onbekend legacyId, onbekende vraag en kapotte waarden worden overgeslagen', () => {
  const v1 = {
    'onbekend-script:0': { first: 1 },
    'graph-users:99': { first: 1 },
    'graph-users:0': null,
    'graph-users:3': { first: 1 },   // open vraag met een antwoord-index: past niet
    'geen-dubbele-punt': { first: 1 }
  };
  const { state, overgenomen, overgeslagen } = migreerV1(v1, null, legacyMap, vragen);
  assert.equal(overgenomen, 0);
  assert.equal(overgeslagen, 5);
  assert.deepEqual(state, leegV2());
});

test('bestaande v2-voortgang wordt niet overschreven en de invoer blijft ongewijzigd', () => {
  const v2 = leegV2();
  v2.answers['entra-inactieve-gebruikers:q1'] = { first: 0, correct: false, at: '2026-10-11T11:00:00Z' };
  const kopie = structuredClone(v2);
  const v1 = { 'graph-users:0': { first: 1 }, 'graph-users:1': { first: 1 } };
  const { state, overgenomen } = migreerV1(v1, v2, legacyMap, vragen);
  assert.deepEqual(state.answers['entra-inactieve-gebruikers:q1'], { first: 0, correct: false, at: '2026-10-11T11:00:00Z' });
  assert.equal(state.answers['entra-inactieve-gebruikers:q2'].first, 1);
  assert.equal(overgenomen, 1);
  assert.deepEqual(v2, kopie);
});

test('lege of ontbrekende v1-voortgang geeft een lege v2', () => {
  assert.deepEqual(migreerV1(null, null, legacyMap, vragen).state, leegV2());
  assert.deepEqual(migreerV1({}, undefined, legacyMap, vragen).state, leegV2());
});

test('sleutels met een ongeldige index worden overgeslagen', () => {
  const v1 = { 'graph-users:': { first: 1 }, 'graph-users:1.0': { first: 1 }, 'graph-users: 1': { first: 1 }, 'graph-users:1e0': { first: 1 }, 'graph-users:-1': { first: 1 } };
  const { state, overgenomen, overgeslagen } = migreerV1(v1, null, legacyMap, vragen);
  assert.equal(overgenomen, 0);
  assert.equal(overgeslagen, 5);
  assert.deepEqual(state.answers, {});
});

test('first buiten de opties wordt overgeslagen als het aantal opties bekend is', () => {
  const metOpties = { 'entra-inactieve-gebruikers': [{ type: 'mc', answer: 1, aantalOpties: 4 }] };
  const v1 = { 'graph-users:0': { first: 4 } };
  assert.equal(migreerV1(v1, null, legacyMap, metOpties).overgeslagen, 1);
  assert.equal(migreerV1({ 'graph-users:0': { first: -1 } }, null, legacyMap, metOpties).overgeslagen, 1);
  assert.equal(migreerV1({ 'graph-users:0': { first: 3 } }, null, legacyMap, metOpties).overgenomen, 1);
});

test('een deels gevulde v2 wordt aangevuld in plaats van een fout te geven', () => {
  const v1 = { 'graph-users:3': { shown: true }, 'graph-users:0': { first: 1 } };
  const { state } = migreerV1(v1, { version: 2, answers: {} }, legacyMap, vragen);
  assert.deepEqual(state.open['entra-inactieve-gebruikers:q4'], { shown: true });
  assert.equal(state.answers['entra-inactieve-gebruikers:q1'].correct, true);
  assert.deepEqual(state.cards, {});
});
