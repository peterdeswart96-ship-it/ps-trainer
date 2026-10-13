// De Copilot-prompt bij een vraag (issue #72). Een zuivere functie zonder DOM: de werkbank kopieert het resultaat naar het
// klembord. De prompt bevat het hele script (met regelnummers), de vraag en de antwoordopties, en vraagt Copilot om uitleg,
// links naar Microsoft-documentatie en een controle of alles duidelijk is. Het goede antwoord en de uitleg uit meta.json
// gaan er nooit in (besluit van Peter).
import { NIVEAU_LABELS, SCRIPT_RISICO_LABELS, STAP_LABELS, regelLabel, scriptRegels } from './data.js';

// Copilot-chat accepteert een beperkt aantal tekens (voor Microsoft 365 Copilot Chat is dat ongeveer 8000). Boven deze
// grens meldt de werkbank dat de prompt lang is; hij wordt toch gekopieerd.
export const PROMPT_LENGTE_WAARSCHUWING = 8000;

const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : String(i + 1));

// Een omheining van backticks die langer is dan elke reeks backticks in de code, zodat de code er nooit uit kan breken.
function omheining(code) {
  const langste = Math.max(0, ...(code.match(/`+/g) ?? []).map((r) => r.length));
  return '`'.repeat(Math.max(3, langste + 1));
}

export function bouwCopilotPrompt({ meta, code, vraag, nummer, totaal }) {
  const regels = scriptRegels(code);
  const breedte = String(regels.length).length;
  const metNummers = regels.map((r, i) => `${String(i + 1).padStart(breedte, ' ')}  ${r}`).join('\n');
  const hek = omheining(code);
  const onderdelen = [];

  onderdelen.push(
    'Je bent een geduldige PowerShell-docent. Ik ben IT-engineer (geen developer) en leer PowerShell-scripts voor Microsoft 365 en Azure te LEZEN: begrijpen wat een script doet, wat het wijzigt en waar de valkuilen zitten. Antwoord in het Nederlands. Laat code, cmdlets, parameters en technische termen in het Engels.',
    '',
    'Ik begrijp een onderdeel van dit script niet, ook niet na de uitleg in de oefentool. Hieronder staan het script en de vraag waarop ik vastliep.'
  );

  const kenmerken = [NIVEAU_LABELS[meta.level], SCRIPT_RISICO_LABELS[meta.risk]];
  if (Array.isArray(meta.modules) && meta.modules.length > 0) kenmerken.push(`modules: ${meta.modules.join(', ')}`);
  onderdelen.push('', '## Script', `Titel: ${meta.title}`, `Kenmerken: ${kenmerken.filter(Boolean).join(' · ')}`);
  if (meta.check?.status !== 'gecontroleerd') {
    // De note uit meta.json gaat er bewust niet in: die beschrijft soms gedrag dat het antwoord op een vraag verklapt.
    onderdelen.push('Let op: de cmdlets en parameters in dit script zijn nog niet nagelopen in de documentatie of een geïnstalleerde module. Benoem uitdrukkelijk waar je zelf niet zeker van bent.');
  }
  onderdelen.push('', `${hek}powershell`, metNummers, hek);

  const label = regelLabel(vraag.lines);
  onderdelen.push('', '## De vraag waar ik op vastliep');
  onderdelen.push(`Vraag ${nummer}${totaal ? ` van ${totaal}` : ''} · leesstap: ${STAP_LABELS[vraag.step]}${label ? ` · ${label}` : ''}`);
  onderdelen.push(`Vraag: ${vraag.prompt}`);
  if (Array.isArray(vraag.options) && vraag.options.length > 0) {
    onderdelen.push('Antwoordopties:');
    vraag.options.forEach((optie, i) => onderdelen.push(`${letter(i)}. ${optie}`));
  } else {
    onderdelen.push('Dit is een open vraag, zonder antwoordopties.');
  }

  onderdelen.push(
    '',
    '## Wat ik van je wil',
    '1. Loop het HELE script door, regel voor regel of per blok, en leg uitgebreid uit wat elk onderdeel doet, wat het wijzigt en wat het teruggeeft. Leg daarbij extra uit hoe de regels van mijn vraag erin passen.',
    '2. Leg elke cmdlet, parameter en operator uit. Noem verschillen tussen Windows PowerShell 5.1 en PowerShell 7 als die er zijn.',
    '3. Laat met een klein voorbeeld zien wat de uitvoer ongeveer is.',
    '4. Noem de valkuilen, en zeg wat het script wijzigt (of dat het alleen leest).',
    '5. Geef bij elke cmdlet of elk onderwerp een link naar de officiële Microsoft-documentatie (bij voorkeur learn.microsoft.com). Geef alleen links die je zeker kent. Zeg het eerlijk als je een cmdlet, parameter of eigenschap niet zeker weet. Verzin niets. Zet de links onder de kop Documentatie als lijst met cmdlet of onderwerp en de URL.',
    '6. Voer niets uit; leg alleen uit.',
    '7. Gebruik deze opbouw: Samenvatting in twee zinnen, Uitleg per blok, Uitvoer, Valkuilen, Documentatie.',
    '8. Stel aan het eind een of twee korte controlevragen over het onderdeel waar mijn vraag over ging, een voor een, en reageer na elk antwoord. Vraag daarna of alles duidelijk is, of dat ik meer uitleg wil over een bepaald onderwerp uit het script, en wacht op mijn antwoord.'
  );

  return onderdelen.join('\n');
}
