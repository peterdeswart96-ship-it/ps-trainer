// Eenvoudige opmaak voor uitlegtekst uit JSON: alleen `code` en **vet** (CLAUDE.md, DESIGN.md par. 8).
// De tekst wordt nooit als HTML geinterpreteerd: parseMarkdownLite() levert losse delen op, en
// renderMarkdownLite() bouwt daar DOM-elementen van met textContent. Er is dus geen innerHTML nodig.

// Splitst tekst in delen: { type: 'text' | 'code' | 'bold', text }.
// Een marker zonder afsluiting (of een lege marker) blijft gewone tekst. Binnen `code` en **vet**
// wordt niets verder opgemaakt.
export function parseMarkdownLite(tekst) {
  const delen = [];
  let buffer = '';
  const leegmaken = () => {
    if (buffer) delen.push({ type: 'text', text: buffer });
    buffer = '';
  };

  let i = 0;
  while (i < tekst.length) {
    if (tekst[i] === '`') {
      const eind = tekst.indexOf('`', i + 1);
      if (eind > i + 1) {
        leegmaken();
        delen.push({ type: 'code', text: tekst.slice(i + 1, eind) });
        i = eind + 1;
        continue;
      }
    } else if (tekst.startsWith('**', i)) {
      const eind = tekst.indexOf('**', i + 2);
      if (eind > i + 2) {
        leegmaken();
        delen.push({ type: 'bold', text: tekst.slice(i + 2, eind) });
        i = eind + 2;
        continue;
      }
    }
    buffer += tekst[i];
    i++;
  }
  leegmaken();
  return delen;
}

// Bouwt een DocumentFragment met tekstknopen, <code class="i"> en <strong>.
export function renderMarkdownLite(tekst, doc = globalThis.document) {
  const fragment = doc.createDocumentFragment();
  for (const deel of parseMarkdownLite(tekst)) {
    if (deel.type === 'text') {
      fragment.append(doc.createTextNode(deel.text));
    } else {
      const element = doc.createElement(deel.type === 'code' ? 'code' : 'strong');
      if (deel.type === 'code') element.className = 'i';
      element.textContent = deel.text;
      fragment.append(element);
    }
  }
  return fragment;
}
