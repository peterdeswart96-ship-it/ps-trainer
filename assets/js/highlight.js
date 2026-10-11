// Syntaxkleuring voor PowerShell, regel voor regel (zoals in v1). Het resultaat zijn tekstknopen en
// <span>-elementen met textContent; er wordt nooit HTML uit scripttekst gemaakt.
//
// Bewust niet gedekt (zoals in v1): meerregelige here-strings en blokcommentaar <# #> (elke regel wordt
// apart bekeken), en ${naam} of $(...) in strings. Operatoren als -eq en -and krijgen de parameterkleur.

// Volgorde telt: commentaar, tekst tussen aanhalingstekens, variabelen, cmdlets (Werkwoord-Zelfstandig
// naamwoord, ook met meer hoofdletters zoals ConvertTo-Json) en parameters (-Naam). Een parameter telt
// alleen aan het begin van de regel of na witruimte; dat controleren we in tokenizeLine, zonder
// lookbehind (die ontbreekt in Safari voor versie 16.4).
const TOKENS = /(#.*$)|("[^"]*"|'[^']*')|(\$[A-Za-z_][\w:]*)|(\b[A-Z][a-z]+(?:[A-Z][a-z]+)*-[A-Za-z]\w*)|(-[A-Za-z]\w*)/g;
const SOORTEN = [null, 'com', 'str', 'var', 'cmd', 'par'];

// Splitst een regel in delen: { type: 'text' | 'com' | 'str' | 'var' | 'cmd' | 'par', text }.
export function tokenizeLine(regel) {
  const delen = [];
  let laatste = 0;
  for (const m of regel.matchAll(TOKENS)) {
    const groep = m.findIndex((waarde, i) => i > 0 && waarde !== undefined);
    // Een "-woord" midden in een woord (bijvoorbeeld "foo-bar") is geen parameter: gewone tekst.
    if (SOORTEN[groep] === 'par' && m.index > 0 && !/\s/.test(regel[m.index - 1])) continue;
    if (m.index > laatste) delen.push({ type: 'text', text: regel.slice(laatste, m.index) });
    delen.push({ type: SOORTEN[groep], text: m[0] });
    laatste = m.index + m[0].length;
  }
  if (laatste < regel.length) delen.push({ type: 'text', text: regel.slice(laatste) });
  return delen;
}

// Bouwt een DocumentFragment voor een regel. Klassen: t-com, t-str, t-var, t-cmd, t-par (zie app.css).
export function renderLine(regel, doc = globalThis.document) {
  const fragment = doc.createDocumentFragment();
  for (const deel of tokenizeLine(regel)) {
    if (deel.type === 'text') {
      fragment.append(doc.createTextNode(deel.text));
    } else {
      const span = doc.createElement('span');
      span.className = `t-${deel.type}`;
      span.textContent = deel.text;
      fragment.append(span);
    }
  }
  return fragment;
}
