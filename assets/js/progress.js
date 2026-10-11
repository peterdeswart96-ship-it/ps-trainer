// Voortgang in de browser (DESIGN.md paragraaf 4.3).
// Dit bestand bevat voorlopig alleen de overname van de voortgang uit v1; de rest van de
// voortgangslogica komt in feature/startpagina-en-werkbank. De functies hier zijn zuiver
// (geen localStorage, geen DOM), zodat ze met node:test te testen zijn.

export const V1_SLEUTEL = 'ps-leestrainer-v1';
export const V2_SLEUTEL = 'ps-trainer-v2';

// v1 bewaarde geen tijd bij een antwoord. Deze bewust oude waarde betekent "onbekend": bij het
// samenvoegen van voortgang ("nieuwste wint", release 2.3) wint elk echt antwoord hiervan.
export const ONBEKENDE_TIJD = '1970-01-01T00:00:00Z';

export function leegV2() {
  return { version: 2, answers: {}, open: {}, retry: {}, exams: [], cards: {} };
}

// Zet de v1-voortgang om naar v2.
//   v1:        het geparste object onder ps-leestrainer-v1, sleutels als "graph-users:0"
//              met { first: <optie-index> } (mc en bug) of { shown: true } (open)
//   v2:        de bestaande v2-voortgang, of null/undefined als die er nog niet is
//   legacyMap: { <legacyId>: <nieuwe id> }, uit data/index.json (scripts met een legacyId)
//   vragen:    { <nieuwe id>: [ { type, answer, aantalOpties }, ... ] } in vraagvolgorde, uit de
//              meta.json van die scripts; "answer" is alleen nodig bij mc en bug, "aantalOpties"
//              (optioneel) laat een first buiten de opties afwijzen
// Regel: "<legacyId>:<index>" wordt "<id>:q<index+1>". Wat in v2 al bestaat wordt niet
// overschreven. De invoer wordt niet gewijzigd; het resultaat is { state, overgenomen, overgeslagen }.
export function migreerV1(v1, v2, legacyMap, vragen) {
  // Een deels gevulde v2 wordt aangevuld, zodat ontbrekende onderdelen geen fout geven.
  const state = { ...leegV2(), ...structuredClone(v2 ?? {}) };
  let overgenomen = 0;
  let overgeslagen = 0;

  for (const [oudeSleutel, waarde] of Object.entries(v1 ?? {})) {
    const scheiding = oudeSleutel.lastIndexOf(':');
    const id = legacyMap[oudeSleutel.slice(0, scheiding)];
    const indexTekst = oudeSleutel.slice(scheiding + 1);
    const index = /^\d+$/.test(indexTekst) ? Number(indexTekst) : -1;
    const vraag = id && index >= 0 ? vragen[id]?.[index] : undefined;
    if (!vraag || waarde === null || typeof waarde !== 'object') { overgeslagen++; continue; }

    const nieuweSleutel = `${id}:q${index + 1}`;
    if (vraag.type === 'open' && waarde.shown === true) {
      if (!(nieuweSleutel in state.open)) { state.open[nieuweSleutel] = { shown: true }; overgenomen++; }
    } else if (vraag.type !== 'open' && Number.isInteger(waarde.first) && waarde.first >= 0 &&
               (vraag.aantalOpties === undefined || waarde.first < vraag.aantalOpties)) {
      if (!(nieuweSleutel in state.answers)) {
        state.answers[nieuweSleutel] = { first: waarde.first, correct: waarde.first === vraag.answer, at: ONBEKENDE_TIJD };
        overgenomen++;
      }
    } else {
      overgeslagen++;
    }
  }
  return { state, overgenomen, overgeslagen };
}
