<#
.SYNOPSIS
    Syntaxcheck van alle script.ps1-bestanden met de PowerShell-parser.
.DESCRIPTION
    Zoekt alle script.ps1 onder -Pad, parseert elk bestand en toont elke syntaxfout als
    bestand:regel:kolom met de melding. Exitcode 1 bij fouten, anders 0.
    Geen scripts gevonden: melding en exitcode 0.
    Werkt in Windows PowerShell 5.1 en in pwsh 7. Het script wordt nooit uitgevoerd, alleen gelezen.
    Let op: oefenscripts met een bewuste fout (functie 9 uit DESIGN.md) moeten syntactisch wel
    kloppen; de fout moet inhoudelijk zijn (verkeerde cmdlet, parameter of logica), geen syntaxfout.
    Dit bestand is bewust ASCII, omdat Windows PowerShell 5.1 UTF-8 zonder BOM als ANSI leest.
#>
[CmdletBinding()]
param(
    [string]$Pad
)

$ErrorActionPreference = 'Stop'

# Standaard: data/scripts in de repo. Dit staat bewust hier en niet als standaardwaarde in param():
# in Windows PowerShell 5.1 is $PSScriptRoot daar leeg.
if (-not $Pad) {
    $Pad = Join-Path (Split-Path -Parent $PSScriptRoot) 'data/scripts'
}

$bestanden = @()
if (Test-Path -LiteralPath $Pad -PathType Container) {
    $bestanden = @(Get-ChildItem -LiteralPath $Pad -Filter 'script.ps1' -Recurse -File | Sort-Object FullName)
}

if ($bestanden.Count -eq 0) {
    Write-Host "WAARSCHUWING  ${Pad}: geen scripts gevonden"
    exit 0
}

$aantalFouten = 0
foreach ($bestand in $bestanden) {
    $tokens = $null
    $fouten = $null
    # ParseFile voert niets uit; het vult alleen de lijst met syntaxfouten.
    [void][System.Management.Automation.Language.Parser]::ParseFile($bestand.FullName, [ref]$tokens, [ref]$fouten)
    foreach ($fout in $fouten) {
        Write-Host ('FOUT  {0}:{1}:{2}: {3}' -f $bestand.FullName, $fout.Extent.StartLineNumber, $fout.Extent.StartColumnNumber, $fout.Message)
        $aantalFouten++
    }
}

Write-Host "Samenvatting: $($bestanden.Count) scripts, $aantalFouten syntaxfouten"
if ($aantalFouten -gt 0) { exit 1 }
exit 0
