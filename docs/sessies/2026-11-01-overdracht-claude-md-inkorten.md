# Overdracht – CLAUDE.md verder ingekort (1 november 2026)

Onderwerp: `CLAUDE.md` van 5,3 naar ca. 4,2 KB, zonder informatieverlies. Vervolgt de inkortingen uit PR 91, 92 en 93. Geen scripts of sitecode gewijzigd.

## Rode draad

Peter vroeg om een voorstel vóór uitvoering en gaf daarna akkoord. Claude Code maakte een back-up, verplaatste de details naar het nieuwe `docs/werkwijze.md`, liet een subagent met schone context beoordelen (geen inhoud verloren) en verwerkte twee kleine punten. `npm test`: 225 geslaagd. Check "Validatie" groen. PR 94 is gemerged (docs-only).

| PR | Wat |
| --- | --- |
| 94 | `CLAUDE.md` 5321 naar 4208 bytes; nieuw `docs/werkwijze.md` met de volledige uitwerking |

## Wat waar staat
- `CLAUDE.md`: alle harde regels (merge-regels en verboden acties, stoppunten, Node-versie, beveiliging, afwijkingen van de standaardstack) in korte vorm.
- `docs/werkwijze.md`: volledige tekst van regel 3, 6, 8, 9, de VS Code-werkwijze, testen en deployen, en de projectachtergrond.
- Voorrang: bij tegenstrijdigheid geldt `CLAUDE.md`. De regelnummers in `werkwijze.md` verwijzen naar de nummering in `CLAUDE.md`; wijzig je die, pas dan ook `werkwijze.md` aan.
- Back-up van de oude versie: `~/.claude/backups/ps-trainer-CLAUDE.md.2026-11-01-v2.bak` (buiten de repo).

## Open
- `CLAUDE.md` zit op 4,2 KB; het doel was ±4 KB. Verder inkorten kan alleen nog door regels uit Beveiliging of Afwijkingen te verplaatsen. Dat is bewust niet gedaan.
- De memory `audit-traject` (genoemd in de kennisbank-overdracht van 1 november) is niet gelezen: hij staat niet in de ps-trainer-memory.
- Kennisbank-punten uit dezelfde overdracht, buiten dit project: branch protection op competitie en de remote branch `feature/ci-tests` opruimen.
