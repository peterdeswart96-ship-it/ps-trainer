// Licht of donker thema. Standaard volgt de pagina het systeem (prefers-color-scheme in app.css);
// met de knop kiest de bezoeker zelf. De keuze staat in localStorage onder THEMA_SLEUTEL; alle toegang
// zit in try/catch (werkt de opslag niet, dan geldt de keuze alleen voor deze pagina).
//
// Tegen een flits van het verkeerde thema bij het laden zet assets/js/theme-init.js (een klassiek script
// in <head>) het opgeslagen thema al voor de eerste weergave. Deze module koppelt daarna alleen de knop.

export const THEMA_SLEUTEL = 'ps-trainer-thema';

// Alleen 'light' en 'dark' zijn geldige keuzes; al het andere geldt als "geen keuze".
export function geldigThema(waarde) {
  return waarde === 'light' || waarde === 'dark' ? waarde : null;
}

// Het thema dat nu zichtbaar is: de eigen keuze, anders het systeem.
export function effectiefThema(keuze, systeemDonker) {
  return geldigThema(keuze) ?? (systeemDonker ? 'dark' : 'light');
}

// Wat de knop bij een klik kiest: het andere thema.
export function omgekeerdThema(effectief) {
  return effectief === 'dark' ? 'light' : 'dark';
}

// localStorage kan al bij het opvragen een fout geven (geblokkeerde opslag); dan werken we zonder.
function haalOpslag() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function leesKeuze(opslag) {
  try {
    return opslag ? geldigThema(opslag.getItem(THEMA_SLEUTEL)) : null;
  } catch {
    return null;
  }
}

// Zet het opgeslagen thema op <html data-theme> en koppelt de knop met id "thema-knop" (als die er is).
// De knop heeft een vaste tekst ("Donker thema") en aria-pressed laat zien of donker aan staat.
export function initThema(doc = globalThis.document, win = globalThis.window, opslag = haalOpslag()) {
  const systeemDonker = () => {
    try {
      return win.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
    } catch {
      return false;
    }
  };
  const root = doc.documentElement;
  const keuze = leesKeuze(opslag);
  if (keuze) root.dataset.theme = keuze;

  const knop = doc.getElementById('thema-knop');
  if (!knop) return;
  const toon = () => {
    const donker = effectiefThema(root.dataset.theme, systeemDonker()) === 'dark';
    knop.setAttribute('aria-pressed', String(donker));
  };
  knop.textContent = 'Donker thema';
  knop.addEventListener('click', () => {
    const volgend = omgekeerdThema(effectiefThema(root.dataset.theme, systeemDonker()));
    root.dataset.theme = volgend;
    try { opslag?.setItem(THEMA_SLEUTEL, volgend); } catch { /* geen opslag: alleen deze pagina */ }
    toon();
  });
  // Zonder eigen keuze volgt de knop het systeem als dat wisselt.
  try { win.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', toon); } catch { /* niet beschikbaar */ }
  toon();
}
