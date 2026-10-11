// Voortgang in de browser (DESIGN.md paragraaf 4.3): opslag in localStorage onder ps-trainer-v2,
// antwoorden bijhouden, voortgang per script en onderwerp, en de overname van de voortgang uit v1.
// De opslag wordt als parameter meegegeven (localStorage of een vervanger met getItem en setItem) en
// er is geen DOM nodig, zodat alles met node:test te testen is. Een pagina die voortgang bewaart moet
// eerst neemV1OverIndien() afhandelen: bestaat ps-trainer-v2 eenmaal, dan wordt v1 niet meer overgenomen.

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

// localStorage kan al bij het opvragen een fout geven (geblokkeerde opslag); dan werken we zonder (null).
export function standaardOpslag() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// --- Opslag (localStorage of een vervanger met getItem en setItem) ---
// Alle toegang zit in try/catch: zonder opslag werkt de site gewoon, alleen zonder voortgang.

// Leest de v2-voortgang; bij ontbreken of een kapotte waarde krijg je een lege v2.
export function leesState(storage) {
  try {
    const ruw = storage.getItem(V2_SLEUTEL);
    if (ruw === null || ruw === undefined) return leegV2();
    const gelezen = JSON.parse(ruw);
    if (gelezen === null || typeof gelezen !== 'object' || gelezen.version !== 2) return leegV2();
    // Elk onderdeel moet het juiste type hebben (een halve schrijfactie of handwerk kan er iets anders van maken).
    const object = (w) => (w !== null && typeof w === 'object' && !Array.isArray(w) ? w : {});
    return {
      ...leegV2(),
      ...gelezen,
      answers: object(gelezen.answers),
      open: object(gelezen.open),
      retry: object(gelezen.retry),
      cards: object(gelezen.cards),
      exams: Array.isArray(gelezen.exams) ? gelezen.exams : []
    };
  } catch {
    return leegV2();
  }
}

// Bewaart de v2-voortgang. Geeft false terug als opslaan niet lukt.
export function bewaarState(storage, state) {
  try {
    storage.setItem(V2_SLEUTEL, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

// Leest de oude v1-voortgang (of null als die er niet is of kapot is).
export function leesV1(storage) {
  try {
    const ruw = storage.getItem(V1_SLEUTEL);
    if (ruw === null || ruw === undefined) return null;
    const gelezen = JSON.parse(ruw);
    return gelezen !== null && typeof gelezen === 'object' ? gelezen : null;
  } catch {
    return null;
  }
}

// --- Antwoorden bijhouden (geven een nieuwe state terug; de invoer blijft ongewijzigd) ---

// Alleen het eerste antwoord telt voor "goed bij eerste poging": een bestaand antwoord blijft staan.
export function registreerAntwoord(state, scriptId, vraagId, first, correct, nu = new Date().toISOString()) {
  const sleutel = `${scriptId}:${vraagId}`;
  if (sleutel in state.answers) return state;
  return { ...state, answers: { ...state.answers, [sleutel]: { first, correct, at: nu } } };
}

export function registreerOpenGetoond(state, scriptId, vraagId) {
  const sleutel = `${scriptId}:${vraagId}`;
  if (sleutel in state.open) return state;
  return { ...state, open: { ...state.open, [sleutel]: { shown: true } } };
}

// Verwijdert alle voortgang van een script ("opnieuw").
export function wisScript(state, scriptId) {
  const zonder = (object) => Object.fromEntries(Object.entries(object).filter(([sleutel]) => !sleutel.startsWith(`${scriptId}:`)));
  return { ...state, answers: zonder(state.answers), open: zonder(state.open), retry: zonder(state.retry) };
}

// Voortgang van een script uit de index: totaal = meerkeuze + zoek-de-fout (open vragen tellen niet mee).
export function voortgangScript(state, script) {
  const voorvoegsel = `${script.id}:`;
  const antwoorden = Object.entries(state.answers).filter(([sleutel]) => sleutel.startsWith(voorvoegsel));
  const totaal = script.counts.mc + script.counts.bug;
  // Begrensd op het totaal: verdwijnt een vraag later uit het script, dan komt de voortgang nooit boven 100%.
  return {
    beantwoord: Math.min(antwoorden.length, totaal),
    goed: Math.min(antwoorden.filter(([, a]) => a.correct).length, totaal),
    totaal
  };
}

// Voortgang van een onderwerp: som over de scripts van dat onderwerp.
export function voortgangOnderwerp(state, scripts, topicId) {
  return scripts
    .filter((s) => s.topic === topicId)
    .map((s) => voortgangScript(state, s))
    .reduce((som, v) => ({ beantwoord: som.beantwoord + v.beantwoord, goed: som.goed + v.goed, totaal: som.totaal + v.totaal }),
      { beantwoord: 0, goed: 0, totaal: 0 });
}

// --- Overname van v1 bij het eerste bezoek ---

// Alleen als er v1-voortgang is en v2 nog niet bestaat. Zo wordt de overname maar een keer gedaan; mislukt
// het ophalen, dan wordt er niets bewaard en probeert de pagina het de volgende keer opnieuw.
export function moetV1Overnemen(storage) {
  try {
    return storage.getItem(V2_SLEUTEL) === null && leesV1(storage) !== null;
  } catch {
    return false;
  }
}

// index: data/index.json; laadMeta(entry) geeft het meta.json van een script. Alleen scripts met een legacyId
// worden opgehaald (nu de 4 uit v1; dat aantal groeit nooit). Geeft het resultaat van migreerV1 terug, of null.
export async function neemV1OverIndien(storage, index, laadMeta) {
  if (!moetV1Overnemen(storage)) return null;
  const legacyScripts = index.scripts.filter((s) => s.legacyId);
  const legacyMap = Object.fromEntries(legacyScripts.map((s) => [s.legacyId, s.id]));
  const vragen = {};
  for (const entry of legacyScripts) {
    const meta = await laadMeta(entry);
    vragen[entry.id] = meta.questions.map((v) => ({ type: v.type, answer: v.answer, aantalOpties: v.options?.length }));
  }
  const resultaat = migreerV1(leesV1(storage), null, legacyMap, vragen);
  return bewaarState(storage, resultaat.state) ? resultaat : null;
}

// Gedeeld door de startpagina en de werkbank: eerst de v1-overname afhandelen (alleen bij het eerste
// bezoek), pas daarna de voortgang lezen. Een pagina die voortgang bewaart moet dit eerst afwachten;
// anders bestaat ps-trainer-v2 al en wordt v1 nooit meer overgenomen. Een fout bij de overname
// (bijvoorbeeld een mislukte fetch) blokkeert de pagina niet; meld(fout) mag hem loggen.
export async function laadVoortgang(opslag, index, laadMetaFn, meld = () => {}) {
  try {
    await neemV1OverIndien(opslag, index, laadMetaFn);
  } catch (fout) {
    meld(fout);
  }
  return leesState(opslag);
}
