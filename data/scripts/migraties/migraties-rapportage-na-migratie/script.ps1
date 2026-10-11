param(
    [string]$Share = '\\fs01\afdeling',
    [string]$SiteUrl = 'https://contoso.sharepoint.com/sites/afdeling',
    [string]$Bibliotheek = 'Documents',
    [string]$Voorvoegsel = '/sites/afdeling/Shared Documents/',
    [string]$ClientId = '00000000-0000-0000-0000-000000000000'
)

Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

$bron = Get-ChildItem -Path $Share -Recurse -File -ErrorAction SilentlyContinue |
    ForEach-Object { $_.FullName.Substring($Share.Length).TrimStart('\').Replace('\', '/') }

$doel = Get-PnPListItem -List $Bibliotheek -PageSize 500 |
    Where-Object { $_.FileSystemObjectType -eq 'File' } |
    ForEach-Object { $_.FieldValues['FileRef'].Substring($Voorvoegsel.Length) }

$verschil = Compare-Object -ReferenceObject $bron -DifferenceObject $doel

$rapport = foreach ($regel in $verschil) {
    [pscustomobject]@{
        Pad  = $regel.InputObject
        Waar = if ($regel.SideIndicator -eq '<=') { 'Alleen op de share' } else { 'Alleen in SharePoint' }
    }
}

$rapport | Export-Csv -Path '.\verschillen.csv' -NoTypeInformation -Encoding UTF8
Write-Host "$(@($rapport).Count) verschillen."
