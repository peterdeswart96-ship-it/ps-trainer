param(
    [string]$Share = '\\fs01\afdeling',
    [string]$DoelPrefix = 'https://contoso.sharepoint.com/sites/afdeling/Shared Documents',
    [int]$MaxLengte = 400
)

$bestanden = Get-ChildItem -Path $Share -Recurse -File -ErrorAction SilentlyContinue

$teLang = foreach ($bestand in $bestanden) {
    $relatief = $bestand.FullName.Substring($Share.Length).Replace('\', '/')
    $doelPad = $DoelPrefix + $relatief
    if ($doelPad.Length -gt $MaxLengte) {
        [pscustomobject]@{
            Pad    = $bestand.FullName
            Lengte = $doelPad.Length
        }
    }
}

$teLang | Sort-Object Lengte -Descending | Export-Csv -Path '.\te-lange-paden.csv' -NoTypeInformation -Encoding UTF8
Write-Host "$(@($teLang).Count) bestanden boven de $MaxLengte tekens."
