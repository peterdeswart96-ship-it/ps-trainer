param(
    [string]$Share = '\\fs01\afdeling'
)

$apparaatNamen = '^(con|prn|aux|nul|com\d|lpt\d)$'
$verboden = 'desktop.ini', '.lock'
$root = $Share.TrimEnd('\')

$items = Get-ChildItem -Path $Share -Recurse -ErrorAction SilentlyContinue

$problemen = foreach ($item in $items) {
    $naam = $item.Name
    $reden = $null
    if ($naam -ne $naam.Trim()) { $reden = 'spatie aan begin of eind' }
    elseif ($naam.EndsWith('.')) { $reden = 'eindigt op een punt' }
    elseif ($naam.StartsWith('~$')) { $reden = 'tijdelijk Office-bestand' }
    elseif ($naam -like '*_vti_*') { $reden = 'bevat _vti_' }
    elseif ($naam -in $verboden) { $reden = 'niet toegestane naam' }
    elseif ($item.BaseName -match $apparaatNamen) { $reden = 'gereserveerde apparaatnaam' }
    elseif ($naam -eq 'forms' -and (Split-Path $item.FullName -Parent) -eq $root) { $reden = 'forms in de hoofdmap' }
    if ($reden) {
        [pscustomobject]@{ Pad = $item.FullName; Reden = $reden }
    }
}

$problemen | Export-Csv -Path '.\ongeldige-namen.csv' -NoTypeInformation -Encoding UTF8
Write-Host "$(@($problemen).Count) items met een ongeldige naam."
