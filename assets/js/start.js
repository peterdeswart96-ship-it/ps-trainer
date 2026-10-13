// Startpagina (/): de leesmethode en een kaart per hoofdonderwerp met aantal scripts, niveaus en voortgang.
// Subcategorieen (topics met een parent) hebben geen eigen kaart: hun scripts tellen mee bij het hoofdonderwerp.
// Onderwerpen zonder scripts (status "in-opbouw") staan als niet-klikbare kaart met "nog in opbouw".
// Alle tekst komt via textContent; er wordt nooit HTML uit de data gemaakt.
import { filterScripts, kiesScript, laadIndex, laadMeta, NIVEAUS, werkbankUrl } from './data.js';
import { laadVoortgang, standaardOpslag, voortgangOnderwerp } from './progress.js';
import { initThema } from './theme.js';

// Onderwerpen met een officieel Microsoft-icoon (assets/img/microsoft, zie BRON.md): de volledige productnaam staat erbij.
export const OFFICIELE_ICONEN = {
  foundry: { bestand: 'foundry.svg', naam: 'Microsoft Foundry' },
  'entra-id': { bestand: 'entra-id.svg', naam: 'Microsoft Entra ID' }
};

const meervoud = (n, enkel, meer) => `${n} ${n === 1 ? enkel : meer}`;

// "2 scripts · 1 basis, 1 gevorderd · 1 nog te controleren"
export function metaTekst(scripts) {
  const perNiveau = NIVEAUS.map((n) => [n, scripts.filter((s) => s.level === n).length]).filter(([, aantal]) => aantal > 0);
  const nogTeControleren = scripts.filter((s) => s.check?.status !== 'gecontroleerd').length;
  return [
    meervoud(scripts.length, 'script', 'scripts'),
    perNiveau.map(([n, aantal]) => `${aantal} ${n}`).join(', '),
    nogTeControleren > 0 ? `${nogTeControleren} nog te controleren` : ''
  ].filter(Boolean).join(' · ');
}

// "3 van 7 beantwoord · 2 goed bij eerste poging"; leeg als er geen vragen zijn om te beantwoorden.
export function voortgangTekst({ beantwoord, goed, totaal }) {
  if (totaal === 0) return '';
  return `${beantwoord} van ${totaal} beantwoord · ${goed} goed bij eerste poging`;
}

function element(doc, tag, klasse, tekst) {
  const e = doc.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}

// Bouwt de lijst met onderwerpkaarten. index: data/index.json; state: de v2-voortgang.
export function bouwKaarten(index, state, doc = globalThis.document) {
  const lijst = element(doc, 'ul', 'kaarten');
  lijst.setAttribute('role', 'list'); // list-style: none laat Safari/VoiceOver anders de lijstsemantiek laten vallen
  for (const onderwerp of index.topics.filter((t) => t.parent === undefined)) {
    const scripts = filterScripts(index.scripts, { topic: onderwerp.id, topics: index.topics });
    const live = onderwerp.status === 'live' && scripts.length > 0;
    const item = element(doc, 'li');
    // Een klikbare kaart opent het standaardscript van het onderwerp (laagste niveau, dan een gecontroleerd script) in de werkbank; een lege kaart is gewone tekst.
    const kaart = element(doc, live ? 'a' : 'div', live ? 'kaart' : 'kaart in-opbouw');
    if (live) kaart.setAttribute('href', werkbankUrl(kiesScript(scripts, null).id, { topic: onderwerp.id }));

    // Bij een link is de naam van de link alleen de kop; de rest is de beschrijving (anders leest een schermlezer alles voor als linknaam).
    const metId = (el, soort) => { el.id = `kaart-${onderwerp.id}-${soort}`; return el; };
    const naam = metId(element(doc, 'h3', 'kaartnaam', onderwerp.name), 'naam');
    const tekst = metId(element(doc, 'p', 'kaarttekst', onderwerp.summary), 'tekst');
    // Het pictogram van het onderwerp (ico-<id> in app.css); alleen voor een veilig id, anders geen pictogram.
    if (/^[a-z0-9-]+$/.test(onderwerp.id)) {
      if (Object.hasOwn(OFFICIELE_ICONEN, onderwerp.id)) {
        // Het officiële icoon blijft ongewijzigd (een gewone afbeelding, geen masker) met de productnaam ernaast.
        const { bestand, naam } = OFFICIELE_ICONEN[onderwerp.id];
        const afbeelding = element(doc, 'img', 'msicoon');
        afbeelding.setAttribute('src', `/assets/img/microsoft/${bestand}`);
        afbeelding.setAttribute('alt', '');
        afbeelding.setAttribute('width', '32');
        afbeelding.setAttribute('height', '32');
        // De lichte achtergrond (donker thema) zit op de wrapper; het icoon zelf krijgt geen achtergrond, rand of vorm.
        const plaat = element(doc, 'span', 'msplaat');
        plaat.append(afbeelding);
        const rij = element(doc, 'div', 'merkrij');
        rij.append(plaat, element(doc, 'span', 'productnaam', naam));
        kaart.append(rij);
      } else {
        const pictogram = element(doc, 'span', `icoon ico-${onderwerp.id}`);
        pictogram.setAttribute('aria-hidden', 'true');
        kaart.append(pictogram);
      }
      kaart.setAttribute('data-onderwerp', onderwerp.id); // de kleur van het onderwerp (app.css)
    }
    kaart.append(naam, tekst);
    const beschrijving = [tekst.id];
    if (live) {
      const meta = metId(element(doc, 'p', 'kaartmeta', metaTekst(scripts)), 'meta');
      kaart.append(meta);
      beschrijving.push(meta.id);
      const voortgang = voortgangTekst(voortgangOnderwerp(state, index.scripts, onderwerp.id, index.topics));
      if (voortgang) {
        const voortgangElement = metId(element(doc, 'p', 'kaartvoortgang', voortgang), 'voortgang');
        kaart.append(voortgangElement);
        beschrijving.push(voortgangElement.id);
      }
      kaart.setAttribute('aria-labelledby', naam.id);
      kaart.setAttribute('aria-describedby', beschrijving.join(' '));
    } else {
      kaart.append(element(doc, 'p', 'badge', 'Nog in opbouw'));
    }
    item.append(kaart);
    lijst.append(item);
  }
  return lijst;
}

// Bouwt de inhoud van de startpagina: de kaarten, of een melding als de onderwerpen niet te laden zijn.
// Volgorde: eerst de index, dan de v1-overname (laadVoortgang), dan pas de voortgang lezen en de kaarten
// bouwen. De parameters maken dit testbaar zonder browser.
export async function bouwStartInhoud({ opslag, haalIndex, haalMeta, doc, meld = console.error }) {
  const melding = (tekst) => {
    const p = element(doc, 'p', 'fout', tekst);
    p.setAttribute('role', 'alert');
    return p;
  };
  let index;
  try {
    index = await haalIndex();
  } catch (fout) {
    meld(fout);
    return melding('De onderwerpen konden niet worden geladen. Probeer de pagina te vernieuwen.');
  }
  const state = await laadVoortgang(opslag, index, haalMeta, meld);
  try {
    return bouwKaarten(index, state, doc);
  } catch (fout) {
    meld(fout);
    return melding('De onderwerpen konden niet worden getoond. Probeer de pagina te vernieuwen.');
  }
}

async function start() {
  initThema();
  const uitvoer = document.getElementById('kaarten');
  uitvoer.replaceChildren(await bouwStartInhoud({
    opslag: standaardOpslag(), haalIndex: () => laadIndex(), haalMeta: (entry) => laadMeta(entry), doc: document
  }));
}

if (typeof document !== 'undefined' && document.getElementById('kaarten')) start();
