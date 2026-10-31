# Inhoudsregels voor scripts en vragen
- Elk oefenscript is een map `data/scripts/<onderwerp>/<id>/` met `script.ps1` en `meta.json` (zie DESIGN.md paragraaf 4).
- **Correctheid:** gebruik alleen cmdlets en parameters waarvan je zeker bent dat ze bestaan. Twijfel je, zeg het en zet `check.status` op `nog_te_controleren`. Peter heeft **geen toegang tot ShareGate Migrate**: ShareGate-scripts staan altijd op `nog_te_controleren`.
- Voorbeelden gebruiken `contoso`; nooit echte tenant-ID's, sleutels, sitenamen of klantgegevens.
- Elke vraag hoort bij één van de vijf leesstappen: `parameters`, `bron`, `bewerking`, `wijziging`, `uitvoer`.
- Houd `.ps1`-bestanden bij voorkeur ASCII (Windows PowerShell 5.1 leest UTF-8 zonder BOM als ANSI).
- Uitlegtekst in JSON gebruikt alleen `` `code` `` en `**vet**`.
