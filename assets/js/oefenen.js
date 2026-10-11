// De werkbank (/oefenen/?script=<id>): links het script met regelnummers, rechts de vragen die regels
// laten oplichten. Filters bovenin: het onderwerp bepaalt welke scripts je ziet, "soort vraag" welke
// vragen binnen het script. Alle tekst komt via textContent en tekstknopen; nooit HTML uit de data.
//
// De opbouw staat in losse functies met het document als parameter, en startWerkbank() krijgt alles wat het
// nodig heeft (document, venster, opslag, ophaalfuncties) mee, zodat het zonder browser te testen is.
import {
  NIVEAU_LABELS, SCRIPT_RISICO_LABELS, STAP_LABELS, TYPE_LABELS, VRAAGTYPES,
  filterScripts, kiesScript, laadIndex, laadMeta, laadScript, leesParams, regelLabel, scriptRegels, werkbankUrl
} from './data.js';
import { renderLine } from './highlight.js';
import { renderMarkdownLite } from './markdown-lite.js';
import {
  bewaarState, laadVoortgang, registreerAntwoord, registreerOpenGetoond, standaardOpslag, voortgangScript, wisScript
} from './progress.js';
import { initThema } from './theme.js';

const OPTIELETTERS = 'ABCDEF';

function el(doc, tag, klasse, tekst) {
  const e = doc.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}

// --- Code met regelnummers ---

// Bouwt de tabel met een rij per regel: nummer + gekleurde code. Geeft { tabel, rijen } terug.
export function bouwCodeTabel(code, titel, doc) {
  const tabel = el(doc, 'table', 'codetabel');
  tabel.setAttribute('aria-label', `Script: ${titel}`);
  const body = el(doc, 'tbody');
  const rijen = scriptRegels(code).map((regel, i) => {
    const rij = el(doc, 'tr');
    const nummer = el(doc, 'td', 'n', String(i + 1));
    const inhoud = el(doc, 'td');
    // Een lege regel krijgt een harde spatie, anders klapt de rij in elkaar
    if (regel === '') inhoud.textContent = ' '; else inhoud.append(renderLine(regel, doc));
    rij.append(nummer, inhoud);
    body.append(rij);
    return rij;
  });
  tabel.append(body);
  return { tabel, rijen };
}

// Laat de opgegeven regelnummers (1-gebaseerd) oplichten; alle andere regels niet.
export function markeerRegels(rijen, lines = []) {
  rijen.forEach((rij, i) => { rij.className = lines.includes(i + 1) ? 'hl' : ''; });
}

// --- Vragen ---

// Pure hulpfuncties
export function optieLetter(index) {
  return OPTIELETTERS[index] ?? String(index + 1);
}

export function scoreTekst({ beantwoord, goed, totaal }) {
  return `${goed} goed bij eerste poging · ${beantwoord} van ${totaal} beantwoord`;
}

// Bouwt een vraagkaart. ctx:
//   doc, scriptId, nummer (volgorde in het script), totaal (aantal vragen), leesState() (de huidige v2-voortgang),
//   acties: { antwoord(vraag, optieIndex), toonOpen(vraag), markeer(kaart, lines), vorige(), volgende() }
// De kaart bouwt zichzelf opnieuw op na een antwoord; een open vraag behoudt wat je al typde.
export function bouwVraagKaart(vraag, ctx) {
  const { doc, scriptId, nummer, acties } = ctx;
  const kaart = el(doc, 'article', 'q');
  kaart.id = `vraag-${vraag.id}`;
  kaart.setAttribute('data-type', vraag.type); // voor het filter "soort vraag"
  const sleutel = `${scriptId}:${vraag.id}`;

  // Na een antwoord (of "Toon voorbeeldantwoord") verdwijnt de knop waarop je klikte. De focus gaat dan naar de
  // uitleg, zodat een toetsenbord- of schermlezergebruiker niet bovenaan de pagina terechtkomt en de uitslag hoort.
  let uitlegElement = null;
  const focusUitleg = () => {
    if (!uitlegElement) return;
    uitlegElement.setAttribute('tabindex', '-1');
    uitlegElement.focus?.();
  };

  const activeer = () => acties.markeer(kaart, vraag.lines ?? []);
  kaart.addEventListener('mouseenter', activeer);
  kaart.addEventListener('focusin', activeer);
  kaart.addEventListener('click', activeer);

  const kop = () => {
    const top = el(doc, 'div', 'qtop');
    top.append(el(doc, 'h3', 'qnum', ctx.totaal ? `Vraag ${nummer} van ${ctx.totaal}` : `Vraag ${nummer}`));
    const rij = el(doc, 'span', 'row');
    const soort = el(doc, 'span', `kind ${vraag.type === 'mc' ? '' : vraag.type}`.trim());
    const pictogram = el(doc, 'span', `icoon ico-${vraag.type}`);
    pictogram.setAttribute('aria-hidden', 'true');
    soort.append(pictogram, TYPE_LABELS[vraag.type]);
    rij.append(soort);
    rij.append(el(doc, 'span', 'stap-label', STAP_LABELS[vraag.step]));
    const label = regelLabel(vraag.lines);
    if (label) {
      const knop = el(doc, 'button', 'lines', label);
      knop.type = 'button';
      knop.setAttribute('aria-label', `Licht ${label} op in het script`);
      knop.addEventListener('click', activeer);
      rij.append(knop);
    }
    top.append(rij);
    return top;
  };

  const vulKeuzevraag = () => {
    const antwoord = ctx.leesState().answers[sleutel];
    const opties = el(doc, 'div', 'opts');
    opties.setAttribute('role', 'group');
    opties.setAttribute('aria-label', 'Antwoordopties');
    vraag.options.forEach((tekst, j) => {
      let klasse = 'opt';
      let toelichting = '';
      if (antwoord) {
        if (j === vraag.answer) { klasse += ' right'; toelichting = ' (juiste antwoord)'; }
        else if (j === antwoord.first) { klasse += ' wrong'; toelichting = ' (jouw antwoord, onjuist)'; }
      }
      const knop = el(doc, 'button', klasse);
      knop.type = 'button';
      knop.disabled = Boolean(antwoord);
      knop.append(el(doc, 'span', 'k', optieLetter(j)), el(doc, 'span', '', tekst));
      if (toelichting) knop.append(el(doc, 'span', 'visually-hidden', toelichting));
      knop.addEventListener('click', () => {
        if (ctx.leesState().answers[sleutel]) return; // het eerste antwoord telt
        acties.antwoord(vraag, j);
        vul();
        activeer();
        focusUitleg();
      });
      opties.append(knop);
    });
    const onderdelen = [opties];
    if (antwoord) {
      const goed = antwoord.first === vraag.answer;
      const uitleg = el(doc, 'div', `expl ${goed ? 'ok' : 'no'}`);
      uitleg.append(el(doc, 'strong', '', goed ? 'Goed.' : `Niet helemaal. Het juiste antwoord is ${optieLetter(vraag.answer)}.`), renderMarkdownLite(vraag.explanation, doc));
      uitlegElement = uitleg;
      onderdelen.push(uitleg);
    }
    return onderdelen;
  };

  const vulOpenVraag = () => {
    const tekstveld = el(doc, 'textarea');
    tekstveld.setAttribute('aria-label', `Jouw antwoord op vraag ${nummer}`);
    tekstveld.setAttribute('placeholder', 'Schrijf eerst je eigen antwoord, in je eigen woorden');
    const plek = el(doc, 'div', 'open-uitleg');
    const toonUitleg = () => {
      const uitleg = el(doc, 'div', 'expl neutral');
      uitleg.append(el(doc, 'strong', '', 'Wat een sterk antwoord bevat'), renderMarkdownLite(vraag.explanation, doc));
      uitlegElement = uitleg;
      plek.replaceChildren(uitleg);
    };
    if (ctx.leesState().open[sleutel]) {
      toonUitleg();
    } else {
      const knop = el(doc, 'button', 'btn ghost', 'Toon voorbeeldantwoord');
      knop.type = 'button';
      knop.addEventListener('click', () => {
        acties.toonOpen(vraag);
        toonUitleg(); // de tekst in het tekstveld blijft staan: dat wordt niet opnieuw opgebouwd
        focusUitleg();
      });
      plek.append(knop);
    }
    return [tekstveld, plek];
  };

  // Navigatie in de vragenbox: eenmaal gebouwd en bij elke opbouw van de kaart hergebruikt. De werkbank zet
  // via kaart.navKnoppen aan of uit of er een vorige of volgende vraag is.
  const navKnop = (tekst, icoon, voorop, actie) => {
    const knop = el(doc, 'button', 'btn ghost qknop');
    knop.type = 'button';
    const pictogram = el(doc, 'span', `icoon ico-${icoon}`);
    pictogram.setAttribute('aria-hidden', 'true');
    if (voorop) knop.append(pictogram, tekst); else knop.append(tekst, pictogram);
    knop.addEventListener('click', actie);
    return knop;
  };
  const nav = el(doc, 'div', 'qnav');
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Navigatie tussen vragen');
  const vorigeKnop = navKnop('Vorige', 'vorige', true, () => acties.vorige?.());
  const volgendeKnop = navKnop('Volgende', 'volgende', false, () => acties.volgende?.());
  nav.append(vorigeKnop, volgendeKnop);
  kaart.navKnoppen = { vorige: vorigeKnop, volgende: volgendeKnop };

  // Twee vakken: links de vragenbox met nummer, vraag en navigatie, rechts de ruimte voor antwoorden en uitleg.
  function vul() {
    uitlegElement = null;
    const box = el(doc, 'div', 'qbox');
    box.append(kop(), el(doc, 'p', 'prompt', vraag.prompt), nav);
    const antwoorden = el(doc, 'div', 'qantwoord');
    antwoorden.append(...(vraag.type === 'open' ? vulOpenVraag() : vulKeuzevraag()));
    kaart.replaceChildren(box, antwoorden);
  }
  vul();
  return kaart;
}

// --- De pagina ---

// Start de werkbank. Alles wat de pagina nodig heeft komt als parameter binnen (zie de aanroep onderaan).
export async function startWerkbank({ doc, win, opslag, haalIndex, haalScript, haalMeta, meld = console.error }) {
  const onderdeel = (id) => doc.getElementById(id);
  const melding = onderdeel('melding');
  const toonMelding = (tekst) => {
    const p = el(doc, 'p', 'fout', tekst);
    p.setAttribute('role', 'alert');
    melding.replaceChildren(p);
  };

  let index;
  try {
    index = await haalIndex();
  } catch (fout) {
    meld(fout);
    toonMelding('De oefenscripts konden niet worden geladen. Probeer de pagina te vernieuwen.');
    return null;
  }
  if (index.scripts.length === 0) {
    toonMelding('Er zijn nog geen oefenscripts.');
    return null;
  }

  // Eerst de v1-overname, daarna pas de voortgang lezen en antwoorden bewaren (zie progress.js).
  let state = await laadVoortgang(opslag, index, haalMeta, meld);

  const params = leesParams(win.location.search, { topics: index.topics.map((t) => t.id) });
  const filters = { topic: params.topic, type: params.type };
  let huidig = kiesScript(index.scripts, params.script, filters);
  let geladen = null; // { entry, meta, code }
  let rijen = [];
  let kaarten = [];
  let laadteller = 0;

  const bewaar = (nieuw) => { state = nieuw; bewaarState(opslag, state); };
  const schrijfUrl = () => {
    try { win.history.replaceState(null, '', werkbankUrl(huidig.id, filters)); } catch { /* geen history: de pagina werkt gewoon door */ }
  };

  // Chips voor een filter: "Alle" plus de opties; aria-pressed laat de keuze zien.
  const filterGroep = (label, opties, gekozen, kies, klasse = 'chips') => {
    const groep = el(doc, 'div', klasse);
    groep.setAttribute('role', 'group');
    groep.setAttribute('aria-label', label);
    for (const [waarde, tekst, onderwerp, soort] of opties) {
      const knop = el(doc, 'button', 'chip filter', tekst);
      knop.type = 'button';
      // Een onderwerp- of soortknop krijgt zijn waarde mee, zodat de opmaak er een eigen pastelkleur aan kan geven
      if (onderwerp) knop.setAttribute('data-onderwerp', onderwerp);
      if (soort) knop.setAttribute('data-soort', soort);
      knop.setAttribute('aria-pressed', String(gekozen === waarde));
      knop.addEventListener('click', () => kies(waarde));
      groep.append(knop);
    }
    return groep;
  };

  const renderFilters = () => {
    const onderwerpenMetScripts = index.topics.filter((t) => index.scripts.some((s) => s.topic === t.id));
    onderdeel('filters').replaceChildren(
      filterGroep('Onderwerp', [[null, 'Alle onderwerpen'], ...onderwerpenMetScripts.map((t) => [t.id, t.name, t.id])], filters.topic, (w) => zetFilter('topic', w)),
      filterGroep('Soort vraag', [[null, 'Alle vragen'], ...VRAAGTYPES.map((t) => [t, TYPE_LABELS[t], undefined, t])], filters.type, (w) => zetFilter('type', w), 'chips rechts')
    );
  };

  // De scriptkeuze: de scripts binnen de filters, plus het huidige script als dat buiten de filters valt.
  const renderChips = () => {
    const lijst = filterScripts(index.scripts, filters);
    if (huidig && !lijst.some((s) => s.id === huidig.id)) lijst.unshift(huidig);
    const groep = el(doc, 'div', 'chips');
    groep.setAttribute('role', 'group');
    groep.setAttribute('aria-label', 'Script');
    for (const entry of lijst) {
      const v = voortgangScript(state, entry);
      const knop = el(doc, 'button', 'chip');
      knop.type = 'button';
      knop.setAttribute('aria-pressed', String(huidig && entry.id === huidig.id));
      // Dezelfde pastelkleur als de onderwerpknop van het script
      if (entry.topic) knop.setAttribute('data-onderwerp', entry.topic);
      knop.append(el(doc, 'span', '', entry.title), el(doc, 'small', '', entry.tag), el(doc, 'span', 'prog', `${v.beantwoord}/${v.totaal}`));
      knop.addEventListener('click', () => selecteer(entry.id));
      groep.append(knop);
    }
    onderdeel('scriptkeuze').replaceChildren(groep);
  };

  const renderScore = () => {
    const rij = el(doc, 'div', 'scorerij');
    if (huidig) {
      const v = voortgangScript(state, huidig);
      rij.append(el(doc, 'span', 'score', `Meerkeuze en zoek de fout: ${scoreTekst(v)}`));
      const toegelicht = Object.keys(state.open).some((k) => k.startsWith(`${huidig.id}:`));
      if (v.beantwoord > 0 || toegelicht) {
        const opnieuw = el(doc, 'button', 'lines', 'opnieuw');
        opnieuw.type = 'button';
        opnieuw.setAttribute('aria-label', 'Voortgang van dit script wissen');
        opnieuw.addEventListener('click', () => { bewaar(wisScript(state, huidig.id)); renderChips(); renderScore(); renderVragen(); });
        rij.append(opnieuw);
      }
    }
    onderdeel('score').replaceChildren(rij);
  };

  const renderKop = (meta) => {
    const kop = el(doc, 'div', 'codekop-inhoud');
    kop.append(el(doc, 'h2', '', meta.title), el(doc, 'p', 'kopregel', meta.summary));
    const labels = el(doc, 'p', 'kopregel');
    labels.append(el(doc, 'span', `risk ${meta.risk}`, SCRIPT_RISICO_LABELS[meta.risk]), ` ${NIVEAU_LABELS[meta.level]} · ${meta.tag}`);
    kop.append(labels);
    if (meta.check.status === 'gecontroleerd') {
      kop.append(el(doc, 'p', 'controle', `Gecontroleerd op ${meta.check.date} · bron: ${meta.check.source}`));
    } else {
      const w = el(doc, 'div', 'waarschuwing');
      w.setAttribute('role', 'note');
      w.append(el(doc, 'strong', '', 'Nog te controleren. '), 'De cmdlets en parameters in dit script zijn nog niet nagelopen in de documentatie of een geïnstalleerde module. Gebruik het als leesoefening, niet als voorbeeld voor productie.');
      kop.append(w);
    }
    // Bij een gecontroleerd script verdwijnen alle waarschuwingen; open punten staan dan in de bronregel (check.source).
    if (meta.note && meta.check.status !== 'gecontroleerd') kop.append(el(doc, 'p', 'waarschuwing', meta.note));
    onderdeel('codekop').replaceChildren(kop);
  };

  const markeer = (kaart, lines) => {
    markeerRegels(rijen, lines);
    for (const k of kaarten) k.className = k === kaart ? 'q active' : 'q';
  };

  // Alle kaarten worden bij het laden van een script een keer opgebouwd. Het filter "soort vraag" verbergt ze
  // alleen (hidden), zodat wat je in een open vraag typte blijft staan als je het filter wisselt.
  let legeVragen = null;

  // Er staat steeds een vraag in beeld (data-huidig); de andere kaarten blijven opgebouwd maar verborgen, zodat
  // wat je in een open vraag typte blijft staan. Vorige en volgende gaan alleen langs de vragen binnen het filter.
  let huidigeVraag = 0;
  const zichtbareIndexen = () => kaarten.map((k, i) => (k.hidden ? -1 : i)).filter((i) => i >= 0);
  const toonVraag = (i, { focus = false } = {}) => {
    huidigeVraag = i;
    const zichtbaar = zichtbareIndexen();
    const plek = zichtbaar.indexOf(i);
    kaarten.forEach((kaart, j) => {
      kaart.setAttribute('data-huidig', String(j === i));
      kaart.navKnoppen.vorige.disabled = plek <= 0;
      kaart.navKnoppen.volgende.disabled = plek < 0 || plek >= zichtbaar.length - 1;
    });
    // Het script licht de regels van de vraag in beeld op, ook als je nog niets hebt aangeklikt
    markeerRegels(rijen, geladen?.meta.questions[i]?.lines ?? []);
    if (focus && kaarten[i]) {
      kaarten[i].setAttribute('tabindex', '-1');
      kaarten[i].focus?.();
    }
  };
  const naburigeVraag = (richting) => {
    const zichtbaar = zichtbareIndexen();
    const plek = zichtbaar.indexOf(huidigeVraag) + richting;
    if (plek >= 0 && plek < zichtbaar.length) toonVraag(zichtbaar[plek], { focus: true });
  };

  const pasTypefilterToe = () => {
    if (!geladen || !legeVragen) return;
    let zichtbaar = 0;
    for (const kaart of kaarten) {
      kaart.hidden = Boolean(filters.type) && kaart.getAttribute('data-type') !== filters.type;
      if (!kaart.hidden) zichtbaar++;
    }
    legeVragen.hidden = zichtbaar > 0;
    markeer(null, []);
    if (zichtbaar > 0) toonVraag(kaarten[huidigeVraag] && !kaarten[huidigeVraag].hidden ? huidigeVraag : zichtbareIndexen()[0]);
  };

  const renderVragen = () => {
    kaarten = [];
    legeVragen = null;
    if (!geladen) { onderdeel('vragen').replaceChildren(); return; }
    const { meta, entry } = geladen;
    // De sleutel voor de voortgang is altijd het id uit de index (zoals de chips en de startpagina), niet meta.id
    const acties = {
      markeer,
      antwoord: (vraag, optie) => {
        bewaar(registreerAntwoord(state, entry.id, vraag.id, optie, optie === vraag.answer));
        renderChips(); // de voortgang op de chip en in de score meteen bijwerken
        renderScore();
      },
      toonOpen: (vraag) => bewaar(registreerOpenGetoond(state, entry.id, vraag.id)),
      vorige: () => naburigeVraag(-1),
      volgende: () => naburigeVraag(1)
    };
    huidigeVraag = 0;
    kaarten = meta.questions.map((vraag, i) => bouwVraagKaart(vraag, {
      doc, scriptId: entry.id, nummer: i + 1, totaal: meta.questions.length, leesState: () => state, acties
    }));
    legeVragen = el(doc, 'p', 'empty', 'Geen vragen van dit soort in dit script.');
    legeVragen.setAttribute('role', 'status');
    legeVragen.hidden = true;
    onderdeel('vragen').replaceChildren(...kaarten, legeVragen);
    pasTypefilterToe();
  };

  const renderLeeg = (tekst) => {
    geladen = null;
    rijen = [];
    kaarten = [];
    legeVragen = null;
    onderdeel('codekop').replaceChildren();
    onderdeel('codetabel').replaceChildren();
    if (tekst) {
      const p = el(doc, 'p', 'empty', tekst);
      p.setAttribute('role', 'status');
      onderdeel('vragen').replaceChildren(p);
    } else {
      onderdeel('vragen').replaceChildren();
    }
    renderChips();
    renderScore();
  };

  // Laadt het huidige script. Een oudere, trage aanvraag mag een nieuwere niet overschrijven.
  const laadHuidig = async () => {
    const nummer = ++laadteller;
    const vragenElement = onderdeel('vragen');
    melding.replaceChildren();
    vragenElement.setAttribute('aria-busy', 'true');
    try {
      let resultaat;
      try {
        resultaat = await haalScript(huidig);
      } catch (fout) {
        meld(fout);
        if (nummer === laadteller) { renderLeeg(''); toonMelding('Dit script kon niet worden geladen. Probeer het opnieuw of kies een ander script.'); }
        return;
      }
      if (nummer !== laadteller) return;
      try {
        geladen = { entry: huidig, ...resultaat };
        doc.title = `${resultaat.meta.title} – PowerShell Leestrainer`;
        renderKop(resultaat.meta);
        const { tabel, rijen: nieuweRijen } = bouwCodeTabel(resultaat.code, resultaat.meta.title, doc);
        rijen = nieuweRijen;
        onderdeel('codetabel').replaceChildren(tabel);
        renderChips();
        renderScore();
        renderVragen();
      } catch (fout) {
        // Bijvoorbeeld een meta.json met een ontbrekend veld: liever een melding dan een half gevulde pagina.
        meld(fout);
        renderLeeg('');
        toonMelding('Dit script kon niet worden getoond. Kies een ander script.');
      }
    } finally {
      if (nummer === laadteller) vragenElement.setAttribute('aria-busy', 'false');
    }
  };

  async function selecteer(id) {
    const entry = index.scripts.find((s) => s.id === id);
    if (!entry) return;
    // Hetzelfde script opnieuw kiezen doet niets: opnieuw laden zou wat je in open vragen typte wissen.
    if (geladen && huidig.id === id) return;
    huidig = entry;
    schrijfUrl();
    await laadHuidig();
  }

  async function zetFilter(naam, waarde) {
    filters[naam] = waarde;
    renderFilters();
    if (naam === 'type') {
      schrijfUrl();
      pasTypefilterToe();
      return;
    }
    const lijst = filterScripts(index.scripts, filters);
    schrijfUrl();
    // Een onderwerp zonder scripts is geen knop in het filter, dus een lege lijst kan hier niet voorkomen;
    // de controle voorkomt alleen een fout als dat ooit toch gebeurt. Het huidige script blijft dan staan.
    if (lijst.length === 0) { renderChips(); return; }
    melding.replaceChildren();
    if (!lijst.some((s) => s.id === huidig.id)) {
      huidig = lijst[0];
      schrijfUrl();
      await laadHuidig();
    } else {
      renderChips();
    }
  }

  renderFilters();
  renderChips();
  await laadHuidig();
  return { selecteer, zetFilter, huidigId: () => huidig.id, voortgang: () => state };
}

async function start() {
  initThema();
  try {
    await startWerkbank({
      doc: document,
      win: window,
      opslag: standaardOpslag(),
      haalIndex: () => laadIndex(),
      haalScript: (entry) => laadScript(entry),
      haalMeta: (entry) => laadMeta(entry)
    });
  } catch (fout) {
    // Een onverwachte fout mag nooit een lege pagina zonder uitleg geven.
    console.error(fout);
    const p = el(document, 'p', 'fout', 'De werkbank kon niet worden gestart. Probeer de pagina te vernieuwen.');
    p.setAttribute('role', 'alert');
    document.getElementById('melding')?.replaceChildren(p);
  }
}

if (typeof document !== 'undefined' && document.getElementById('vragen')) start();
