# Officiële Microsoft-iconen

Deze map bevat twee **ongewijzigde** iconen van Microsoft. Alle andere iconen in `assets/img` zijn eigen werk.

| Bestand | Product | Bron |
| --- | --- | --- |
| `foundry.svg` | Microsoft Foundry | Azure architecture icons: https://learn.microsoft.com/en-us/azure/architecture/icons/ |
| `entra-id.svg` | Microsoft Entra ID | Microsoft Entra architecture icons: https://learn.microsoft.com/en-us/entra/architecture/architecture-icons |

Gedownload op 11 oktober 2026. De exacte bronbestanden en SHA-256-controlesommen staan in `bron.json`; een test controleert dat de bestanden niet zijn aangepast.

Voor SharePoint en Purview is in de gedownloade sets (Azure, Microsoft 365, Entra) geen productpictogram aanwezig (de Microsoft 365-set bevat algemene UI-pictogrammen, geen productlogo's). Die onderwerpen gebruiken een eigen pictogram.

## Voorwaarden van Microsoft (letterlijk)

> Microsoft permits the use of these icons in architectural diagrams, training materials, or documentation. You may copy, distribute, and display the icons only for the permitted use unless granted explicit permission by Microsoft. Microsoft reserves all other rights.

Peter de Swart heeft deze voorwaarden op 11 oktober 2026 geaccepteerd, voor trainingsdoeleinden (de PowerShell Leestrainer).

## Meer uit de bijgeleverde voorwaarden en FAQ van Microsoft (letterlijk)

> Don't crop, flip, or rotate icons. Don't distort or change icon shape in any way. Don't use Microsoft product icons to represent your product or service. (Entra: Don't use Microsoft product icons in Marketing communications.)
>
> Do the icons need to be labeled? Yes, the full name of the service should always appear near the icon, but not so close that it looks like it's overlapping the icon.
>
> Can I use these icons as part of representative images for my product or service? No, Azure icons may only be used to represent the Microsoft product that it was designed for.

## Regels voor het gebruik in deze repo

- Gebruik de iconen alleen als pictogram van het product waarvoor ze zijn gemaakt (hier: de tegel van het onderwerp), als trainingsmateriaal. Nergens anders, en niet in marketing.
- **Niet wijzigen:** niet bijsnijden, spiegelen, draaien, vervormen of omkleuren. Schalen met behoud van verhouding mag. Daarom worden ze als gewone afbeelding getoond en niet met de themakleur getekend zoals de eigen iconen.
- **De volledige productnaam staat bij het icoon** (zie `OFFICIELE_ICONEN` in `assets/js/start.js`).
- **Niet gebruiken om het eigen product te vertegenwoordigen.** Daarom heeft de site een eigen `>_`-logo en wordt het (handelsmerk-)logo van PowerShell niet gebruikt.
- **Kopieën en forks van deze repo:** de voorwaarden gelden ook daar. Wie de repo kopieert, mag de iconen in deze map alleen gebruiken voor het toegestane gebruik (trainingsmateriaal, documentatie of architectuurdiagrammen) en moet ze bij een ander gebruik verwijderen.
- **Latere onderdelen:** het Foundry-icoon mag niet worden gebruikt voor de PS Coach (de eigen Foundry-agent) of voor de site zelf.
- Een nieuw Microsoft-icoon toevoegen? Download het bij de officiële bron, laat het ongewijzigd, voeg het toe aan `bron.json` en aan `OFFICIELE_ICONEN`.
