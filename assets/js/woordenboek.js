// Woordenboekpagina (/woordenboek/): zoeken in data/dictionary.json, ook via ?q=<term>.
// Alle tekst komt via textContent en tekstknopen op de pagina; er wordt nooit HTML uit de data gemaakt.
import { WOORDENBOEK_RISICO_LABELS, laadWoordenboek, leesParams, zoekWoordenboek } from './data.js';
import { renderLine } from './highlight.js';
import { initThema } from './theme.js';

export function telItems(groepen) {
  return groepen.reduce((n, g) => n + g.items.length, 0);
}

function element(doc, tag, klasse, tekst) {
  const e = doc.createElement(tag);
  if (klasse) e.className = klasse;
  if (tekst !== undefined) e.textContent = tekst;
  return e;
}

// Bouwt de groepen met items als DocumentFragment. Het label (leest / wijzigt) staat alleen bij read en write.
export function bouwWoordenboek(groepen, doc = globalThis.document) {
  const fragment = doc.createDocumentFragment();
  for (const groep of groepen) {
    const blok = element(doc, 'div', 'dgroup');
    blok.append(element(doc, 'h2', '', groep.name));
    const lijst = element(doc, 'div', 'dlist');
    for (const item of groep.items) {
      const kaart = element(doc, 'div', 'entry');
      const kop = element(doc, 'div', 'eh');
      kop.append(element(doc, 'span', 'name', item.term));
      const label = WOORDENBOEK_RISICO_LABELS[item.risk];
      if (label) kop.append(element(doc, 'span', `risk ${item.risk}`, label));
      kaart.append(kop, element(doc, 'div', '', item.explanation));
      const voorbeeld = element(doc, 'div', 'ex');
      voorbeeld.append(renderLine(item.example, doc));
      kaart.append(voorbeeld);
      lijst.append(kaart);
    }
    blok.append(lijst);
    fragment.append(blok);
  }
  return fragment;
}

// De tekst onder het zoekveld: aantal treffers of een hint.
export function aantalTekst(aantal, zoek) {
  if (aantal === 0) return 'Niets gevonden. Probeer een deel van een naam, zoals "Object" of "Graph".';
  return zoek.trim() ? `${aantal} ${aantal === 1 ? 'resultaat' : 'resultaten'}` : `${aantal} begrippen`;
}

async function start() {
  initThema();
  const doc = document;
  const zoekveld = doc.getElementById('zoek');
  const uitvoer = doc.getElementById('dict');
  const aantal = doc.getElementById('aantal');
  zoekveld.value = leesParams(location.search).q;

  let groepen;
  try {
    groepen = await laadWoordenboek();
  } catch (fout) {
    console.error(fout);
    const melding = element(doc, 'p', 'fout', 'Het woordenboek kon niet worden geladen. Probeer de pagina te vernieuwen.');
    melding.setAttribute('role', 'alert');
    uitvoer.replaceChildren(melding);
    zoekveld.disabled = true;
    return;
  }

  const toon = () => {
    const gevonden = zoekWoordenboek(groepen, zoekveld.value);
    const n = telItems(gevonden);
    // De melding (ook "Niets gevonden") staat alleen in de live-regio onder het zoekveld, zodat een schermlezer
    // hem voorleest zonder dat alle kaarten bij elke toetsaanslag worden herhaald.
    uitvoer.replaceChildren(bouwWoordenboek(gevonden, doc));
    aantal.textContent = aantalTekst(n, zoekveld.value);
  };
  zoekveld.addEventListener('input', () => {
    toon();
    // De zoekterm in de URL houden (zonder een nieuwe geschiedenisregel), zodat de PS Coach en jij ernaar kunnen linken.
    try {
      const url = new URL(location.href);
      if (zoekveld.value.trim()) url.searchParams.set('q', zoekveld.value.slice(0, 100)); else url.searchParams.delete('q');
      history.replaceState(null, '', url);
    } catch { /* geen history: de pagina werkt gewoon door */ }
  });
  toon();
}

if (typeof document !== 'undefined' && document.getElementById('dict')) start();
